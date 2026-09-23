# Fila V2 --- Software Design Document (SDD)

**Status:** Proposta de implementação\
**Versão do documento:** 1.0\
**Data:** 23/09/2026\
**Projeto:** Fila\
**Tipo:** Aplicação web para gerenciamento de fila de atendimento em
sala de aula

------------------------------------------------------------------------

# 1. Visão geral

O **Fila V2** é uma reconstrução integral do sistema Fila.

A V2 não será uma migração incremental do banco atual. As tabelas,
views, policies e demais estruturas específicas da versão anterior
poderão ser removidas. O novo banco será criado do zero por migrations
versionadas.

A reconstrução tem como objetivo preservar as funcionalidades úteis já
desenvolvidas, eliminando principalmente as fragilidades observadas em:

-   autenticação;
-   persistência de sessão;
-   múltiplas abas;
-   recuperação de senha;
-   estados de carregamento;
-   sincronização Realtime;
-   duplicação de estado entre frontend, localStorage e banco;
-   operações compostas executadas em várias requisições;
-   alterações manuais e não versionadas no banco de produção.

A principal diretriz arquitetural é:

> **O banco é a fonte da verdade. O frontend representa esse estado.
> Realtime apenas informa que o estado pode ter mudado.**

------------------------------------------------------------------------

# 2. Objetivos

## 2.1 Objetivos funcionais

A V2 deve oferecer:

-   autenticação por e-mail e senha;
-   recuperação e redefinição de senha;
-   cadastro complementar de perfil;
-   papéis de aluno e administrador;
-   cadastro e gerenciamento de turmas;
-   abertura e encerramento de sessões de aula;
-   fila de atendimento por sessão;
-   abertura de chamados pelos alunos;
-   acompanhamento da fila em tempo real;
-   painel público adequado para datashow;
-   chamada de alunos pelo professor;
-   chamada fora da ordem quando necessário;
-   timer de atendimento;
-   registro do resultado de cada chamado;
-   registro de ajuda entre colegas;
-   registro de resolução autônoma;
-   cancelamento;
-   registro de aluno ausente/"ficou no vácuo";
-   dashboard administrativo;
-   métricas por turma;
-   métricas por aluno;
-   histórico necessário para análises futuras.

## 2.2 Objetivos técnicos

A V2 deve:

-   possuir autenticação previsível;
-   sobreviver a refresh da página;
-   funcionar corretamente em múltiplas abas;
-   não possuir loading infinito;
-   não depender de localStorage para estado de negócio;
-   executar operações críticas atomicamente;
-   possuir RLS simples e auditável;
-   separar operação da fila de analytics;
-   possuir banco reproduzível integralmente por migrations;
-   permitir rollback controlado;
-   possuir ambiente de desenvolvimento separado da produção;
-   possuir testes automatizados dos fluxos críticos.

------------------------------------------------------------------------

# 3. Não objetivos

A primeira versão da V2 não pretende:

-   substituir Supabase;
-   substituir React;
-   implementar chat;
-   implementar gamificação completa;
-   implementar aplicativo mobile nativo;
-   implementar notificações push;
-   implementar o fluxo experimental "Ajudei" com confirmação do colega;
-   transformar Realtime em fonte de verdade;
-   migrar dados históricos da V1, salvo decisão posterior.

O fluxo tradicional em que o dono do chamado informa que foi ajudado por
um colega será preservado.

------------------------------------------------------------------------

# 4. Stack

## Frontend

-   React
-   Vite
-   React Router
-   TanStack Query
-   JavaScript
-   CSS Vanilla
-   Recharts

## Backend

-   Supabase Auth
-   PostgreSQL
-   Supabase RPC
-   Row Level Security
-   Supabase Realtime

## Infraestrutura

-   Git
-   Vercel
-   Supabase CLI
-   migrations SQL versionadas

## Testes

-   Vitest para testes unitários quando aplicável
-   Playwright para testes E2E

------------------------------------------------------------------------

# 5. Princípios arquiteturais

## 5.1 Fonte única da verdade

Informações persistentes de negócio devem existir no PostgreSQL.

Não utilizar localStorage como fonte para:

-   usuário atual;
-   perfil;
-   chamado ativo;
-   posição na fila;
-   sessão de aula ativa;
-   estado do atendimento.

LocalStorage pode armazenar apenas preferências não críticas, por
exemplo:

-   duração preferida do timer;
-   preferência visual;
-   configurações locais do painel.

------------------------------------------------------------------------

## 5.2 Realtime não contém regra de negócio

Realtime não modifica diretamente o estado lógico da aplicação.

Quando um evento relevante ocorrer:

``` text
Evento Realtime
      ↓
invalidar query
      ↓
TanStack Query busca estado atual
      ↓
interface renderiza estado confirmado pelo banco
```

------------------------------------------------------------------------

## 5.3 Operações compostas são transações

Uma ação que exige múltiplas alterações relacionadas deve ser
implementada em PostgreSQL/RPC.

