# Reimplementar do zero?
Bora fazer tudo de novo pra eliminar os bugs de persistência de sessão de aluno?

Skynet em 260923:

Sim. E eu mudaria principalmente **a arquitetura de autenticação e a divisão de responsabilidades**, não as funcionalidades do Fila.

Hoje vários bugs parecem vir de o React precisar coordenar ao mesmo tempo sessão do Supabase, perfil, sessão da aula, Realtime, localStorage e estados de carregamento. Se recomeçássemos, eu faria o sistema mais "burro" no frontend e colocaria mais garantias no banco.

### Arquitetura que eu usaria numa versão 2

Eu manteria **React + Vite + Supabase + Vercel + Recharts**. Não vejo necessidade de trocar a stack. O problema não é React ou Supabase; é como estamos orquestrando estado e sessão.

A principal mudança seria esta:

```text
Supabase Auth
     │
     ▼
AuthProvider único
     │
     ├── sessão
     ├── usuário autenticado
     ├── perfil
     └── estado de inicialização
             │
             ▼
        Aplicação inteira
```

O `App.jsx` não deveria tentar "descobrir" autenticação de várias formas. Teríamos **um único `AuthProvider`**, inicializado uma vez, e todo o resto consumiria `useAuth()`.

O estado seria explícito:

```js
'initializing'
'unauthenticated'
'needs_profile'
'authenticated'
'recovery'
```

Nada de inferir coisas como "se perfil é null talvez ainda esteja carregando". Esse tipo de ambiguidade é uma das maiores fontes dos locks que tivemos.

### Eu eliminaria nossos workarounds de sessão

Na reconstrução, não faria limpeza manual de token como parte normal da autenticação, nem tentaria sincronizar sessão por conta própria.

Supabase seria responsável pela sessão persistida. O frontend apenas observaria:

```js
supabase.auth.getSession()
supabase.auth.onAuthStateChange(...)
```

E haveria **um único listener na aplicação inteira**.

Login também teria uma regra simples:

```text
clicou em Entrar
     ↓
signInWithPassword
     ↓
Supabase devolveu sucesso?
     ↓
AuthProvider reage à nova sessão
     ↓
carrega perfil
     ↓
authenticated
```

O formulário de login não decidiria para onde o usuário vai depois. Essa responsabilidade seria do estado global de autenticação.

Isso também resolveria melhor múltiplas abas: cada aba observa a sessão do Supabase, em vez de inventarmos nossa própria sincronização.

### Perfil seria separado de autenticação

Eu manteria `fila_usuarios.id = auth.users.id`, porque essa decisão foi boa.

Mas o fluxo ficaria rigidamente:

```text
Existe sessão Auth?
   │
   ├── não → Login
   │
   └── sim
        ↓
   existe fila_usuarios?
        │
        ├── não → Completar perfil
        └── sim → Aplicação
```

E pronto.

Cadastro não cria pedaços de perfil. Login não cria perfil. `CadastroPerfil` não controla autenticação.

### Recuperação de senha seria uma rota real

Essa eu mudaria bastante.

Em vez de o `App.jsx` tentar detectar que estamos em recuperação e trocar o conteúdo da página, teríamos algo como:

```text
/login
/cadastro
/recuperar-senha
/redefinir-senha
/app
```

Eu usaria React Router.

O link do Supabase levaria especificamente para:

```text
/redefinir-senha
```

Assim, recovery deixa de ser um "modo especial" do App e vira simplesmente uma página.

Isso elimina uma boa parte da complexidade que já nos deu problema.

---

### Realtime também teria um dono só

Hoje é fácil cair naquela situação de componente montar → criar canal → desmontar → outro componente criar canal → auth mudar → canal fechar etc.

Eu faria um hook específico:

```js
useFilaRealtime(sessaoId)
```

E ele teria uma única responsabilidade:

> "Quando alguma coisa da sessão X mudar, invalide/recarregue os dados da fila."

Não colocaria regra de negócio dentro do callback do Realtime.

Algo conceitualmente assim:

```js
useEffect(() => {
  if (!sessaoId) return

  const channel = supabase
    .channel(`fila:${sessaoId}`)
    .on('postgres_changes', config, () => {
      queryClient.invalidateQueries(['fila', sessaoId])
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [sessaoId])
```

E aqui eu faria outra mudança importante: **TanStack Query**.

Ela cuidaria de cache, loading, erro, refetch e invalidação. Isso reduziria enormemente nossos `useState`, `carregar()`, `onRefresh`, `setFila`, `setLoading` espalhados.

A arquitetura ficaria:

```text
Supabase → TanStack Query → componentes
               ▲
               │
            Realtime
          invalida cache
```

Muito mais previsível.

---

### Nada importante ficaria no localStorage

LocalStorage ficaria para preferência visual, por exemplo:

```text
tempo padrão do timer
preferência de interface
```

Mas nunca para determinar:

```text
quem sou eu
qual é meu chamado
se estou autenticado
qual é meu estado real na fila
```

Essas informações sempre viriam do Supabase.

Se o aluno der F5, abrir outra aba ou trocar de computador:

```sql
SELECT chamado ativo
FROM fila_chamados
WHERE perfil_id = auth.uid()
```

e acabou.

Isso evita duas fontes de verdade.

---

### O banco teria ainda mais responsabilidade

Essa seria provavelmente a maior melhoria no backend.

Hoje temos operações que exigem várias chamadas sequenciais. Por exemplo:

