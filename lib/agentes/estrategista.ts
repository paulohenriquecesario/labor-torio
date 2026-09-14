import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, LinhaHipotese } from '@/types/database';
import { askClaude, askClaudeJson } from '@/lib/claude';
import { buscarAprendizadosAplicaveis, buscarHipotesesRefutadas } from '@/lib/aprendizado/escopo';

const SYSTEM_ESTRATEGISTA = `Você é o agente ESTRATEGISTA do LABORATÓRIO. Monta o briefing e a leva de
testes de um nicho de resposta direta. Regra inegociável (requisito 34 do sistema): você NUNCA propõe
uma hipótese sem lastro em um padrão identificado na pesquisa ou em um aprendizado interno já validado.
Toda hipótese cita explicitamente de onde veio.

Gere hipóteses em duas linhas, conforme pedido pelo copywriter:
- 'replica_padrao': repete um padrão de mercado já validado externamente, adaptado ao produto/avatar do cliente.
- 'psicologia': explora a mesma raiz psicológica do padrão, mas com um ângulo, formato ou mecanismo diferente.

Nunca repita uma hipótese da lista de "hipóteses já refutadas" para este nicho/avatar — isso já foi
testado e não funcionou. Se um aprendizado interno contradiz um padrão de mercado, priorize o
aprendizado interno (é evidência de primeira mão, mais forte que espionagem de concorrente).`;

const SCHEMA_BRIEFING = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    contexto_mercado: { type: 'string' },
    decisao_estrategica: { type: 'string', description: 'O que vamos testar nesta leva e por quê, em 2-4 frases.' },
    justificativa_psicologica: { type: 'string' },
    hipoteses: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          descricao: { type: 'string', description: 'Frase de hipótese testável, no formato "Se X, então Y sobe/desce Z"' },
          linha: { type: 'string', enum: ['replica_padrao', 'psicologia'] },
          angulo: { type: 'string' },
          formato: { type: 'string' },
          dor_alvo: { type: 'string' },
          justificativa: { type: 'string', description: 'Cite explicitamente o padrão ou aprendizado de origem.' },
          padrao_origem_descricao: { type: 'string', description: 'Copie a descrição exata do padrão da lista fornecida, se aplicável.' },
        },
        required: ['descricao', 'linha', 'justificativa'],
      },
    },
  },
  required: ['titulo', 'decisao_estrategica', 'hipoteses'],
} as const;

interface HipoteseGerada {
  descricao: string;
  linha: LinhaHipotese;
  angulo?: string;
  formato?: string;
  dor_alvo?: string;
  justificativa: string;
  padrao_origem_descricao?: string;
}

interface BriefingGerado {
  titulo: string;
  contexto_mercado?: string;
  decisao_estrategica: string;
  justificativa_psicologica?: string;
  hipoteses: HipoteseGerada[];
}

export interface GerarBriefingInput {
  nichoId: string;
  pesquisaId: string;
  nomeLeva: string;
  objetivo?: string;
  quantidadePecas: number;
}

/**
 * Consulta aprendizados aplicáveis (nicho + categoria + avatar + global) e padrões
 * identificados ANTES de decidir, monta o briefing + leva + hipóteses, e grava com
 * status 'aguardando_aprovacao'. Nunca avança sozinho para a Escrita.
 */
