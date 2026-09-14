// Tipos gerados manualmente a partir de supabase/migrations/0001_init.sql
// Mantenha em sincronia com o schema SQL.

export type Categoria = 'dor' | 'desejo';

export type StatusPesquisa = 'rodando' | 'aguardando_aprovacao' | 'aprovada' | 'recusada' | 'erro';
export type StatusBriefing = 'rascunho' | 'aguardando_aprovacao' | 'aprovado' | 'recusado';
export type StatusCopy = 'rascunho' | 'aguardando_revisao' | 'aprovada' | 'recusada';
export type StatusLeva = 'planejada' | 'em_escrita' | 'no_ar' | 'encerrada';
export type StatusCriativo = 'no_ar' | 'pausado' | 'encerrado';
export type StatusConcorrente = 'ativo' | 'sugerido' | 'ignorado';
export type StatusSugestao = 'nova' | 'aceita' | 'recusada';
export type StatusJob = 'pendente' | 'rodando' | 'concluido' | 'erro';

export type TipoPesquisa = 'completa' | 'avatar' | 'mercado' | 'trafego_pago' | 'organico' | 'diaria';
export type OrigemPesquisa = 'manual' | 'automatica';
export type TipoFonte =
  | 'youtube' | 'reddit' | 'amazon' | 'tiktok' | 'instagram'
  | 'biblioteca_meta' | 'google_trends' | 'noticia' | 'pagina_venda' | 'vsl' | 'spy_tool';

export type TipoPadrao = 'avatar' | 'dor' | 'beneficio' | 'desejo_oculto' | 'formato' | 'angulo' | 'persona' | 'tendencia';
export type ForcaEvidencia = 'alta' | 'media' | 'baixa';
export type PotencialTeste = 'alto' | 'medio' | 'baixo';

export type LinhaHipotese = 'replica_padrao' | 'psicologia';
export type ResultadoHipotese = 'pendente' | 'validada' | 'refutada' | 'inconclusiva';

export type TipoCopy = 'vsl' | 'microlead' | 'lead' | 'anuncio' | 'gancho';
export type ModoEscrita = 'zero' | 'variacao' | 'modelagem_estrutura' | 'modelagem_nicho' | 'variacao_dor' | 'variacao_curiosidade';

export type EscopoAprendizado = 'nicho' | 'categoria' | 'avatar' | 'global';
export type TipoAprendizado = 'performance' | 'psicologia' | 'estrutura' | 'processo';

export type TipoSugestao = 'angulo' | 'persona' | 'dor' | 'variacao' | 'concorrente' | 'melhoria_processo';
export type TipoImportacao = 'csv' | 'planilha' | 'texto';
export type TipoJob = 'pesquisa_diaria' | 'monitoramento_concorrente' | 'reavaliacao_aprendizado';
export type TipoOrigemBiblioteca = 'pesquisa' | 'briefing' | 'copy' | 'criativo' | 'padrao' | 'aprendizado';

export type Cliente = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
}

export type Nicho = {
  id: string;
  cliente_id: string;
  nome: string;
  categoria: Categoria;
  produto: string | null;
  publico: string | null;
  ativo: boolean;
  criado_em: string;
}

export type Avatar = {
  id: string;
  nome: string;
  faixa_etaria: string | null;
  genero: string | null;
  descricao: string | null;
  dores: string[];
  desejos: string[];
  desejos_ocultos: string[];
  criado_em: string;
}

export type AvatarNicho = {
  id: string;
  avatar_id: string;
  nicho_id: string;
  principal: boolean;
}

export type Concorrente = {
  id: string;
  nicho_id: string;
  nome: string;
  url_pagina: string | null;
  url_biblioteca_anuncios: string | null;
  origem: 'manual' | 'descoberto';
  status: StatusConcorrente;
  monitorado: boolean;
  ultima_verificacao: string | null;
  criado_em: string;
}

export type AnuncioEspionado = {
  id: string;
  nicho_id: string;
  concorrente_id: string | null;
  plataforma: 'meta' | 'tiktok' | 'youtube' | 'instagram' | 'spy_tool' | 'outro';
  url: string | null;
  titulo: string | null;
  copy_texto: string | null;
  transcricao: string | null;
  url_pagina_venda: string | null;
  transcricao_vsl: string | null;
  tipo_pagina: 'vsl' | 'advertorial' | 'quiz' | 'longform' | null;
  primeira_veiculacao: string | null;
  dias_em_veiculacao: number | null;
  num_variacoes: number | null;
  escalado: boolean;
  coletado_via: 'auto' | 'manual';
  capturado_em: string;
}

export type Pesquisa = {
  id: string;
  nicho_id: string;
  tipo: TipoPesquisa;
  origem: OrigemPesquisa;
  titulo: string | null;
  resumo: string | null;
  relatorio: string | null;
  status: StatusPesquisa;
  feedback_usuario: string | null;
  criado_em: string;
  aprovado_em: string | null;
}

export type FontePesquisa = {
  id: string;
  pesquisa_id: string;
  tipo: TipoFonte;
  url: string | null;
  titulo: string | null;
  conteudo_extraido: string | null;
  transcricao: string | null;
  comentarios: Array<{ autor?: string; texto: string; likes?: number }>;
  coletado_via: 'auto' | 'manual';
  criado_em: string;
}

