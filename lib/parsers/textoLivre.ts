import { askClaudeJson } from '@/lib/claude';

export interface MetricaExtraida {
  nome_criativo: string;
  investimento?: number;
  cpa?: number;
  cpl?: number;
  roas?: number;
  ctr?: number;
  hook_rate?: number;
  cpm?: number;
  cpc?: number;
  leads?: number;
  vendas?: number;
  receita?: number;
}

const SCHEMA = {
  type: 'object',
  properties: {
    linhas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome_criativo: { type: 'string', description: 'Identificador do criativo exatamente como escrito no texto' },
          investimento: { type: 'number' },
          cpa: { type: 'number' },
          cpl: { type: 'number' },
          roas: { type: 'number' },
          ctr: { type: 'number', description: 'Em percentual, ex: 3.12 para 3.12%' },
          hook_rate: { type: 'number', description: 'Em percentual' },
          cpm: { type: 'number' },
          cpc: { type: 'number' },
          leads: { type: 'number' },
          vendas: { type: 'number' },
          receita: { type: 'number' },
        },
        required: ['nome_criativo'],
      },
    },
  },
  required: ['linhas'],
} as const;

const SYSTEM = `Você extrai métricas de performance de anúncios de texto livre e não estruturado,
digitado por um copywriter de resposta direta. O texto pode vir em qualquer ordem, com
abreviações comuns do mercado (CPL, CPA, ROAS, CTR, hook rate, CPM, CPC). Extraia uma linha
por criativo mencionado. Nunca invente valores que não estejam no texto — omita o campo
se não houver menção clara. Números decimais podem vir com vírgula (padrão BR); converta
sempre para ponto decimal no JSON.`;

/** Interpreta texto livre (ex: "LM-W-109 deu CPL 12,40, ROAS 2,8, hook rate 31%") em linhas estruturadas. */
export async function parseTextoLivre(texto: string): Promise<MetricaExtraida[]> {
  const resultado = await askClaudeJson<{ linhas: MetricaExtraida[] }>({
    system: SYSTEM,
    prompt: texto,
    schema: SCHEMA,
    schemaName: 'extrair_metricas',
    temperature: 0.1,
  });
  return resultado.linhas ?? [];
}
