# Fila V2

## Objetivo

Sistema de gerenciamento de filas de atendimento.

## Stack

- React
- Vite
- JavaScript
- React Router
- TanStack Query
- Recharts
- Supabase

A aplicação deve utilizar JavaScript.

Não introduzir TypeScript ou converter arquivos para TypeScript
sem uma decisão arquitetural explícita.

## Supabase

Supabase é o backend da aplicação. O Fila V2 utiliza um projeto Supabase
compartilhado com outras aplicações.

Utilizar:

- PostgreSQL
- Supabase Auth
- Row Level Security
- Realtime
- Edge Functions somente quando necessário

### Isolamento

O repositório é responsável exclusivamente pelos objetos pertencentes
ao Fila V2.

Todos os objetos próprios da aplicação devem utilizar o prefixo
`filav2_` quando aplicável, incluindo:

- tabelas
- views
- functions
- triggers

Objetos pertencentes a outras aplicações nunca devem ser alterados,
removidos ou recriados.

### Auth

Supabase Auth é a única fonte de verdade da sessão.

`auth.users` é compartilhado entre aplicações.

A existência de um usuário em `auth.users` não significa que ele
possui acesso ao Fila V2.

A associação do usuário à aplicação deve ser determinada pelas
estruturas próprias `filav2_*`.

Nunca implementar autorização somente no frontend.

Toda autorização de acesso aos dados deve ser garantida
também por RLS.

### Migrations

Toda alteração estrutural do Fila V2 deve ser versionada através
de migrations.

As migrations deste repositório devem modificar exclusivamente
objetos pertencentes ao Fila V2.

Não realizar alterações manuais que não possam ser
reproduzidas posteriormente.

Nunca executar operações destrutivas ou resets assumindo que o
projeto Supabase inteiro pertence ao Fila V2.

### Segurança

Todas as tabelas acessíveis pelo frontend devem utilizar RLS.

As policies devem garantir explicitamente o isolamento e a
autorização dos dados do Fila V2.

## Estado

TanStack Query é responsável por server state.

Não duplicar dados provenientes do servidor em Context
ou estados globais sem necessidade.

## Segurança

Nunca:

- expor service_role no frontend
- commitar arquivos .env
- confiar em dados fornecidos pelo cliente
- desabilitar RLS como solução para problemas de acesso

## Qualidade

Antes de considerar uma tarefa concluída:

1. executar lint
2. executar testes existentes
3. executar build
4. corrigir erros encontrados
5. informar os arquivos alterados
6. explicar decisões arquiteturais relevantes

## Princípios

Prefira:

- soluções simples
- funções pequenas
- componentes com responsabilidade clara
- contratos de dados claros nas fronteiras da aplicação
- validação explícita de dados externos quando necessária
- código legível a abstrações prematuras

Evite:

- duplicação de estado
- dependências desnecessárias
- abstrações sem uso concreto
- soluções temporárias que criem dívida técnica
