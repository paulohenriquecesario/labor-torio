import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Hipotese, ResultadoHipotese, EscopoAprendizado, TipoAprendizado } from '@/types/database';
import { askClaudeJson } from '@/lib/claude';
import { calcularConfianca, recalcularComNovaAmostra } from '@/lib/aprendizado/confianca';
import { inferirEscopo } from '@/lib/aprendizado/escopo';

const SYSTEM_APRENDIZ = `Você é o agente APRENDIZ do LABORATÓRIO. Recebe uma hipótese que foi apostada
em uma leva de testes e o resultado real de performance observado, e produz aprendizados reutilizáveis.

Classifique o tipo de cada aprendizado:
- 'performance': um número/resultado específico deste nicho (nunca propague para fora dele).
- 'psicologia': algo sobre o avatar, a promessa ou a dor que se comportou de forma consistente —
  decida se isso deveria circular para toda a categoria (dor/desejo) do nicho, ou especificamente
  para qualquer nicho que compartilhe o mesmo avatar (mais específico e mais forte quando aplicável).
- 'estrutura': algo sobre a estrutura de copy, gancho, retenção ou formato — sempre global.
- 'processo': algo sobre como o PRÓPRIO SISTEMA decidiu (ex: "hipóteses de réplica de padrão validam
  mais que hipóteses de exploração psicológica neste tipo de nicho") — sempre global.

Seja conservador: só gere um aprendizado quando o resultado realmente sustenta uma afirmação
generalizável. Um único teste positivo não vira "regra" — diga isso na explicação (porque).`;

const SCHEMA = {
  type: 'object',
  properties: {
    classificacao: { type: 'string', enum: ['validada', 'refutada', 'inconclusiva'] },
    resumo_para_hipotese: { type: 'string', description: 'Frase curta registrada na própria hipótese.' },
    aprendizados: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['performance', 'psicologia', 'estrutura', 'processo'] },
          afirmacao: { type: 'string' },
          porque: { type: 'string' },
          propagar_por: {
            type: 'string',
            enum: ['categoria', 'avatar'],
            description: 'Só relevante quando tipo=psicologia: por onde este aprendizado deve circular.',
          },
        },
        required: ['tipo', 'afirmacao'],
      },
    },
  },
  required: ['classificacao', 'resumo_para_hipotese', 'aprendizados'],
} as const;

interface AvaliacaoGerada {
  classificacao: ResultadoHipotese;
  resumo_para_hipotese: string;
  aprendizados: { tipo: TipoAprendizado; afirmacao: string; porque?: string; propagar_por?: 'categoria' | 'avatar' }[];
}

const ROAS_VALIDACAO = 2;
const ROAS_REFUTACAO = 1;
const AMOSTRAS_MINIMAS = 3; // leads/vendas somados; abaixo disso, resultado é sempre inconclusivo

/**
 * Job pós-importação (requisito 75): reavalia toda hipótese pendente do nicho que já tenha
 * métricas suficientes em seus criativos, confrontando aposta × resultado real.
 */
