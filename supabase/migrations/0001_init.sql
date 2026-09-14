-- ============================================================
-- LABORATÓRIO — Schema inicial
-- Sistema single-user. RLS: usuário autenticado acessa tudo.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- clientes
-- ------------------------------------------------------------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- nichos
-- ------------------------------------------------------------
create table nichos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  categoria text not null check (categoria in ('dor', 'desejo')),
  produto text,
  publico text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index idx_nichos_cliente_id on nichos(cliente_id);
create index idx_nichos_categoria on nichos(categoria);

-- ------------------------------------------------------------
-- avatares
-- ------------------------------------------------------------
create table avatares (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  faixa_etaria text,
  genero text,
  descricao text,
  dores jsonb not null default '[]',
  desejos jsonb not null default '[]',
  desejos_ocultos jsonb not null default '[]',
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- avatar_nicho
-- ------------------------------------------------------------
create table avatar_nicho (
  id uuid primary key default gen_random_uuid(),
  avatar_id uuid not null references avatares(id) on delete cascade,
  nicho_id uuid not null references nichos(id) on delete cascade,
  principal boolean not null default false,
  unique (avatar_id, nicho_id)
);
create index idx_avatar_nicho_nicho_id on avatar_nicho(nicho_id);
create index idx_avatar_nicho_avatar_id on avatar_nicho(avatar_id);

-- ------------------------------------------------------------
-- concorrentes
-- ------------------------------------------------------------
create table concorrentes (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  nome text not null,
  url_pagina text,
  url_biblioteca_anuncios text,
  origem text not null default 'manual' check (origem in ('manual', 'descoberto')),
  status text not null default 'ativo' check (status in ('ativo', 'sugerido', 'ignorado')),
  monitorado boolean not null default true,
  ultima_verificacao timestamptz,
  criado_em timestamptz not null default now()
);
create index idx_concorrentes_nicho_status on concorrentes(nicho_id, status);

-- ------------------------------------------------------------
-- anuncios_espionados
-- ------------------------------------------------------------
create table anuncios_espionados (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  concorrente_id uuid references concorrentes(id) on delete set null,
  plataforma text not null check (plataforma in ('meta', 'tiktok', 'youtube', 'instagram', 'spy_tool', 'outro')),
  url text,
  titulo text,
  copy_texto text,
  transcricao text,
  url_pagina_venda text,
  transcricao_vsl text,
  tipo_pagina text check (tipo_pagina in ('vsl', 'advertorial', 'quiz', 'longform')),
  primeira_veiculacao date,
  dias_em_veiculacao integer,
  num_variacoes integer,
  escalado boolean not null default false,
  coletado_via text not null default 'manual' check (coletado_via in ('auto', 'manual')),
  capturado_em timestamptz not null default now()
);
create index idx_anuncios_nicho_id on anuncios_espionados(nicho_id);
create index idx_anuncios_escalado on anuncios_espionados(escalado);
create index idx_anuncios_concorrente_id on anuncios_espionados(concorrente_id);

-- ------------------------------------------------------------
-- pesquisas
-- ------------------------------------------------------------
create table pesquisas (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  tipo text not null check (tipo in ('completa', 'avatar', 'mercado', 'trafego_pago', 'organico', 'diaria')),
  origem text not null default 'manual' check (origem in ('manual', 'automatica')),
  titulo text,
  resumo text,
  relatorio text,
  status text not null default 'rodando' check (status in ('rodando', 'aguardando_aprovacao', 'aprovada', 'recusada', 'erro')),
  feedback_usuario text,
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index idx_pesquisas_nicho_criado on pesquisas(nicho_id, criado_em desc);
create index idx_pesquisas_status on pesquisas(status);

-- ------------------------------------------------------------
-- fontes_pesquisa
-- ------------------------------------------------------------
create table fontes_pesquisa (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references pesquisas(id) on delete cascade,
  tipo text not null check (tipo in ('youtube', 'reddit', 'amazon', 'tiktok', 'instagram', 'biblioteca_meta', 'google_trends', 'noticia', 'pagina_venda', 'vsl', 'spy_tool')),
  url text,
  titulo text,
  conteudo_extraido text,
  transcricao text,
  comentarios jsonb not null default '[]',
  coletado_via text not null default 'auto' check (coletado_via in ('auto', 'manual')),
  criado_em timestamptz not null default now()
);
create index idx_fontes_pesquisa_id on fontes_pesquisa(pesquisa_id);

-- ------------------------------------------------------------
-- padroes
-- ------------------------------------------------------------
create table padroes (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid references pesquisas(id) on delete set null,
  nicho_id uuid not null references nichos(id) on delete cascade,
  avatar_id uuid references avatares(id) on delete set null,
  tipo text not null check (tipo in ('avatar', 'dor', 'beneficio', 'desejo_oculto', 'formato', 'angulo', 'persona', 'tendencia')),
  descricao text not null,
  frequencia integer not null default 1,
  forca_evidencia text not null default 'media' check (forca_evidencia in ('alta', 'media', 'baixa')),
  porque_funciona text,
  potencial_teste text not null default 'medio' check (potencial_teste in ('alto', 'medio', 'baixo')),
  criado_em timestamptz not null default now()
);
create index idx_padroes_nicho_tipo on padroes(nicho_id, tipo);
create index idx_padroes_avatar_id on padroes(avatar_id);

-- ------------------------------------------------------------
-- briefings
-- ------------------------------------------------------------
create table briefings (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  pesquisa_id uuid references pesquisas(id) on delete set null,
  titulo text not null,
  contexto_mercado text,
  decisao_estrategica text not null,
  justificativa_psicologica text,
  conteudo text,
  status text not null default 'rascunho' check (status in ('rascunho', 'aguardando_aprovacao', 'aprovado', 'recusado')),
  feedback_usuario text,
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index idx_briefings_nicho_criado on briefings(nicho_id, criado_em desc);

-- ------------------------------------------------------------
-- levas
-- ------------------------------------------------------------
create table levas (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid references briefings(id) on delete set null,
  nicho_id uuid not null references nichos(id) on delete cascade,
  nome text not null,
  objetivo text,
  quantidade_prevista integer not null default 0,
  status text not null default 'planejada' check (status in ('planejada', 'em_escrita', 'no_ar', 'encerrada')),
  data_inicio date,
  data_fim date,
  veredito text,
  criado_em timestamptz not null default now()
);
create index idx_levas_nicho_status on levas(nicho_id, status);

-- ------------------------------------------------------------
-- hipoteses
-- ------------------------------------------------------------
create table hipoteses (
  id uuid primary key default gen_random_uuid(),
  leva_id uuid not null references levas(id) on delete cascade,
  numero integer not null,
  descricao text not null,
  linha text not null default 'replica_padrao' check (linha in ('replica_padrao', 'psicologia')),
  padrao_origem_id uuid references padroes(id) on delete set null,
  avatar_id uuid references avatares(id) on delete set null,
  angulo text,
  formato text,
  dor_alvo text,
  justificativa text,
  resultado text not null default 'pendente' check (resultado in ('pendente', 'validada', 'refutada', 'inconclusiva')),
  aprendizado text,
  avaliado_em timestamptz
);
create index idx_hipoteses_leva_id on hipoteses(leva_id);

-- ------------------------------------------------------------
-- copies
-- ------------------------------------------------------------
create table copies (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  leva_id uuid references levas(id) on delete set null,
  hipotese_id uuid references hipoteses(id) on delete set null,
  tipo text not null check (tipo in ('vsl', 'microlead', 'lead', 'anuncio', 'gancho')),
  modo text not null default 'zero' check (modo in ('zero', 'variacao', 'modelagem_estrutura', 'modelagem_nicho', 'variacao_dor', 'variacao_curiosidade')),
  copy_referencia_id uuid references copies(id) on delete set null,
  anuncio_referencia_id uuid references anuncios_espionados(id) on delete set null,
  titulo text not null,
  conteudo text not null,
  versao integer not null default 1,
  status text not null default 'rascunho' check (status in ('rascunho', 'aguardando_revisao', 'aprovada', 'recusada')),
  feedback_usuario text,
  criado_em timestamptz not null default now()
);
create index idx_copies_nicho_tipo on copies(nicho_id, tipo);
create index idx_copies_leva_id on copies(leva_id);
create index idx_copies_referencia_id on copies(copy_referencia_id);

-- ------------------------------------------------------------
-- criativos
-- ------------------------------------------------------------
create table criativos (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  copy_id uuid references copies(id) on delete set null,
  leva_id uuid references levas(id) on delete set null,
  hipotese_id uuid references hipoteses(id) on delete set null,
  nome_criativo text not null unique,
  angulo text,
  formato text,
  avatar_id uuid references avatares(id) on delete set null,
  legenda text,
  trilha_sonora text,
  data_subida date,
  status text not null default 'no_ar' check (status in ('no_ar', 'pausado', 'encerrado')),
  observacoes text,
  criado_em timestamptz not null default now()
);
create index idx_criativos_nicho_id on criativos(nicho_id);
create index idx_criativos_leva_id on criativos(leva_id);

-- ------------------------------------------------------------
-- importacoes (precisa existir antes de metricas por causa da FK)
-- ------------------------------------------------------------
create table importacoes (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid not null references nichos(id) on delete cascade,
  tipo text not null check (tipo in ('csv', 'planilha', 'texto')),
  conteudo_bruto text,
  linhas_processadas integer not null default 0,
  linhas_nao_reconhecidas jsonb not null default '[]',
  criado_em timestamptz not null default now()
);
create index idx_importacoes_nicho_id on importacoes(nicho_id);

-- ------------------------------------------------------------
-- metricas
-- ------------------------------------------------------------
create table metricas (
  id uuid primary key default gen_random_uuid(),
  criativo_id uuid not null references criativos(id) on delete cascade,
  importacao_id uuid references importacoes(id) on delete set null,
  periodo_inicio date,
  periodo_fim date,
  investimento numeric(12,2),
  cpa numeric(12,2),
  cpl numeric(12,2),
  roas numeric(8,2),
  ctr numeric(8,4),
  hook_rate numeric(8,4),
  cpm numeric(12,2),
  cpc numeric(12,2),
  leads integer,
  vendas integer,
  receita numeric(12,2),
  criado_em timestamptz not null default now()
);
create index idx_metricas_criativo_periodo on metricas(criativo_id, periodo_fim desc);

-- ------------------------------------------------------------
-- aprendizados
-- ------------------------------------------------------------
create table aprendizados (
  id uuid primary key default gen_random_uuid(),
  escopo text not null check (escopo in ('nicho', 'categoria', 'avatar', 'global')),
  nicho_id uuid references nichos(id) on delete cascade,
  categoria text check (categoria in ('dor', 'desejo')),
  avatar_id uuid references avatares(id) on delete set null,
  tipo text not null check (tipo in ('performance', 'psicologia', 'estrutura', 'processo')),
  afirmacao text not null,
  porque text,
  evidencia jsonb not null default '[]',
  n_amostras integer not null default 0,
  confianca numeric(4,3) not null default 0.000,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index idx_aprendizados_escopo on aprendizados(escopo);
create index idx_aprendizados_nicho_id on aprendizados(nicho_id);
create index idx_aprendizados_avatar_id on aprendizados(avatar_id);
create index idx_aprendizados_categoria_tipo on aprendizados(categoria, tipo);

-- ------------------------------------------------------------
-- sugestoes
-- ------------------------------------------------------------
create table sugestoes (
  id uuid primary key default gen_random_uuid(),
  nicho_id uuid references nichos(id) on delete cascade,
  tipo text not null check (tipo in ('angulo', 'persona', 'dor', 'variacao', 'concorrente', 'melhoria_processo')),
  conteudo text not null,
  justificativa text,
  aprendizado_id uuid references aprendizados(id) on delete set null,
  status text not null default 'nova' check (status in ('nova', 'aceita', 'recusada')),
  criado_em timestamptz not null default now()
);
create index idx_sugestoes_nicho_status on sugestoes(nicho_id, status);

-- ------------------------------------------------------------
-- aprovacoes
-- ------------------------------------------------------------
create table aprovacoes (
  id uuid primary key default gen_random_uuid(),
  entidade text not null check (entidade in ('pesquisa', 'briefing', 'copy')),
  entidade_id uuid not null,
  decisao text not null check (decisao in ('aprovado', 'recusado')),
  feedback text,
  criado_em timestamptz not null default now()
);
create index idx_aprovacoes_entidade on aprovacoes(entidade, entidade_id);

-- ------------------------------------------------------------
-- jobs
-- ------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pesquisa_diaria', 'monitoramento_concorrente', 'reavaliacao_aprendizado')),
  nicho_id uuid references nichos(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'rodando', 'concluido', 'erro')),
  log text,
  iniciado_em timestamptz,
  finalizado_em timestamptz
);
create index idx_jobs_tipo_status on jobs(tipo, status);

-- ------------------------------------------------------------
-- biblioteca_index
-- ------------------------------------------------------------
create table biblioteca_index (
  id uuid primary key default gen_random_uuid(),
  tipo_origem text not null check (tipo_origem in ('pesquisa', 'briefing', 'copy', 'criativo', 'padrao', 'aprendizado')),
  origem_id uuid not null,
  cliente_id uuid references clientes(id) on delete set null,
  nicho_id uuid references nichos(id) on delete set null,
  titulo text not null,
  resumo text,
  tags text[] not null default '{}',
  resultado_resumo text,
  busca tsvector,
  criado_em timestamptz not null default now()
);
create index idx_biblioteca_busca on biblioteca_index using gin(busca);
create index idx_biblioteca_tags on biblioteca_index using gin(tags);
create index idx_biblioteca_tipo_origem on biblioteca_index(tipo_origem);
create index idx_biblioteca_nicho_id on biblioteca_index(nicho_id);