Exemplo:

``` text
finalizar chamado
+
calcular tempos
+
registrar interação
```

deve ser uma única transação.

Não executar essas etapas independentemente no navegador.

------------------------------------------------------------------------

## 5.4 Autorização no banco

O frontend pode esconder controles, mas não representa uma barreira de
segurança.

Toda autorização relevante deve ser garantida por:

-   RLS; ou
-   RPC validada pelo banco.

------------------------------------------------------------------------

## 5.5 Analytics não pode comprometer operação

Dashboard, views analíticas e gráficos são dependências secundárias.

Falha no dashboard não pode impedir:

-   login;
-   abertura de chamado;
-   funcionamento da fila;
-   operação administrativa;
-   datashow.

------------------------------------------------------------------------

# 6. Invariantes do sistema

As seguintes regras devem ser verdadeiras independentemente do frontend.

1.  Um usuário autenticado possui no máximo um perfil.

2.  Um aluno pertence a uma turma.

3.  Uma turma possui no máximo uma sessão ativa.

4.  Um aluno possui no máximo um chamado ativo.

5.  Um chamado pertence ao aluno autenticado que o criou.

6.  Um aluno só pode abrir chamado em sessão ativa da própria turma.

7.  Um chamado finalizado não pode voltar espontaneamente para estado
    ativo.

8.  Finalização do chamado e registro de resultado constituem uma
    operação atômica.

9.  O estado persistido no banco prevalece sobre estado local.

10. Realtime nunca é a fonte primária dos dados.

11. Um erro de Realtime não impede consultas normais ao sistema.

12. Um erro do dashboard não impede a operação da fila.

13. Nenhum estado de carregamento pode permanecer indefinidamente.

14. Logout remove a sessão local através da API oficial de autenticação.

15. Refresh da página não deve alterar indevidamente o estado de
    autenticação.

16. Abrir uma segunda aba não deve invalidar uma sessão válida.

17. O timer visual deriva de timestamps persistidos, não de um contador
    autoritativo mantido no navegador.

------------------------------------------------------------------------

# 7. Arquitetura geral

``` text
                         ┌──────────────────────┐
                         │    Supabase Auth     │
                         └──────────┬───────────┘
                                    │
                              AuthProvider
                                    │
                         ┌──────────▼───────────┐
                         │    React Router      │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │       TanStack Query          │
                    └───────────────┬───────────────┘
                                    │
                              Services/API
                                    │
                    ┌───────────────▼───────────────┐
                    │          Supabase             │
                    │                               │
                    │ PostgreSQL │ RPC │ RLS        │
                    └───────────────┬───────────────┘
                                    ▲
                                    │
                              Realtime events
                                    │
                         invalidam queries
```

------------------------------------------------------------------------

# 8. Estrutura proposta do frontend

``` text
src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   ├── providers.jsx
│   └── queryClient.js
│
├── auth/
│   ├── AuthProvider.jsx
│   ├── useAuth.js
│   ├── RequireAuth.jsx
│   ├── RequireAdmin.jsx
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── CompleteProfilePage.jsx
│   ├── ForgotPasswordPage.jsx
│   └── ResetPasswordPage.jsx
│
├── fila/
│   ├── QueuePage.jsx
│   ├── QueueBoard.jsx
│   ├── StudentCall.jsx
│   ├── useQueue.js
│   ├── useMyCall.js
│   └── useQueueRealtime.js
│
├── admin/
│   ├── AdminPage.jsx
│   ├── SessionControls.jsx
│   ├── AdminQueue.jsx
│   └── hooks/
│
├── dashboard/
│   ├── DashboardPage.jsx
│   ├── ClassDashboard.jsx
│   ├── charts/
│   └── hooks/
│
├── services/
│   ├── supabase.js
│   ├── auth.js
│   ├── profiles.js
│   ├── classes.js
│   ├── sessions.js
│   ├── calls.js
│   └── dashboard.js
│
├── components/
│   ├── Modal.jsx
│   ├── LoadingScreen.jsx
│   ├── ErrorState.jsx
│   └── TerminalCard.jsx
│
└── styles/
    ├── globals.css
    ├── terminal.css
    └── components.css
```

------------------------------------------------------------------------

# 9. Rotas

Rotas explícitas substituem estados implícitos dentro de `App.jsx`.

``` text
/login
/cadastro
/recuperar-senha
/redefinir-senha

/app
/app/fila
/app/meu-chamado
/app/admin
/app/dashboard
/app/dashboard/turma/:turmaId
```

## Proteção

### Públicas

-   `/login`
-   `/cadastro`
-   `/recuperar-senha`
-   `/redefinir-senha`

### Autenticadas

-   `/app/fila`
-   `/app/meu-chamado`

### Administrativas

-   `/app/admin`
-   `/app/dashboard/*`

------------------------------------------------------------------------

# 10. Autenticação

## 10.1 Responsabilidade

Somente `AuthProvider` gerencia:

