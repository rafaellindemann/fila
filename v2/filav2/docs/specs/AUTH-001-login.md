# AUTH-001 — Login

## Objetivo

Permitir autenticação através do Supabase Auth.

## Requisitos

- login com email e senha
- feedback de carregamento
- tratamento de credenciais inválidas
- restauração da sessão
- redirecionamento após autenticação

## Regras arquiteturais

Supabase Auth é a única fonte de verdade da sessão.

Não duplicar a sessão em estado global.

## Critérios de aceite

- usuário válido consegue entrar
- usuário inválido recebe mensagem apropriada
- refresh não perde a sessão
- logout invalida a sessão
- rota protegida não é acessível sem autenticação

## Validação

Executar:
- lint
- typecheck
- testes relacionados à autenticação