export type Padrao = {
  id: string;
  pesquisa_id: string | null;
  nicho_id: string;
  avatar_id: string | null;
  tipo: TipoPadrao;
  descricao: string;
  frequencia: number;
  forca_evidencia: ForcaEvidencia;
  porque_funciona: string | null;
  potencial_teste: PotencialTeste;
  criado_em: string;
}

export type Briefing = {
  id: string;
  nicho_id: string;
  pesquisa_id: string | null;
  titulo: string;
  contexto_mercado: string | null;
  decisao_estrategica: string;
  justificativa_psicologica: string | null;
  conteudo: string | null;
  status: StatusBriefing;
  feedback_usuario: string | null;
  criado_em: string;
  aprovado_em: string | null;
}

export type Leva = {
  id: string;
  briefing_id: string | null;
  nicho_id: string;
  nome: string;
  objetivo: string | null;
  quantidade_prevista: number;
  status: StatusLeva;
  data_inicio: string | null;
  data_fim: string | null;
  veredito: string | null;
  criado_em: string;
}

export type Hipotese = {
  id: string;
  leva_id: string;
  numero: number;
  descricao: string;
  linha: LinhaHipotese;
  padrao_origem_id: string | null;
  avatar_id: string | null;
  angulo: string | null;
  formato: string | null;
  dor_alvo: string | null;
  justificativa: string | null;
  resultado: ResultadoHipotese;
  aprendizado: string | null;
  avaliado_em: string | null;
}

export type Copy = {
  id: string;
  nicho_id: string;
  leva_id: string | null;
  hipotese_id: string | null;
  tipo: TipoCopy;
  modo: ModoEscrita;
  copy_referencia_id: string | null;
  anuncio_referencia_id: string | null;
  titulo: string;
  conteudo: string;
  versao: number;
  status: StatusCopy;
  feedback_usuario: string | null;
  criado_em: string;
}

export type Criativo = {
  id: string;
  nicho_id: string;
  copy_id: string | null;
  leva_id: string | null;
  hipotese_id: string | null;
  nome_criativo: string;
  angulo: string | null;
  formato: string | null;
  avatar_id: string | null;
  legenda: string | null;
  trilha_sonora: string | null;
  data_subida: string | null;
  status: StatusCriativo;
  observacoes: string | null;
  criado_em: string;
}

export type Importacao = {
  id: string;
  nicho_id: string;
  tipo: TipoImportacao;
  conteudo_bruto: string | null;
  linhas_processadas: number;
  linhas_nao_reconhecidas: LinhaNaoReconhecida[];
  criado_em: string;
}

export type LinhaNaoReconhecida = {
  nome_criativo: string;
  dados: Record<string, unknown>;
  motivo: string;
}

export type Metrica = {
  id: string;
  criativo_id: string;
  importacao_id: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  investimento: number | null;
  cpa: number | null;
  cpl: number | null;
  roas: number | null;
  ctr: number | null;
  hook_rate: number | null;
  cpm: number | null;
  cpc: number | null;
  leads: number | null;
  vendas: number | null;
  receita: number | null;
  criado_em: string;
}

export type Aprendizado = {
  id: string;
  escopo: EscopoAprendizado;
  nicho_id: string | null;
  categoria: Categoria | null;
  avatar_id: string | null;
  tipo: TipoAprendizado;
  afirmacao: string;
  porque: string | null;
  evidencia: string[];
  n_amostras: number;
  confianca: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type Sugestao = {
  id: string;
  nicho_id: string | null;
  tipo: TipoSugestao;
  conteudo: string;
  justificativa: string | null;
  aprendizado_id: string | null;
  status: StatusSugestao;
  criado_em: string;
}

export type Aprovacao = {
  id: string;
  entidade: 'pesquisa' | 'briefing' | 'copy';
  entidade_id: string;
  decisao: 'aprovado' | 'recusado';
  feedback: string | null;
  criado_em: string;
}

export type Job = {
  id: string;
  tipo: TipoJob;
  nicho_id: string | null;
  status: StatusJob;
  log: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
}

export type BibliotecaIndex = {
  id: string;
  tipo_origem: TipoOrigemBiblioteca;
  origem_id: string;
  cliente_id: string | null;
  nicho_id: string | null;
  titulo: string;
  resumo: string | null;
  tags: string[];
  resultado_resumo: string | null;
  criado_em: string;
}

/** Formato mÃ­nimo exigido por @supabase/supabase-js >=2.4x para cada tabela do schema. */
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      clientes: Table<Cliente>;
      nichos: Table<Nicho>;
      avatares: Table<Avatar>;
      avatar_nicho: Table<AvatarNicho>;
      concorrentes: Table<Concorrente>;
      anuncios_espionados: Table<AnuncioEspionado>;
      pesquisas: Table<Pesquisa>;
      fontes_pesquisa: Table<FontePesquisa>;
      padroes: Table<Padrao>;
      briefings: Table<Briefing>;
      levas: Table<Leva>;
      hipoteses: Table<Hipotese>;
      copies: Table<Copy>;
      criativos: Table<Criativo>;
      importacoes: Table<Importacao>;
      metricas: Table<Metrica>;
      aprendizados: Table<Aprendizado>;
      sugestoes: Table<Sugestao>;
      aprovacoes: Table<Aprovacao>;
      jobs: Table<Job>;
      biblioteca_index: Table<BibliotecaIndex>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