-   sessão;
-   usuário Auth;
-   perfil;
-   inicialização;
-   eventos de autenticação.

Componentes não devem criar listeners próprios de Auth.

------------------------------------------------------------------------

# 11. Máquina de estados de autenticação

Estados possíveis:

``` text
initializing
unauthenticated
needs_profile
authenticated
recovery
error
```

## Inicialização

``` text
Aplicação inicia
      ↓
getSession()
      ↓
sessão existe?
 ┌────┴────┐
não       sim
 │          │
 ▼          ▼
unauth.   carregar perfil
             ↓
         perfil existe?
          ┌──┴──┐
         não    sim
          │      │
          ▼      ▼
 needs_profile authenticated
```

O sistema nunca deve representar "perfil null" simultaneamente como
"carregando" e "perfil inexistente".

------------------------------------------------------------------------

# 12. Login

Fluxo:

``` text
LoginPage
   ↓
signInWithPassword()
   ↓
Supabase cria/recupera sessão
   ↓
AuthProvider recebe alteração
   ↓
carrega perfil
   ↓
authenticated
```

`LoginPage` não decide manualmente o estado global após autenticar.

------------------------------------------------------------------------

# 13. Persistência e múltiplas abas

A sessão persistida será responsabilidade do cliente oficial do
Supabase.

Não criar:

-   tokens próprios;
-   lock próprio;
-   sincronização manual de sessão;
-   cópia de sessão em localStorage.

O sistema deve ser testado obrigatoriamente com:

-   F5;
-   fechamento e reabertura;
-   duas abas;
-   logout em outra aba;
-   sessão previamente persistida.

------------------------------------------------------------------------

# 14. Recuperação de senha

Fluxo dedicado:

``` text
/recuperar-senha
        ↓
resetPasswordForEmail()
        ↓
e-mail
        ↓
/redefinir-senha
        ↓
updateUser({ password })
        ↓
/login ou /app
```

A redefinição de senha não será tratada como um modo escondido da
aplicação principal.

------------------------------------------------------------------------

# 15. Modelo de dados

## 15.0 Convenção de nomenclatura

Todas as estruturas próprias do Fila V2 no banco devem utilizar o prefixo:

```text
filav2_
```

Exemplos:

```text
filav2_usuarios
filav2_turmas
filav2_sessoes
filav2_chamados
filav2_interacoes
filav2_dashboard_...
```

O prefixo diferencia inequivocamente a V2 das estruturas legadas `fila_` e também reduz o risco de alterações acidentais em objetos pertencentes à V1 ou a outros sistemas que compartilhem o mesmo projeto Supabase.


## 15.1 `filav2_turmas`

``` text
id
nome
apelido
ativa
created_at
```

------------------------------------------------------------------------

## 15.2 `filav2_usuarios`

``` text
id UUID PK/FK auth.users
nome_completo
matricula UNIQUE
turma_id FK filav2_turmas
papel aluno|admin
created_at
updated_at
```

`id` deve ser o mesmo UUID do usuário no Supabase Auth.

------------------------------------------------------------------------

## 15.3 `filav2_sessoes`

``` text
id
turma_id
titulo
ativa
iniciada_em
encerrada_em
criada_por
created_at
```

Constraint/índice parcial deve garantir apenas uma sessão ativa por
turma.

------------------------------------------------------------------------

## 15.4 `filav2_chamados`

``` text
id
sessao_id
perfil_id
descricao_problema
status
entrou_em
iniciado_atendimento_em
finalizado_em
tempo_espera_segundos
tempo_atendimento_segundos
created_at
updated_at
```

Status:

``` text
aguardando
em_atendimento
finalizado
cancelado
```

Índice parcial deve garantir no máximo um chamado ativo por aluno.

------------------------------------------------------------------------

## 15.5 `filav2_interacoes`

``` text
id
chamado_id
tipo_resultado
resolvido_por_usuario_id nullable
registrado_por_usuario_id
created_at
```

Tipos previstos:

``` text
atendido_professor
ajudado_colega
cancelado_pelo_aluno
desistiu
resolveu_sozinho
ficou_no_vacuo
```

------------------------------------------------------------------------

# 16. Relacionamentos

``` text
auth.users
    │
    │ 1:1
    ▼
filav2_usuarios
    │
    ├──────────────► filav2_turmas
    │
    │
    └──────────────► filav2_chamados
                          │
                          ▼
                    filav2_interacoes

filav2_turmas
    │
    ▼
filav2_sessoes
    │
    ▼
filav2_chamados
```

------------------------------------------------------------------------

# 17. Regras no banco

## Uma sessão ativa por turma

Implementar índice único parcial.

Conceitualmente:

``` sql
unique(turma_id)
where ativa = true
```

## Um chamado ativo por aluno

``` sql
unique(perfil_id)
where status in ('aguardando', 'em_atendimento')
```

Essas regras não dependem do React.

------------------------------------------------------------------------

