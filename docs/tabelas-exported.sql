-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.fila_alunos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  matricula character varying NOT NULL UNIQUE,
  nome_completo character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  turma_id bigint,
  CONSTRAINT fila_alunos_pkey PRIMARY KEY (id),
  CONSTRAINT fila_alunos_turma_fk FOREIGN KEY (turma_id) REFERENCES public.fila_turmas(id)
);
CREATE TABLE public.fila_chamados (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  sessao_id bigint NOT NULL,
  aluno_id bigint NOT NULL,
  descricao_problema character varying,
  entrou_em timestamp with time zone NOT NULL DEFAULT now(),
  iniciado_atendimento_em timestamp with time zone,
  finalizado_em timestamp with time zone,
  status character varying NOT NULL DEFAULT 'aguardando'::character varying CHECK (status::text = ANY (ARRAY['aguardando'::character varying, 'em_atendimento'::character varying, 'finalizado'::character varying, 'cancelado'::character varying]::text[])),
  observacoes text,
  token_edicao uuid,
  CONSTRAINT fila_chamados_pkey PRIMARY KEY (id),
  CONSTRAINT fila_chamados_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.fila_sessoes(id),
  CONSTRAINT fila_chamados_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.fila_alunos(id)
);
CREATE TABLE public.fila_interacoes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chamado_id bigint NOT NULL UNIQUE,
  tipo_resultado character varying NOT NULL CHECK (tipo_resultado::text = ANY (ARRAY['atendido_professor'::character varying, 'ajudado_colega'::character varying, 'cancelado_pelo_aluno'::character varying, 'desistiu'::character varying, 'resolveu_sozinho'::character varying, 'ficou_no_vacuo'::character varying]::text[])),
  resolvido_por_aluno_id bigint,
  registrado_em timestamp with time zone NOT NULL DEFAULT now(),
  duracao_atendimento_segundos integer,
  comentario text,
  CONSTRAINT fila_interacoes_pkey PRIMARY KEY (id),
  CONSTRAINT fila_interacoes_chamado_id_fkey FOREIGN KEY (chamado_id) REFERENCES public.fila_chamados(id),
  CONSTRAINT fila_interacoes_resolvido_por_aluno_id_fkey FOREIGN KEY (resolvido_por_aluno_id) REFERENCES public.fila_alunos(id)
);
CREATE TABLE public.fila_sessoes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo character varying,
  ativa boolean NOT NULL DEFAULT true,
  iniciada_em timestamp with time zone NOT NULL DEFAULT now(),
  encerrada_em timestamp with time zone,
  turma_id bigint,
  CONSTRAINT fila_sessoes_pkey PRIMARY KEY (id),
  CONSTRAINT fila_sessoes_turma_fk FOREIGN KEY (turma_id) REFERENCES public.fila_turmas(id)
);
CREATE TABLE public.fila_turmas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  apelido character varying NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fila_turmas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gam_categorias (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gam_categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gam_conquistas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  aluno_id bigint NOT NULL,
  desafio_id bigint NOT NULL,
  data_realizacao timestamp with time zone NOT NULL DEFAULT now(),
  pontos_obtidos integer NOT NULL CHECK (pontos_obtidos >= 0),
  observacao text,
  registrado_por bigint,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gam_conquistas_pkey PRIMARY KEY (id),
  CONSTRAINT gam_conquistas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.gam_usuarios(id),
  CONSTRAINT gam_conquistas_desafio_id_fkey FOREIGN KEY (desafio_id) REFERENCES public.gam_desafios(id),
  CONSTRAINT gam_conquistas_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.gam_usuarios(id)
);
CREATE TABLE public.gam_desafios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo character varying NOT NULL,
  descricao text,
  pontos integer NOT NULL CHECK (pontos >= 0),
  ativo boolean NOT NULL DEFAULT true,
  categoria_id bigint,
  limitacao_tipo character varying NOT NULL DEFAULT 'livre'::character varying CHECK (limitacao_tipo::text = ANY (ARRAY['livre'::character varying, 'unica'::character varying, 'limitada'::character varying, 'intervalada'::character varying]::text[])),
  limitacao_quantidade integer CHECK (limitacao_quantidade IS NULL OR limitacao_quantidade > 0),
  limitacao_intervalo_dias integer CHECK (limitacao_intervalo_dias IS NULL OR limitacao_intervalo_dias > 0),
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gam_desafios_pkey PRIMARY KEY (id),
  CONSTRAINT gam_desafios_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.gam_categorias(id)
);
CREATE TABLE public.gam_turmas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  codigo character varying UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gam_turmas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gam_usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  auth_user_id uuid UNIQUE,
  nome character varying NOT NULL,
  matricula character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  turma_id bigint,
  tipo character varying NOT NULL DEFAULT 'aluno'::character varying CHECK (tipo::text = ANY (ARRAY['aluno'::character varying, 'professor'::character varying, 'admin'::character varying]::text[])),
  ativo boolean NOT NULL DEFAULT true,
  ultimo_login_em timestamp with time zone,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gam_usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT gam_usuarios_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT gam_usuarios_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.gam_turmas(id)
);