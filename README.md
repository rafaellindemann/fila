# Fila do Rafa

Sistema web de **fila de atendimento em sala de aula**, criado para
organizar dúvidas durante as aulas, permitir que os alunos acompanhem a
fila em tempo real e gerar dados sobre atendimentos, colaboração e
dinâmica das turmas.

O projeto possui uma interface inspirada visualmente em **Git Bash /
terminal**, mantendo interações convencionais de uma aplicação web.

## Tecnologias

### Frontend

-   **React**
-   **Vite**
-   **JavaScript**
-   **CSS Vanilla**
-   **Recharts** para gráficos e visualizações do dashboard

### Backend e infraestrutura

-   **Supabase**
    -   Authentication
    -   PostgreSQL
    -   Row Level Security (RLS)
    -   Realtime
-   **Vercel** para deploy do frontend

## Autenticação e usuários

O sistema utiliza **Supabase Auth com e-mail e senha**.

O fluxo atual é:

1.  O usuário cria uma conta com e-mail e senha.
2.  No primeiro acesso, completa seu perfil.
3.  O perfil da aplicação é vinculado ao `auth.users` pelo UUID do
    usuário.
4.  Depois de cadastrado, o usuário acessa normalmente o sistema usando
    a mesma conta.

O cadastro complementar armazena informações como: - nome completo; -
matrícula; - turma; - papel do usuário (`aluno` ou `admin`).

A confirmação de e-mail está desativada no ambiente atual para
simplificar o uso em sala de aula.

### Recuperação de senha

O sistema possui fluxo de recuperação de senha usando o Supabase Auth: -
solicitação por e-mail; - acesso por link de recuperação; - definição de
nova senha dentro da aplicação.

Também existem mecanismos defensivos para recuperação de sessões
persistidas que apresentem falha durante o carregamento da autenticação.

## Turmas e sessões

O sistema trabalha com dois conceitos principais:

### Turma

Representa uma turma atendida pelo professor.

Cada aluno pertence a uma turma.

### Sessão

Representa uma aula ou período em que a fila está aberta.

Uma sessão: - pertence a uma turma; - pode estar ativa ou encerrada; -
determina quais alunos podem entrar na fila naquele momento.

Quando existe uma sessão ativa, ela também pode ser utilizada como
referência para facilitar a seleção da turma durante o cadastro de novos
alunos.

## Fila de atendimento

Durante uma sessão ativa, o aluno pode abrir um chamado descrevendo sua
dúvida.

Principais regras: - o aluno só pode entrar na fila da própria turma; -
cada chamado pertence ao usuário autenticado; - o aluno não escolhe
manualmente outro usuário como dono do chamado; - a descrição da dúvida
possui limite de **300 caracteres**; - o sistema impede chamados ativos
incompatíveis com as regras da fila.

A fila é atualizada por **Supabase Realtime**, permitindo que alterações
apareçam automaticamente nas telas conectadas.

## Painel público / modo datashow

O painel público foi projetado para permanecer aberto em um projetor
durante a aula.

Ele apresenta: - aluno atualmente em atendimento; - dúvida atualmente
atendida; - fila de alunos aguardando; - ordem dos chamados; - timer do
atendimento atual.

Os chamados aguardando são exibidos em cards compactos distribuídos pela
tela para aproveitar melhor o espaço disponível.

O chamado em atendimento recebe destaque visual.

### Timer de atendimento

O timer começa quando o atendimento é iniciado pelo professor.

Existe um tempo padrão de atendimento, inicialmente configurado em **2
minutos**, que pode ser alterado pelo administrador.

A configuração personalizada é armazenada localmente no navegador.

Quando o tempo chega a zero, o timer recebe sinalização visual de
alerta.

## Área do aluno

Na aba **Meu chamado**, o aluno pode: - abrir uma dúvida; - visualizar
seu chamado atual; - cancelar o chamado; - informar que resolveu
sozinho; - registrar que foi ajudado por um colega.

Ao registrar ajuda de um colega, o próprio aluno seleciona quem o
ajudou, evitando que ele seja selecionado como seu próprio ajudador.

## Painel administrativo

Usuários com papel `admin` possuem acesso a uma área específica para
gerenciamento da fila.

Entre as funcionalidades implementadas estão: - visualizar sessão
ativa; - iniciar e encerrar sessões; - acompanhar a fila; - chamar o
próximo aluno; - iniciar atendimento; - registrar resultados dos
atendimentos; - cancelar chamados; - registrar aluno que ficou no
vácuo; - chamar um aluno específico da fila sem necessariamente seguir a
primeira posição; - configurar o tempo padrão do atendimento.

A operação administrativa é separada da visualização pública destinada
ao datashow.

## Resultados dos chamados

Os atendimentos podem gerar diferentes tipos de resultado, incluindo:

-   atendimento pelo professor;
-   ajuda de colega;
-   cancelamento pelo aluno;
-   desistência;
-   resolução pelo próprio aluno;
-   aluno que ficou no vácuo.

Esses registros alimentam as métricas do sistema.