export async function reavaliarAprendizado(
  supabase: SupabaseClient<Database>,
  nichoId: string,
): Promise<{ hipotesesAvaliadas: number; aprendizadosGerados: number; sugestoesGeradas: number }> {
  const { data: nicho, error: errNicho } = await supabase.from('nichos').select('*').eq('id', nichoId).single();
  if (errNicho || !nicho) throw errNicho ?? new Error('Nicho não encontrado');

  const { data: levas } = await supabase.from('levas').select('id').eq('nicho_id', nichoId);
  const levaIds = (levas ?? []).map((l) => l.id);
  if (levaIds.length === 0) return { hipotesesAvaliadas: 0, aprendizadosGerados: 0, sugestoesGeradas: 0 };

  const { data: hipoteses, error: errHip } = await supabase
    .from('hipoteses')
    .select('*')
    .in('leva_id', levaIds)
    .eq('resultado', 'pendente');
  if (errHip) throw errHip;

  let aprendizadosGerados = 0;
  let sugestoesGeradas = 0;
  let hipotesesAvaliadas = 0;

  for (const hipotese of hipoteses ?? []) {
    const { data: criativos } = await supabase.from('criativos').select('id').eq('hipotese_id', hipotese.id);
    if (!criativos || criativos.length === 0) continue;

    const criativoIds = criativos.map((c) => c.id);
    const { data: metricas } = await supabase
      .from('metricas')
      .select('*')
      .in('criativo_id', criativoIds);
    if (!metricas || metricas.length === 0) continue;

    const totalLeads = metricas.reduce((acc, m) => acc + (m.leads ?? 0), 0);
    const totalVendas = metricas.reduce((acc, m) => acc + (m.vendas ?? 0), 0);
    const amostras = totalVendas || totalLeads;
    const roasMedio = media(metricas.map((m) => m.roas).filter(isNumero));
    const cplMedio = media(metricas.map((m) => m.cpl).filter(isNumero));

    const classificacaoHeuristica: ResultadoHipotese =
      amostras < AMOSTRAS_MINIMAS
        ? 'inconclusiva'
        : roasMedio !== null && roasMedio >= ROAS_VALIDACAO
          ? 'validada'
          : roasMedio !== null && roasMedio < ROAS_REFUTACAO
            ? 'refutada'
            : 'inconclusiva';

    const avaliacao = await askClaudeJson<AvaliacaoGerada>({
      system: SYSTEM_APRENDIZ,
      prompt: `Nicho: ${nicho.nome} (categoria: ${nicho.categoria})
Hipótese apostada (nº ${hipotese.numero}): ${hipotese.descricao}
Justificativa original: ${hipotese.justificativa ?? 'n/d'}
Ângulo: ${hipotese.angulo ?? 'n/d'} · Dor-alvo: ${hipotese.dor_alvo ?? 'n/d'} · Linha: ${hipotese.linha}

Resultado real observado:
- Amostras (vendas ou leads): ${amostras}
- ROAS médio: ${roasMedio ?? 'n/d'}
- CPL médio: ${cplMedio ?? 'n/d'}
- Classificação heurística sugerida pelo sistema: ${classificacaoHeuristica} (amostras mínimas: ${AMOSTRAS_MINIMAS}, ROAS validação >= ${ROAS_VALIDACAO}, ROAS refutação < ${ROAS_REFUTACAO})

Confirme ou ajuste a classificação heurística se a evidência qualitativa contradisser o número
(ex: ROAS bom mas por um motivo alheio à hipótese testada), e gere os aprendizados aplicáveis.`,
      schema: SCHEMA,
      schemaName: 'avaliar_hipotese',
      temperature: 0.2,
    });

    await supabase
      .from('hipoteses')
      .update({
        resultado: avaliacao.classificacao,
        aprendizado: avaliacao.resumo_para_hipotese,
        avaliado_em: new Date().toISOString(),
      })
      .eq('id', hipotese.id);
    hipotesesAvaliadas += 1;

    for (const item of avaliacao.aprendizados) {
      const criado = await registrarOuAtualizarAprendizado(supabase, {
        tipo: item.tipo,
        afirmacao: item.afirmacao,
        porque: item.porque ?? null,
        nichoId,
        categoria: nicho.categoria,
        avatarId: hipotese.avatar_id,
        propagarPor: item.propagar_por,
        confirmaAprendizado: avaliacao.classificacao === 'validada',
        evidenciaId: hipotese.id,
      });
      if (criado) aprendizadosGerados += 1;
    }

    if (avaliacao.classificacao === 'validada') {
      const { error: errSug } = await supabase.from('sugestoes').insert({
        nicho_id: nichoId,
        tipo: 'variacao',
        conteudo: `Escalar variações da hipótese validada: "${hipotese.descricao}"`,
        justificativa: avaliacao.resumo_para_hipotese,
        status: 'nova',
      });
      if (!errSug) sugestoesGeradas += 1;
    }
  }

  const levasAfetadas = new Set((hipoteses ?? []).map((h) => h.leva_id));
  for (const levaId of levasAfetadas) {
    await avaliarProcessoDaLeva(supabase, levaId).catch(() => undefined);
  }

  return { hipotesesAvaliadas, aprendizadosGerados, sugestoesGeradas };
}