# 18. RPCs

Operações críticas devem possuir funções dedicadas.

## `abrir_chamado`

Responsabilidades:

-   usar `auth.uid()`;
-   localizar perfil;
-   validar turma;
-   validar sessão;
-   impedir chamado ativo duplicado;
-   criar chamado.

O frontend não envia `perfil_id`.

------------------------------------------------------------------------

## `iniciar_sessao`

Admin:

-   valida papel;
-   valida turma;
-   impede sessão ativa duplicada;
-   cria sessão.

------------------------------------------------------------------------

## `encerrar_sessao`

Admin:

-   valida sessão;
-   define encerramento;
-   trata chamados pendentes conforme regra definida.

------------------------------------------------------------------------

## `chamar_proximo`

Admin:

-   encontra primeiro aguardando;
-   altera para `em_atendimento`;
-   grava `iniciado_atendimento_em`;
-   calcula espera.

------------------------------------------------------------------------

## `chamar_agora`

Admin:

-   recebe chamado específico;
-   valida estado;
-   inicia atendimento independentemente da posição.

A regra sobre eventual chamado já em atendimento deve ser explícita na
implementação.

------------------------------------------------------------------------

## `finalizar_chamado`

Recebe:

``` text
chamado_id
tipo_resultado
resolvido_por_usuario_id opcional
```

Transação:

``` text
validar autorização
      ↓
validar estado
      ↓
calcular tempos
      ↓
finalizar chamado
      ↓
criar interação
      ↓
COMMIT
```

------------------------------------------------------------------------

## `resolver_meu_chamado`

Usado pelo aluno para:

-   `resolveu_sozinho`;
-   `ajudado_colega`;
-   cancelamento quando aplicável.

A função deve usar `auth.uid()` para determinar o dono.

------------------------------------------------------------------------

# 19. RLS

As policies devem ser pequenas e documentadas.

## `filav2_usuarios`

Aluno:

-   SELECT próprio perfil;
-   UPDATE somente campos permitidos do próprio perfil, quando
    aplicável.

Admin:

-   SELECT necessário para administração e dashboard.

------------------------------------------------------------------------

## `filav2_turmas`

Usuário autenticado:

-   SELECT turmas necessárias à interface.

Admin:

-   gerenciamento quando implementado.

------------------------------------------------------------------------

## `filav2_sessoes`

Autenticado:

-   SELECT das sessões necessárias.

Alterações administrativas preferencialmente via RPC.

------------------------------------------------------------------------

## `filav2_chamados`

Aluno:

-   SELECT próprio chamado e dados explicitamente públicos necessários à
    fila.

Criação preferencialmente via `abrir_chamado`.

Admin:

-   leitura operacional.

Mudanças de estado preferencialmente via RPC.

------------------------------------------------------------------------

## `filav2_interacoes`

Aluno:

-   acesso apenas quando necessário.

Admin:

-   acesso para analytics.

Inserção preferencialmente realizada por RPC.

------------------------------------------------------------------------

# 20. Matriz de autorização

  Operação                                    Aluno                  Admin
  -------------------------------------- ---------- ----------------------
  Ler próprio perfil                            Sim                    Sim
  Ler outro perfil                         Limitado                    Sim
  Abrir próprio chamado                         Sim                    Sim
  Abrir chamado para outra pessoa               Não   Não por fluxo normal
  Ver fila da sessão                            Sim                    Sim
  Iniciar sessão                                Não                    Sim
  Encerrar sessão                               Não                    Sim
  Chamar próximo                                Não                    Sim
  Chamar aluno específico                       Não                    Sim
  Resolver próprio chamado                      Sim                    Sim
  Finalizar atendimento como professor          Não                    Sim
  Acessar dashboard                             Não                    Sim

------------------------------------------------------------------------

# 21. TanStack Query

Dados vindos do servidor devem utilizar queries.

Exemplos de query keys:

``` js
['profile', userId]
['active-session', turmaId]
['queue', sessaoId]
['my-active-call', userId]
['dashboard', 'classes']
['dashboard', 'class', turmaId]
```

Mutações invalidam apenas os dados relacionados.

Exemplo:

``` text
chamar próximo
      ↓
RPC
      ↓
invalidate ['queue', sessaoId]
```

------------------------------------------------------------------------

# 22. Realtime

## Assinatura

A fila deve assinar apenas os eventos necessários para a sessão atual.

Quando houver alteração relevante em `filav2_chamados`:

``` text
postgres_changes
       ↓
invalidateQueries(['queue', sessaoId])
```

Quando necessário:

``` text
invalidateQueries(['my-active-call'])
```

## Cleanup

Todo hook Realtime deve remover explicitamente seu channel ao desmontar.

Uma sessão/tela não deve acumular listeners.

------------------------------------------------------------------------

# 23. Estratégia de resiliência do Realtime

A aplicação deve continuar funcional mesmo se Realtime falhar.

Ações do usuário sempre fazem mutation + invalidação local.