## Dashboard administrativo

O sistema possui uma área **Dashboard** separada do painel operacional
de administração.

A navegação principal permite separar: - Painel; - Meu chamado; -
Admin; - Dashboard; - Sair.

### Visão geral

O dashboard apresenta uma visão macro das turmas, incluindo indicadores
como: - quantidade de turmas; - quantidade de alunos; - quantidade de
chamados; - quantidade de sessões; - média de espera; - média de
atendimento.

Também possui visualizações gráficas, incluindo: - chamados por turma; -
distribuição dos tipos de fechamento.

### Detalhamento por turma

Uma turma pode ser aberta individualmente para análise.

A visão detalhada apresenta: - quantidade de alunos; - quantidade de
chamados; - quantidade de sessões; - média de espera; - chamados por
aluno; - ajudas realizadas por aluno; - distribuição dos tipos de
fechamento; - tabela consolidada dos alunos.

A tabela permite ordenar os dados em ordem crescente ou decrescente
clicando nos cabeçalhos, incluindo: - aluno; - chamados; - ajudas; -
resoluções realizadas sozinho.

### Arquitetura das métricas

As agregações do dashboard são realizadas por **views no
PostgreSQL/Supabase**, evitando transferir toda a responsabilidade de
processamento para o frontend.

Entre as views utilizadas estão estruturas para: - resumo das turmas; -
fechamentos por turma; - chamados por aluno; - ajudas por aluno; -
resumo consolidado dos alunos.

## Banco de dados

Entre as principais estruturas do projeto estão:

### `fila_usuarios`

Perfil do usuário da aplicação, vinculado ao Supabase Auth.

Contém informações como: - UUID; - nome; - matrícula; - turma; - papel.

### `fila_turmas`

Cadastro das turmas atendidas.

### `fila_sessoes`

Representa as aulas/períodos em que a fila pode ser utilizada.

### `fila_chamados`

Armazena os chamados abertos pelos alunos, incluindo: - sessão; -
perfil; - descrição; - status; - horário de entrada; - início do
atendimento; - finalização; - dados relacionados ao tempo de espera.

### `fila_interacoes`

Armazena os resultados e interações relacionados aos chamados,
permitindo identificar como uma dúvida foi encerrada e, quando
aplicável, quem ajudou.

## Segurança

O projeto utiliza **Row Level Security (RLS)** no Supabase.

Entre os princípios adotados: - o usuário autenticado é a fonte da
verdade para sua identidade; - alunos não devem manipular dados de
outros usuários; - operações são relacionadas ao `auth.uid()`; - regras
de acesso são aplicadas diretamente no banco sempre que necessário; - o
frontend não deve ser considerado a única barreira de segurança.

## Realtime

A fila utiliza **Supabase Realtime**.

Isso permite que: - novos chamados apareçam sem recarregar a página; -
mudanças de status sejam refletidas automaticamente; - o painel do
datashow acompanhe a operação do professor; - diferentes usuários vejam
o estado atualizado da fila.

## Interface

A identidade visual atual é inspirada em um terminal / Git Bash.

A paleta utiliza principalmente:

``` css
#000000
#1CA600
#AE48C6
#C0A000
#BFBDBB
#7D91EC
#00EEEB
```

A interface também utiliza elementos como: - prefixos de navegação no
estilo `~/painel`, `~/admin` e `~/meu-chamado`; - cursor piscando; -
headers inspirados em janelas de terminal; - pequenos rótulos no estilo
de comandos; - tema escuro com alto contraste adequado para projetores.

## Estrutura conceitual

O sistema separa três contextos principais:

**Operação da fila**\
Uso em tempo real durante a aula.

**Experiência do aluno**\
Entrada na fila, acompanhamento e registro da resolução da dúvida.

**Análise pedagógica**\
Dashboard com métricas históricas das turmas, alunos, atendimentos e
colaboração.

## Status do projeto

O projeto encontra-se em desenvolvimento ativo e já possui um MVP
funcional com:

-   autenticação;
-   cadastro complementar de perfil;
-   recuperação de senha;
-   gerenciamento de turmas;
-   sessões de atendimento;
-   abertura e gerenciamento de chamados;
-   fila em tempo real;
-   painel para datashow;
-   painel administrativo;
-   registro de diferentes resultados;
-   registro de ajuda entre colegas;
-   timer de atendimento;
-   dashboard administrativo;
-   gráficos e métricas por turma e aluno;
-   interface responsiva com skin inspirada em Git Bash.

## Próximas possibilidades

Algumas evoluções possíveis para o projeto incluem: - histórico
detalhado por aluno; - métricas de login e último acesso; - evolução das
métricas por período; - comparação entre sessões; - indicadores de
colaboração e autonomia; - filtros por período no dashboard; -
exportação de dados; - integração com projetos de gamificação; - novas
métricas pedagógicas baseadas no histórico de uso.

------------------------------------------------------------------------

Projeto desenvolvido para apoiar a organização do atendimento e da
colaboração entre alunos durante aulas de Desenvolvimento de Sistemas.