```text
muda chamado
→ cria interação
→ atualiza tempo
→ limpa outra coisa
```

No Fila 2, qualquer operação que precise ser atômica viraria **função PostgreSQL/RPC**.

Exemplo:

```js
await supabase.rpc('finalizar_chamado', {
  p_chamado_id: id,
  p_resultado: 'atendido_professor'
})
```

Dentro do PostgreSQL:

```text
BEGIN

validar usuário
validar sessão
validar estado atual
calcular tempos
atualizar chamado
registrar interação

COMMIT
```

Ou tudo acontece, ou nada acontece.

A tentativa do botão **Ajudei** deixou justamente esse problema evidente: fazer três ou quatro mutações independentes pelo browser abre espaço para estados parciais.

### RLS simples e previsível

Eu também escreveria as policies **antes do frontend**.

E manteria poucas regras fundamentais:

```text
Aluno:
- lê dados públicos necessários da sessão
- lê seu próprio perfil
- lê seu próprio chamado
- cria chamado para si mesmo

Admin:
- possui operações administrativas autorizadas

RPC:
- executa operações compostas
```

Evitaria policies enormes tentando implementar regra de negócio completa.

RLS responde:

> "Você pode executar essa operação?"

RPC/regra do banco responde:

> "Essa operação faz sentido no estado atual?"

São responsabilidades diferentes.

---

### Eu evitaria views complexas para a operação ao vivo

Para Dashboard, views são ótimas.

Manteria:

```text
fila_dashboard_turmas_resumo
fila_dashboard_alunos_resumo
...
```

Mas a **fila operacional** teria uma query/RPC extremamente simples e estável.

O Dashboard não deveria conseguir quebrar a fila, login ou sessão. Seria praticamente um subsistema de leitura separado.

```text
                    ┌── Fila operacional
Auth → Perfil ──────┤
                    ├── Admin operacional
                    │
                    └── Analytics
                         └── views
```

Se uma view do dashboard quebrar amanhã, o professor continua dando aula normalmente.

---

## Eu mudaria também a estrutura do React

Em vez de um `App.jsx` enorme, faria aproximadamente:

```text
src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   └── providers.jsx
│
├── auth/
│   ├── AuthProvider.jsx
│   ├── useAuth.js
│   ├── LoginPage.jsx
│   ├── CompleteProfilePage.jsx
│   ├── ForgotPasswordPage.jsx
│   └── ResetPasswordPage.jsx
│
├── fila/
│   ├── QueueBoard.jsx
│   ├── StudentCall.jsx
│   ├── useFila.js
│   └── useFilaRealtime.js
│
├── admin/
│   ├── AdminPanel.jsx
│   └── services.js
│
├── dashboard/
│   ├── Dashboard.jsx
│   └── services.js
│
├── services/
│   └── supabase.js
│
└── styles/
```

Cada domínio fica isolado.

---

## E tem uma mudança que considero essencial: migrations

Se começássemos novamente, **nunca mais alteraríamos produção com SQL avulso sem registrar a alteração**.

Teríamos:

```text
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_rls.sql
    ├── 003_queue_functions.sql
    ├── 004_dashboard_views.sql
    └── ...
```

Desenvolvimento primeiro em um banco separado. Depois:

```text
DEV
 ↓
testes
 ↓
migration versionada
 ↓
PRODUÇÃO
```

Se uma feature como "Ajudei" desse problema:

```text
git revert
+
migration de rollback
```

Saberíamos **exatamente** o que mudou no banco.

Isso teria feito uma diferença enorme no problema que acabamos de enfrentar.

---

## E eu acrescentaria testes justamente onde estamos sofrendo

Não precisamos testar cada `<div>`.

Testaria os fluxos críticos com Playwright:

1. usuário novo → cadastro → completar perfil → app;
2. login → F5 → continua logado;
3. login → fecha aba → abre novamente → continua funcionando;
4. duas abas simultâneas;
5. logout;
6. esqueci senha → e-mail → nova senha → login;
7. aluno entra na fila → datashow recebe atualização;
8. professor chama → ambas as telas atualizam;
9. professor finaliza → chamado desaparece;
10. admin abre dashboard.

Esses dez testes provavelmente teriam capturado quase todos os bugs chatos que encontramos.

---

### O que eu **não** mudaria

Não reescreveria tudo porque "Supabase é ruim" ou "React deu problema". Continuaria com:

**React + Vite + Supabase + PostgreSQL + Realtime + Recharts + Vercel.**

As funcionalidades também permaneceriam praticamente todas.

A diferença seria:

```text
ANTES

App.jsx
 ├─ auth
 ├─ perfil
 ├─ localStorage
 ├─ recovery
 ├─ fila
 ├─ realtime
 ├─ sessões
 ├─ refresh
 └─ navegação
       😵
```

versus:

```text
FILA 2

AuthProvider ───── identidade
Router ─────────── fluxo/telas
TanStack Query ─── estado servidor
Realtime ───────── invalidação
PostgreSQL/RPC ─── regras e transações
RLS ────────────── autorização
React ──────────── interface
```

Essa é a reconstrução que eu faria. **Mesmas funcionalidades, mas com muito menos estado inventado pelo frontend e muito mais determinismo.**

E, considerando que o projeto ainda é relativamente pequeno, se você realmente estiver cogitando uma V2, **agora é um momento bem melhor para fazer isso do que depois de colocar mais cinco features em cima da arquitetura atual**.