async function registrarOuAtualizarAprendizado(
  supabase: SupabaseClient<Database>,
  params: {
    tipo: TipoAprendizado;
    afirmacao: string;
    porque: string | null;
    nichoId: string;
    categoria: 'dor' | 'desejo';
    avatarId: string | null;
    propagarPor?: 'categoria' | 'avatar';
    confirmaAprendizado: boolean;
    evidenciaId: string;
  },
): Promise<boolean> {
  const escopoBase = inferirEscopo(params.tipo);
  let escopo: EscopoAprendizado;
  if (escopoBase === 'nicho') escopo = 'nicho';
  else if (escopoBase === 'global') escopo = 'global';
  else escopo = params.propagarPor === 'avatar' && params.avatarId ? 'avatar' : 'categoria';

  let query = supabase.from('aprendizados').select('*').eq('escopo', escopo).eq('tipo', params.tipo).eq('afirmacao', params.afirmacao);
  if (escopo === 'nicho') query = query.eq('nicho_id', params.nichoId);
  if (escopo === 'categoria') query = query.eq('categoria', params.categoria);
  if (escopo === 'avatar') query = query.eq('avatar_id', params.avatarId!);

  const { data: existente } = await query.maybeSingle();

  if (existente) {
    const { confianca, nAmostras } = recalcularComNovaAmostra(existente.confianca, existente.n_amostras, params.confirmaAprendizado);
    await supabase
      .from('aprendizados')
      .update({
        confianca,
        n_amostras: nAmostras,
        evidencia: [...(existente.evidencia ?? []), params.evidenciaId],
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', existente.id);
    return false; // atualização, não é um aprendizado novo
  }

  const confianca = calcularConfianca(1, params.confirmaAprendizado ? 1 : 0);
  const { error } = await supabase.from('aprendizados').insert({
    escopo,
    nicho_id: escopo === 'nicho' ? params.nichoId : null,
    categoria: escopo === 'categoria' ? params.categoria : null,
    avatar_id: escopo === 'avatar' ? params.avatarId : null,
    tipo: params.tipo,
    afirmacao: params.afirmacao,
    porque: params.porque,
    evidencia: [params.evidenciaId],
    n_amostras: 1,
    confianca,
    ativo: true,
  });
  return !error;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function isNumero(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/**
 * Aprendizado de processo (requisito 64): avalia a taxa de assertividade da própria leva
 * (quantas hipóteses validaram) e registra um aprendizado global tipo 'processo' quando há
 * sinal suficiente para generalizar sobre o método de briefing usado.
 */
export async function avaliarProcessoDaLeva(supabase: SupabaseClient<Database>, levaId: string): Promise<void> {
  const { data: hipoteses } = await supabase.from('hipoteses').select('*').eq('leva_id', levaId);
  if (!hipoteses || hipoteses.length === 0) return;

  const avaliadas = hipoteses.filter((h) => h.resultado !== 'pendente');
  if (avaliadas.length < hipoteses.length) return; // só avalia processo quando a leva fechou

  const validadas = avaliadas.filter((h) => h.resultado === 'validada');
  const taxaAssertividade = validadas.length / avaliadas.length;

  const porLinha = agruparPorLinha(avaliadas);

  const afirmacao = `Nesta leva, hipóteses da linha '${
    porLinha.replica >= porLinha.psicologia ? 'réplica do padrão' : 'psicologia'
  }' tiveram taxa de validação mais alta (assertividade geral: ${Math.round(taxaAssertividade * 100)}%).`;

  await registrarOuAtualizarAprendizado(supabase, {
    tipo: 'processo', // escopo resolvido para 'global' por inferirEscopo(); nichoId/categoria/avatarId abaixo são ignorados
    afirmacao,
    porque: `Réplica do padrão validou ${porLinha.replica}/${porLinha.totalReplica || 1}; psicologia validou ${porLinha.psicologia}/${porLinha.totalPsicologia || 1}.`,
    nichoId: '',
    categoria: 'dor',
    avatarId: null,
    confirmaAprendizado: taxaAssertividade >= 0.5,
    evidenciaId: levaId,
  });
}

function agruparPorLinha(hipoteses: Hipotese[]) {
  const replica = hipoteses.filter((h) => h.linha === 'replica_padrao');
  const psicologia = hipoteses.filter((h) => h.linha === 'psicologia');
  return {
    replica: replica.filter((h) => h.resultado === 'validada').length,
    totalReplica: replica.length,
    psicologia: psicologia.filter((h) => h.resultado === 'validada').length,
    totalPsicologia: psicologia.length,
  };
}