Opcionalmente, queries operacionais podem possuir refetch periódico
lento como fallback, por exemplo 30--60 segundos, se testes mostrarem
benefício.

Realtime melhora latência; não determina consistência.

------------------------------------------------------------------------

# 24. Timer

O timer não será persistido como contador.

Persistir:

``` text
iniciado_atendimento_em
```

Frontend calcula:

``` text
agora - iniciado_atendimento_em
```

Consequências:

-   refresh não reinicia timer;
-   trocar de aba não reinicia timer;
-   outro dispositivo vê tempo coerente.

Ao finalizar, o banco calcula e persiste:

``` text
tempo_atendimento_segundos
```

------------------------------------------------------------------------

# 25. Painel público

Deve apresentar:

-   atendimento atual;
-   aluno;
-   descrição da dúvida;
-   timer;
-   fila aguardando;
-   posição dos alunos.

Características:

-   adequado para projetor;
-   cards compactos;
-   leitura à distância;
-   atualização Realtime;
-   nenhuma ação administrativa.

------------------------------------------------------------------------

# 26. Área do aluno

O aluno poderá:

-   visualizar sessão da própria turma;
-   abrir chamado;
-   visualizar chamado ativo;
-   cancelar;
-   marcar "resolvi sozinho";
-   informar colega que ajudou.

O aluno não poderá alterar diretamente:

-   status arbitrário;
-   timestamps;
-   perfil dono do chamado;
-   sessão do chamado.

------------------------------------------------------------------------

# 27. Administração

Admin poderá:

-   iniciar sessão;
-   encerrar sessão;
-   visualizar fila;
-   chamar próximo;
-   chamar aluno específico;
-   finalizar atendimento;
-   registrar "ficou no vácuo";
-   cancelar conforme regras administrativas;
-   configurar preferência local do timer.

------------------------------------------------------------------------

# 28. Dashboard

Dashboard permanece separado do domínio operacional.

## Geral

Exibir:

-   total de turmas;
-   total de alunos;
-   total de sessões;
-   total de chamados;
-   média de espera;
-   média de atendimento;
-   chamados por turma;
-   distribuição dos resultados.

## Por turma

Exibir:

-   alunos;
-   chamados;
-   sessões;
-   média de espera;
-   média de atendimento;
-   chamados por aluno;
-   ajudas por aluno;
-   resoluções autônomas;
-   tipos de fechamento;
-   tabela ordenável.

------------------------------------------------------------------------

# 29. Views analíticas

Views poderão incluir:

``` text
filav2_dashboard_turmas_resumo
filav2_dashboard_turmas_fechamentos
filav2_dashboard_alunos_chamados
filav2_dashboard_alunos_ajudas
filav2_dashboard_alunos_resumo
```

Essas views serão criadas somente após a operação principal estar
funcional.

------------------------------------------------------------------------

# 30. Estados de interface

Toda operação assíncrona deve possuir:

``` text
idle
loading
success
error
```

Nenhum botão deve depender de um `loading=true` que só seja desligado em
caminho de sucesso.

Utilizar `finally` ou estado fornecido pela biblioteca de mutations.

------------------------------------------------------------------------

# 31. Timeout

Timeout não deve ser utilizado como substituto para corrigir
concorrência ou sessão.

Pode existir apenas como mecanismo de UX/resiliência.

Quando ocorrer timeout:

-   apresentar erro;
-   permitir retry;
-   não apagar automaticamente credenciais válidas;
-   não deixar loading infinito.

------------------------------------------------------------------------

# 32. Tratamento de erros

Erros devem ser classificados quando possível:

``` text
AUTH_ERROR
NETWORK_ERROR
PERMISSION_ERROR
VALIDATION_ERROR
CONFLICT_ERROR
UNKNOWN_ERROR
```

Mensagens técnicas devem ir para console/log.

Usuário recebe mensagem compreensível.

------------------------------------------------------------------------

# 33. Ambientes

Obrigatório possuir separação:

``` text
DEV
PROD
```

Idealmente:

-   projeto Supabase DEV;
-   projeto Supabase PROD.

Nunca testar migration experimental diretamente no banco utilizado em
aula.

------------------------------------------------------------------------

# 34. Migrations

Todo schema deve ser reproduzível por arquivos versionados.

Estrutura:

``` text
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_constraints.sql
    ├── 003_rls.sql
    ├── 004_queue_rpc.sql
    ├── 005_realtime.sql
    └── 006_dashboard_views.sql
```

É proibido depender de alterações existentes apenas no SQL Editor do
Supabase.

Se uma alteração for feita manualmente durante investigação, ela deve
ser convertida em migration antes de integrar a feature.

------------------------------------------------------------------------

# 35. Seed de desenvolvimento

Criar seed opcional contendo:

-   turma de teste;
-   sessão;
-   usuários de teste quando tecnicamente apropriado;
-   chamados fictícios.

O banco de desenvolvimento deve poder ser recriado rapidamente.

