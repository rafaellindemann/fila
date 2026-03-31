-- =========================================
-- LIMPEZA OPCIONAL (rode só se quiser recriar tudo)
-- =========================================
-- DROP TABLE IF EXISTS fila_interacoes CASCADE;
-- DROP TABLE IF EXISTS fila_chamados CASCADE;
-- DROP TABLE IF EXISTS fila_sessoes CASCADE;
-- DROP TABLE IF EXISTS fila_alunos CASCADE;

-- =========================================
-- TABELA DE ALUNOS
-- =========================================
CREATE TABLE fila_alunos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    matricula VARCHAR(30) NOT NULL UNIQUE,
    nome_completo VARCHAR(150) NOT NULL,
    turma VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- TABELA DE SESSÕES DE FILA
-- Cada vez que você "abre a fila" para uma turma,
-- cria uma sessão nova.
-- =========================================
CREATE TABLE fila_sessoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turma VARCHAR(100) NOT NULL,
    titulo VARCHAR(150),
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    encerrada_em TIMESTAMPTZ
);

-- Garante no máximo uma sessão ativa por turma
CREATE UNIQUE INDEX fila_sessoes_uma_ativa_por_turma
ON fila_sessoes (turma)
WHERE ativa = TRUE;

-- =========================================
-- TABELA DE CHAMADOS / FILA ATIVA E HISTÓRICA
-- Um registro por entrada do aluno na fila.
-- =========================================
CREATE TABLE fila_chamados (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sessao_id BIGINT NOT NULL REFERENCES fila_sessoes(id) ON DELETE CASCADE,
    aluno_id BIGINT NOT NULL REFERENCES fila_alunos(id) ON DELETE RESTRICT,

    descricao_problema VARCHAR(300),
    entrou_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    iniciado_atendimento_em TIMESTAMPTZ,
    finalizado_em TIMESTAMPTZ,

    status VARCHAR(30) NOT NULL DEFAULT 'aguardando',

    observacoes TEXT,

    CONSTRAINT fila_chamados_status_check
        CHECK (
            status IN (
                'aguardando',
                'em_atendimento',
                'finalizado',
                'cancelado'
            )
        )
);

-- Índices úteis
CREATE INDEX fila_chamados_sessao_idx ON fila_chamados(sessao_id);
CREATE INDEX fila_chamados_aluno_idx ON fila_chamados(aluno_id);
CREATE INDEX fila_chamados_status_idx ON fila_chamados(status);
CREATE INDEX fila_chamados_entrou_em_idx ON fila_chamados(entrou_em);

-- Impede que o mesmo aluno fique duas vezes aguardando/em atendimento
-- na mesma sessão
CREATE UNIQUE INDEX fila_chamados_um_ativo_por_aluno_na_sessao
ON fila_chamados(sessao_id, aluno_id)
WHERE status IN ('aguardando', 'em_atendimento');

-- =========================================
-- TABELA DE INTERAÇÕES / DESFECHO
-- Registra COMO o chamado foi resolvido.
-- =========================================
CREATE TABLE fila_interacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    chamado_id BIGINT NOT NULL UNIQUE REFERENCES fila_chamados(id) ON DELETE CASCADE,

    tipo_resultado VARCHAR(30) NOT NULL,
    resolvido_por_aluno_id BIGINT REFERENCES fila_alunos(id) ON DELETE RESTRICT,

    registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    duracao_atendimento_segundos INTEGER,
    comentario TEXT,

    CONSTRAINT fila_interacoes_tipo_resultado_check
        CHECK (
            tipo_resultado IN (
                'atendido_professor',
                'ajudado_colega',
                'cancelado_pelo_aluno',
                'desistiu',
                'resolveu_sozinho',
                'ficou_no_vacuo'
            )
        ),

    CONSTRAINT fila_interacoes_ajudante_obrigatorio_check
        CHECK (
            (tipo_resultado = 'ajudado_colega' AND resolvido_por_aluno_id IS NOT NULL)
            OR
            (tipo_resultado <> 'ajudado_colega')
        )
);

CREATE INDEX fila_interacoes_tipo_resultado_idx ON fila_interacoes(tipo_resultado);
CREATE INDEX fila_interacoes_resolvido_por_aluno_idx ON fila_interacoes(resolvido_por_aluno_id);

-- =========================================
-- VIEW OPCIONAL PARA FILA ATIVA ORDENADA
-- Facilita consultar quem ainda está esperando
-- =========================================
CREATE VIEW fila_view_fila_ativa AS
SELECT
    c.id AS chamado_id,
    s.id AS sessao_id,
    s.turma,
    a.id AS aluno_id,
    a.matricula,
    a.nome_completo,
    a.turma AS turma_aluno,
    c.descricao_problema,
    c.entrou_em,
    c.iniciado_atendimento_em,
    c.status
FROM fila_chamados c
INNER JOIN fila_alunos a ON a.id = c.aluno_id
INNER JOIN fila_sessoes s ON s.id = c.sessao_id
WHERE c.status IN ('aguardando', 'em_atendimento')
ORDER BY c.entrou_em ASC;


CREATE TABLE fila_turmas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    apelido VARCHAR(150) NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);