export async function gerarBriefing(
  supabase: SupabaseClient<Database>,
  input: GerarBriefingInput,
): Promise<{ briefingId: string; levaId: string }> {
  const { nichoId, pesquisaId, nomeLeva, objetivo, quantidadePecas } = input;

  const { data: nicho, error: errNicho } = await supabase.from('nichos').select('*').eq('id', nichoId).single();
  if (errNicho || !nicho) throw errNicho ?? new Error('Nicho não encontrado');

  const { data: avatarLinks } = await supabase.from('avatar_nicho').select('avatar_id').eq('nicho_id', nichoId);
  const avatarIds = (avatarLinks ?? []).map((a) => a.avatar_id);

  const { data: pesquisa, error: errPesquisa } = await supabase.from('pesquisas').select('*').eq('id', pesquisaId).single();
  if (errPesquisa || !pesquisa) throw errPesquisa ?? new Error('Pesquisa não encontrada');
  if (pesquisa.status !== 'aprovada') throw new Error('A pesquisa precisa estar aprovada antes de gerar o briefing.');

  const { data: padroes, error: errPadroes } = await supabase
    .from('padroes')
    .select('*')
    .eq('nicho_id', nichoId)
    .order('criado_em', { ascending: false })
    .limit(30);
  if (errPadroes) throw errPadroes;

  const [aprendizados, refutadas] = await Promise.all([
    buscarAprendizadosAplicaveis(supabase, { nichoId, categoria: nicho.categoria, avatarIds }),
    buscarHipotesesRefutadas(supabase, { nichoId, avatarIds }),
  ]);

  const prompt = `Nicho: ${nicho.nome} (categoria: ${nicho.categoria})
Produto: ${nicho.produto ?? '(não informado)'}
Público: ${nicho.publico ?? '(não informado)'}
Objetivo da leva: ${objetivo ?? '(não informado)'}
Quantidade de peças desejada: ${quantidadePecas}

Relatório da pesquisa aprovada:
${pesquisa.relatorio}

Padrões identificados disponíveis para lastrear hipóteses:
${(padroes ?? []).map((p, i) => `${i + 1}. [${p.tipo} · evidência ${p.forca_evidencia}] ${p.descricao} — por que funciona: ${p.porque_funciona ?? 'n/d'}`).join('\n') || '(nenhum padrão registrado ainda para este nicho)'}

Aprendizados internos aplicáveis (nicho, categoria "${nicho.categoria}", avatar e globais):
${aprendizados.map((a, i) => `${i + 1}. [escopo ${a.escopo} · confiança ${Math.round(a.confianca * 100)}%] ${a.afirmacao}`).join('\n') || '(nenhum aprendizado interno ainda — priorize padrões de mercado)'}

Hipóteses já refutadas para este nicho/avatar — NÃO REPETIR:
${refutadas.map((r, i) => `${i + 1}. ${r.descricao}`).join('\n') || '(nenhuma)'}

Gere o briefing e exatamente ${quantidadePecas} hipóteses para a leva "${nomeLeva}".`;

  const gerado = await askClaudeJson<BriefingGerado>({
    system: SYSTEM_ESTRATEGISTA,
    prompt,
    schema: SCHEMA_BRIEFING,
    schemaName: 'gerar_briefing',
    maxTokens: 4096,
  });

  const { data: briefing, error: errBriefing } = await supabase
    .from('briefings')
    .insert({
      nicho_id: nichoId,
      pesquisa_id: pesquisaId,
      titulo: gerado.titulo,
      contexto_mercado: gerado.contexto_mercado ?? null,
      decisao_estrategica: gerado.decisao_estrategica,
      justificativa_psicologica: gerado.justificativa_psicologica ?? null,
      conteudo: montarConteudoMarkdown(gerado),
      status: 'aguardando_aprovacao',
    })
    .select()
    .single();
  if (errBriefing || !briefing) throw errBriefing ?? new Error('Falha ao criar briefing');

  const { data: leva, error: errLeva } = await supabase
    .from('levas')
    .insert({
      briefing_id: briefing.id,
      nicho_id: nichoId,
      nome: nomeLeva,
      objetivo: objetivo ?? null,
      quantidade_prevista: gerado.hipoteses.length,
      status: 'planejada',
    })
    .select()
    .single();
  if (errLeva || !leva) throw errLeva ?? new Error('Falha ao criar leva');

  const padroesPorDescricao = new Map((padroes ?? []).map((p) => [p.descricao, p.id]));

  const { error: errHipoteses } = await supabase.from('hipoteses').insert(
    gerado.hipoteses.map((h, index) => ({
      leva_id: leva.id,
      numero: index + 1,
      descricao: h.descricao,
      linha: h.linha,
      padrao_origem_id: h.padrao_origem_descricao ? padroesPorDescricao.get(h.padrao_origem_descricao) ?? null : null,
      avatar_id: avatarIds[0] ?? null,
      angulo: h.angulo ?? null,
      formato: h.formato ?? null,
      dor_alvo: h.dor_alvo ?? null,
      justificativa: h.justificativa,
      resultado: 'pendente' as const,
    })),
  );
  if (errHipoteses) throw errHipoteses;

  return { briefingId: briefing.id, levaId: leva.id };
}

/** Reexecuta o briefing considerando o feedback de recusa do usuário. */
export async function reexecutarBriefingComFeedback(
  supabase: SupabaseClient<Database>,
  briefingId: string,
  feedback: string,
): Promise<void> {
  const { data: briefing, error } = await supabase.from('briefings').select('*').eq('id', briefingId).single();
  if (error || !briefing) throw error ?? new Error('Briefing não encontrado');

  await supabase.from('briefings').update({ status: 'rascunho', feedback_usuario: feedback }).eq('id', briefingId);

  const ajustado = await askClaude({
    system: SYSTEM_ESTRATEGISTA,
    prompt: `O usuário recusou este briefing com o feedback: "${feedback}".\n\nBriefing anterior:\n${briefing.conteudo}\n\nReescreva a decisão estratégica e a justificativa psicológica considerando o feedback. Mantenha o mesmo formato de texto corrido em markdown.`,
    maxTokens: 2000,
  });

  await supabase
    .from('briefings')
    .update({ conteudo: ajustado, status: 'aguardando_aprovacao' })
    .eq('id', briefingId);
}

function montarConteudoMarkdown(g: BriefingGerado): string {
  const linhas = [
    `# ${g.titulo}`,
    g.contexto_mercado ? `## Contexto de mercado\n${g.contexto_mercado}` : '',
    `## Decisão estratégica\n${g.decisao_estrategica}`,
    g.justificativa_psicologica ? `## Justificativa psicológica\n${g.justificativa_psicologica}` : '',
    `## Hipóteses\n${g.hipoteses
      .map((h, i) => `${i + 1}. **[${h.linha}]** ${h.descricao}\n   - Justificativa: ${h.justificativa}`)
      .join('\n')}`,
  ];
  return linhas.filter(Boolean).join('\n\n');
}