------------------------------------------------------------------------

# 36. Estratégia de inicialização do banco

A V2 será inicializada com um banco vazio.

Não haverá:

- importação das tabelas da V1;
- cópia de usuários/perfis da aplicação;
- migração de turmas;
- migração de sessões;
- migração de chamados;
- migração de interações;
- preservação de métricas históricas;
- camada de compatibilidade com o schema antigo.

O schema válido do Fila V2 será exclusivamente aquele produzido pelas migrations versionadas.

O ambiente de desenvolvimento poderá utilizar **seed fictício**, exclusivamente para testes. Esse seed não representa migração de dados da V1.

Antes da entrada da V2 em produção, as estruturas antigas específicas do Fila poderão ser removidas do projeto Supabase conforme procedimento de reset definido para o deploy. Estruturas pertencentes a outros sistemas que compartilhem o mesmo projeto Supabase não devem ser alteradas.

---

# 37. Estratégia de implementação

## Fase 0 --- Fundação

-   criar branch/repositório da V2;
-   configurar Vite;
-   instalar dependências;
-   configurar Supabase DEV;
-   configurar variáveis de ambiente;
-   configurar migrations.

**Critério de saída:** aplicação vazia deployável e banco reproduzível.

------------------------------------------------------------------------

## Fase 1 --- Banco

Criar:

-   turmas;
-   usuários;
-   sessões;
-   chamados;
-   interações;
-   constraints;
-   índices.

**Critério de saída:** schema recriado integralmente a partir de zero.

------------------------------------------------------------------------

## Fase 2 --- RLS e RPC

Implementar:

-   policies;
-   `abrir_chamado`;
-   `iniciar_sessao`;
-   `encerrar_sessao`;
-   `chamar_proximo`;
-   `chamar_agora`;
-   `finalizar_chamado`;
-   `resolver_meu_chamado`.

**Critério de saída:** regras críticas testáveis sem frontend.

------------------------------------------------------------------------

## Fase 3 --- Auth

Implementar:

-   AuthProvider;
-   login;
-   cadastro;
-   completar perfil;
-   logout;
-   recovery;
-   reset;
-   rotas protegidas.

**Critério de saída:** testes de autenticação passam inclusive com
refresh e múltiplas abas.

------------------------------------------------------------------------

## Fase 4 --- Fila do aluno

Implementar:

-   sessão ativa;
-   abrir chamado;
-   meu chamado;
-   cancelar;
-   resolver sozinho;
-   ajuda por colega.

**Critério de saída:** fluxo completo funciona sem Realtime.

------------------------------------------------------------------------

## Fase 5 --- Admin

Implementar:

-   abrir/encerrar sessão;
-   fila administrativa;
-   chamar próximo;
-   chamar agora;
-   finalizar;
-   vácuo.

**Critério de saída:** aula pode ser operada sem Realtime.

------------------------------------------------------------------------

## Fase 6 --- Realtime

Adicionar invalidação automática.

**Critério de saída:** duas janelas refletem mudanças sem refresh e sem
criar listeners duplicados.

------------------------------------------------------------------------

## Fase 7 --- Datashow

Implementar painel otimizado para projetor e timer.

**Critério de saída:** atualização automática e timer consistente após
refresh.

------------------------------------------------------------------------

## Fase 8 --- Dashboard

Criar views, services, gráficos e tabelas.

**Critério de saída:** analytics funciona sem introduzir dependência na
operação principal.

------------------------------------------------------------------------

## Fase 9 --- E2E

Executar suíte crítica.

**Critério de saída:** todos os testes bloqueadores passam.

------------------------------------------------------------------------

## Fase 10 --- Produção

Somente após aprovação dos critérios anteriores:

-   criar/apagar e preparar banco PROD;
-   executar migrations;
-   configurar Auth URLs;
-   configurar Realtime;
-   configurar Vercel;
-   executar smoke tests.

------------------------------------------------------------------------

# 38. Testes E2E obrigatórios

## Auth

### E2E-01

Usuário existente faz login.

### E2E-02

Usuário faz login, pressiona F5 e permanece autenticado.

### E2E-03

Usuário logado fecha a aba e abre novamente.

### E2E-04

Usuário abre duas abas simultaneamente.

### E2E-05

Logout encerra acesso protegido.

### E2E-06

Logout em uma aba é refletido adequadamente.

### E2E-07

Usuário solicita recuperação de senha.

### E2E-08

Link de recuperação abre página correta.

### E2E-09

Usuário define nova senha e autentica.

### E2E-10

Usuário autenticado sem perfil é encaminhado para completar cadastro.

------------------------------------------------------------------------

## Fila

### E2E-11

Aluno entra na sessão da própria turma.

### E2E-12

Aluno não entra em sessão de outra turma.

### E2E-13

Aluno não abre dois chamados ativos.

### E2E-14

Professor chama próximo.

### E2E-15

Professor chama aluno específico.

### E2E-16

