import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TipoPadrao, ForcaEvidencia, PotencialTeste } from '@/types/database';
import { askClaudeJson } from '@/lib/claude';

const SYSTEM_ANALISTA = `Você é o agente ANALISTA do LABORATÓRIO. Recebe o relatório e as fontes brutas
de uma pesquisa de mercado já aprovada pelo copywriter e extrai padrões repetidos e acionáveis.

Tipos de padrão possíveis: avatar, dor, beneficio, desejo_oculto, formato, angulo, persona, tendencia.
Para cada padrão identificado:
- descreva-o de forma específica e testável (nunca genérica);
- explique a hipótese PSICOLÓGICA de por que ele funciona (porque_funciona);
- estime a frequência de ocorrência no material (frequencia, inteiro >= 1);
- classifique a força de evidência (alta/media/baixa) com base em quão consistente e repetido
  o sinal apareceu nas fontes, não em quão interessante parece;
- classifique o potencial de teste em tráfego pago (alto/medio/baixo).

Só registre padrões que tenham lastro real no material. Não invente. Se o material for fraco,
retorne poucos padrões (ou nenhum) em vez de forçar quantidade.`;

const SCHEMA = {
  type: 'object',
  properties: {
    padroes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['avatar', 'dor', 'beneficio', 'desejo_oculto', 'formato', 'angulo', 'persona', 'tendencia'] },
          descricao: { type: 'string' },
          frequencia: { type: 'integer', minimum: 1 },
          forca_evidencia: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          porque_funciona: { type: 'string' },
          potencial_teste: { type: 'string', enum: ['alto', 'medio', 'baixo'] },
        },
        required: ['tipo', 'descricao', 'frequencia', 'forca_evidencia', 'potencial_teste'],
      },
    },
  },
  required: ['padroes'],
} as const;

interface PadraoExtraido {
  tipo: TipoPadrao;
  descricao: string;
  frequencia: number;
  forca_evidencia: ForcaEvidencia;
  porque_funciona?: string;
  potencial_teste: PotencialTeste;
}

/** Extrai padrões de uma pesquisa aprovada e os persiste em `padroes`, isolados ao nicho da pesquisa. */
export async function analisarPesquisa(supabase: SupabaseClient<Database>, pesquisaId: string): Promise<{ padroesGerados: number }> {
  const { data: pesquisa, error } = await supabase.from('pesquisas').select('*').eq('id', pesquisaId).single();
  if (error || !pesquisa) throw error ?? new Error('Pesquisa não encontrada');
  if (pesquisa.status !== 'aprovada') {
    throw new Error('Só é possível analisar uma pesquisa aprovada pelo usuário.');
  }

  const { data: fontes } = await supabase.from('fontes_pesquisa').select('*').eq('pesquisa_id', pesquisaId);
  const materialFontes = (fontes ?? [])
    .map((f) => `[${f.tipo}] ${f.titulo ?? ''}\n${(f.conteudo_extraido ?? f.transcricao ?? '').slice(0, 1200)}`)
    .join('\n\n');

  const resultado = await askClaudeJson<{ padroes: PadraoExtraido[] }>({
    system: SYSTEM_ANALISTA,
    prompt: `Relatório da pesquisa:\n${pesquisa.relatorio}\n\nFontes brutas:\n${materialFontes}`,
    schema: SCHEMA,
    schemaName: 'registrar_padroes',
    maxTokens: 4096,
  });

  const padroes = resultado.padroes ?? [];
  if (padroes.length === 0) return { padroesGerados: 0 };

  const { error: errInsert } = await supabase.from('padroes').insert(
    padroes.map((p) => ({
      pesquisa_id: pesquisaId,
      nicho_id: pesquisa.nicho_id,
      tipo: p.tipo,
      descricao: p.descricao,
      frequencia: p.frequencia,
      forca_evidencia: p.forca_evidencia,
      porque_funciona: p.porque_funciona ?? null,
      potencial_teste: p.potencial_teste,
    })),
  );
  if (errInsert) throw errInsert;

  return { padroesGerados: padroes.length };
}

const SCHEMA_CONCORRENTES = {
  type: 'object',
  properties: {
    concorrentes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          evidencia: { type: 'string', description: 'Trecho do material que menciona esse player.' },
        },
        required: ['nome'],
      },
    },
  },
  required: ['concorrentes'],
} as const;

/**
 * Descoberta automática de novos players (requisito 12): varre o material de uma
 * pesquisa em busca de marcas/concorrentes citados que ainda não estão cadastrados
 * e os registra como sugestão (status 'sugerido'), para o usuário aceitar ou ignorar.
 */
export async function descobrirConcorrentes(supabase: SupabaseClient<Database>, pesquisaId: string): Promise<{ sugeridos: number }> {
  const { data: pesquisa, error } = await supabase.from('pesquisas').select('*').eq('id', pesquisaId).single();
  if (error || !pesquisa) throw error ?? new Error('Pesquisa não encontrada');

  const { data: existentes } = await supabase.from('concorrentes').select('nome').eq('nicho_id', pesquisa.nicho_id);
  const nomesExistentes = new Set((existentes ?? []).map((c) => c.nome.trim().toLowerCase()));

  const { data: fontes } = await supabase.from('fontes_pesquisa').select('*').eq('pesquisa_id', pesquisaId);
  const material = (fontes ?? [])
    .map((f) => `[${f.tipo}] ${f.titulo ?? ''}\n${(f.conteudo_extraido ?? f.transcricao ?? '').slice(0, 800)}`)
    .join('\n\n')
    .slice(0, 12000);
  if (!material.trim()) return { sugeridos: 0 };

  const resultado = await askClaudeJson<{ concorrentes: { nome: string; evidencia?: string }[] }>({
    system: `Você identifica marcas/concorrentes de resposta direta citados em material de pesquisa de mercado
(comentários, reviews, notícias, vídeos). Extraia apenas nomes de marca claros, nunca genéricos
("a concorrência", "outras marcas"). Ignore o produto do próprio cliente se mencionado.`,
    prompt: `Nicho: ${pesquisa.nicho_id}\n\nMaterial:\n${material}`,
    schema: SCHEMA_CONCORRENTES,
    schemaName: 'listar_concorrentes',
    temperature: 0.2,
  });

  const novos = (resultado.concorrentes ?? []).filter((c) => !nomesExistentes.has(c.nome.trim().toLowerCase()));
  if (novos.length === 0) return { sugeridos: 0 };

  const { error: errInsert } = await supabase.from('concorrentes').insert(
    novos.map((c) => ({
      nicho_id: pesquisa.nicho_id,
      nome: c.nome,
      origem: 'descoberto' as const,
      status: 'sugerido' as const,
      monitorado: false,
    })),
  );
  if (errInsert) throw errInsert;

  return { sugeridos: novos.length };
}