Timer inicia no momento correto.

### E2E-17

Refresh não reinicia timer.

### E2E-18

Finalização cria exatamente uma interação.

### E2E-19

Aluno resolve sozinho.

### E2E-20

Aluno registra ajuda de colega.

### E2E-21

Professor registra vácuo.

------------------------------------------------------------------------

## Realtime

### E2E-22

Chamado criado aparece no painel aberto em outra janela.

### E2E-23

Mudança para atendimento aparece em outra janela.

### E2E-24

Finalização remove chamado ativo das telas relacionadas.

### E2E-25

Reconexão após perda temporária de rede recupera estado verdadeiro do
banco.

------------------------------------------------------------------------

## Dashboard

### E2E-26

Admin abre dashboard.

### E2E-27

Aluno não acessa dashboard.

### E2E-28

Dashboard apresenta turma.

### E2E-29

Detalhamento da turma é carregado.

### E2E-30

Falha de uma query do dashboard não quebra a fila.

------------------------------------------------------------------------

# 39. Testes de banco

Testar diretamente:

-   constraint de sessão ativa única;
-   constraint de chamado ativo único;
-   aluno não cria chamado para outro aluno;
-   aluno não abre chamado em outra turma;
-   aluno não executa RPC administrativa;
-   admin executa operações autorizadas;
-   finalização não duplica interação;
-   RPC falha integralmente sem deixar alteração parcial;
-   chamado finalizado não é finalizado novamente indevidamente.

------------------------------------------------------------------------

# 40. Observabilidade

Durante desenvolvimento:

-   erros Supabase registrados no console de forma estruturada;
-   erros de mutation preservam `code`, `message` e contexto;
-   canais Realtime podem registrar subscribe/unsubscribe em modo DEV.

Produção não deve exibir informações sensíveis.

------------------------------------------------------------------------

# 41. Segurança

Nunca expor:

-   service role key no frontend;
-   tokens manualmente;
-   dados desnecessários de `auth.users`.

Frontend utiliza somente chave pública apropriada.

Operações privilegiadas dependem de autenticação, RLS e/ou funções
seguras.

------------------------------------------------------------------------

# 42. Performance

Prioridades:

-   queries pequenas;
-   índices para filtros frequentes;
-   não carregar histórico inteiro para montar fila atual;
-   dashboard usa agregações no banco;
-   Realtime assina escopo necessário;
-   TanStack Query evita refetch desnecessário.

Índices devem contemplar principalmente:

``` text
filav2_usuarios.turma_id
filav2_sessoes.turma_id
filav2_chamados.sessao_id
filav2_chamados.perfil_id
filav2_chamados.status
filav2_interacoes.chamado_id
filav2_interacoes.resolvido_por_usuario_id
```

------------------------------------------------------------------------

# 43. UX de falhas

A aplicação nunca deve ficar apenas em:

``` text
Carregando...
```

indefinidamente.

Estados críticos devem oferecer:

-   mensagem;
-   retry;
-   logout quando apropriado;
-   retorno para login quando comprovadamente não autenticado.

Não apagar sessão válida apenas porque uma query demorou.

------------------------------------------------------------------------

# 44. Identidade visual

A V2 preservará a identidade Git Bash/terminal.

Paleta base:

``` css
--background: #000000;
--primary: #1CA600;
--purple: #AE48C6;
--yellow: #C0A000;
--text: #BFBDBB;
--blue: #7D91EC;
--cyan: #00EEEB;
```

Elementos existentes que podem ser preservados:

-   `~/painel`;
-   `~/admin`;
-   `~/meu-chamado`;
-   cursor piscando;
-   cards inspirados em terminal;
-   badges;
-   tema escuro;
-   visual adequado para datashow.

A estética não deve interferir na semântica dos componentes.

------------------------------------------------------------------------

# 45. Estratégia de deploy

## Preview

Branches/PRs podem gerar previews da Vercel apontando para DEV.

## Produção

Somente `main` aponta para:

-   Supabase PROD;
-   domínio oficial.

Variáveis DEV e PROD nunca devem ser misturadas.

------------------------------------------------------------------------

# 46. Rollback

Frontend:

``` text
rollback/redeploy pela Vercel/Git
```

Banco:

-   toda mudança possui migration;
-   rollback deve ser planejado para mudanças destrutivas;
-   feature experimental não é criada diretamente em PROD.

Antes de migration destrutiva em produção:

-   backup;
-   validação;
-   plano explícito de rollback.

------------------------------------------------------------------------

# 47. Definition of Done de uma feature

Uma feature só está concluída quando:

-   regra de negócio está definida;
-   migration necessária existe;
-   RLS foi considerada;
-   operação crítica é atômica;
-   estados loading/error estão tratados;
-   Realtime não é requisito para consistência;
-   testes relevantes passam;
-   funciona após refresh;
-   não introduz estado duplicado;
-   documentação é atualizada.

------------------------------------------------------------------------

# 48. Critérios de aceite da V2

A V2 poderá substituir a versão anterior quando:

-   [ ] banco pode ser criado integralmente do zero;
-   [ ] nenhuma estrutura depende de SQL manual não versionado;
-   [ ] login funciona;
-   [ ] refresh mantém sessão;
-   [ ] múltiplas abas funcionam;
-   [ ] logout funciona;
-   [ ] recuperação de senha funciona;
-   [ ] cadastro de perfil funciona;
-   [ ] aluno abre chamado;
-   [ ] duplicidade de chamado é impedida no banco;
-   [ ] turma incorreta é bloqueada no banco;
-   [ ] admin inicia sessão;
-   [ ] admin encerra sessão;
-   [ ] admin chama próximo;
-   [ ] admin chama aluno específico;
-   [ ] timer sobrevive a refresh;
-   [ ] resultados são registrados atomicamente;
-   [ ] Realtime atualiza outras telas;
-   [ ] falha de Realtime não inutiliza aplicação;
-   [ ] datashow funciona;
-   [ ] dashboard funciona;
-   [ ] falha do dashboard não quebra operação;
-   [ ] RLS foi testada;
-   [ ] testes E2E críticos passam;
-   [ ] DEV e PROD estão separados.

------------------------------------------------------------------------

# 49. Decisões arquiteturais registradas

## ADR-001 --- Manter React/Vite

**Decisão:** manter.

**Motivo:** os problemas da V1 não justificam troca de framework. A
principal fragilidade está na coordenação de estado, autenticação e
responsabilidades.

------------------------------------------------------------------------

## ADR-002 --- Manter Supabase

**Decisão:** manter.

**Motivo:** Auth, PostgreSQL, RLS e Realtime atendem ao domínio. A V2
utilizará esses recursos de maneira mais centralizada e transacional.

------------------------------------------------------------------------

## ADR-003 --- Adotar TanStack Query

**Decisão:** adotar.

**Motivo:** reduzir estado de servidor gerenciado manualmente e
padronizar loading, erro, cache, refetch e invalidação.

------------------------------------------------------------------------

## ADR-004 --- Adotar React Router

**Decisão:** adotar.

**Motivo:** autenticação, recuperação de senha, administração e
dashboard possuem estados de navegação reais e não devem ser tratados
como flags de um componente monolítico.

------------------------------------------------------------------------

## ADR-005 --- Realtime como invalidador

**Decisão:** Realtime não atualiza diretamente o estado de negócio.

**Motivo:** evitar divergência entre eventos recebidos e estado
persistido.

------------------------------------------------------------------------

## ADR-006 --- RPC para operações compostas

**Decisão:** operações críticas serão transações PostgreSQL.

**Motivo:** evitar estados parcialmente atualizados.

------------------------------------------------------------------------

## ADR-007 --- Banco V1 descartável

**Decisão:** o schema atual não será considerado base obrigatória.

**Motivo:** o Fila não está em uso produtivo e não há necessidade de
preservar compatibilidade estrutural. A V2 poderá criar um schema limpo.

------------------------------------------------------------------------

## ADR-008 — Prefixo `filav2_`

**Decisão:** todas as tabelas, views e demais estruturas persistentes específicas da V2 utilizarão o prefixo `filav2_`.

**Motivo:** distinguir claramente a nova implementação das estruturas legadas `fila_`, facilitar inspeção e manutenção do banco compartilhado e reduzir o risco de operações executadas sobre objetos da versão errada.

**Consequência:** nenhum código novo da V2 deve consultar tabelas ou views com o prefixo legado `fila_`.

---

# 50. Regra principal para desenvolvimento

Antes de implementar qualquer nova funcionalidade, responder:

1.  Qual é a fonte da verdade?
2.  Quem pode executar essa operação?
3.  Essa regra precisa existir no banco?
4.  A operação precisa ser atômica?
5.  O que acontece se Realtime estiver indisponível?
6.  O que acontece após F5?
7.  O que acontece em duas abas?
8.  Como essa mudança será reproduzida por migration?
9.  Como fazemos rollback?
10. Qual teste provará que funciona?

Se essas respostas não estiverem claras, a implementação ainda não está
pronta para começar.

------------------------------------------------------------------------

# 51. Resultado esperado

A V2 deve preservar a simplicidade de uso do Fila, mas reduzir
drasticamente o número de estados que o frontend precisa coordenar.

A arquitetura final deve obedecer à seguinte separação:

``` text
AuthProvider       → identidade e sessão
React Router       → navegação e proteção de rotas
TanStack Query     → estado vindo do servidor
Realtime           → aviso de mudança / invalidação
PostgreSQL         → estado persistente
RPC                → operações e transações
RLS                → autorização
React              → apresentação e interação
Views analíticas   → dashboard
```

O objetivo não é apenas reconstruir uma aplicação que funcione.

O objetivo é construir uma aplicação em que os problemas encontrados na
V1 sejam difíceis de reintroduzir por acidente.
