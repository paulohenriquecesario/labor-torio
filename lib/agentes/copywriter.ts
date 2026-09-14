import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TipoCopy, ModoEscrita } from '@/types/database';
import { askClaude } from '@/lib/claude';
import { buscarAprendizadosAplicaveis } from '@/lib/aprendizado/escopo';

const SYSTEM_COPYWRITER = `Você é o agente COPYWRITER do LABORATÓRIO. Escreve peças de resposta direta
(VSL, microlead, lead, anúncio, gancho) com foco EXCLUSIVO em performance e conversão — nunca em estética
ou em "soar bonito". Cada frase precisa ter um trabalho: prender atenção, construir crença, remover
objeção, ou empurrar para a ação. Aplique a psicologia do avatar alvo como contexto obrigatório: fale a
língua dele, ataque a dor ou o desejo real que os aprendizados e a hipótese indicam.

Nunca decore. Nunca use jargão de marketing genérico ("transforme sua vida", "resultados incríveis")
sem mecanismo concreto por trás. Se a hipótese e os aprendizados não sustentam uma alegação, não a faça.`;

const INSTRUCOES_MODO: Record<ModoEscrita, string> = {
  zero: 'Escreva do zero, sem se basear em nenhuma peça existente — apenas na hipótese e nos aprendizados.',
  variacao: 'Crie uma variação direta da copy de referência: mesma estrutura e mecanismo, mudando hook, prova ou CTA para testar uma variável isolada.',
  modelagem_estrutura: 'Modele a ESTRUTURA INVISÍVEL da copy/anúncio de referência (a sequência de blocos persuasivos e o ritmo), mas reescreva 100% do texto para este produto/avatar — não reaproveite frases.',
  modelagem_nicho: 'Modele a mesma estrutura da referência, mas troque completamente o nicho/dor/desejo pelo deste produto — é uma transposição cross-nicho.',
  variacao_dor: 'Mantenha a estrutura da referência, mas explore uma dor diferente da que ela usava como gancho principal.',
  variacao_curiosidade: 'Mantenha a estrutura da referência, mas reescreva o gancho para maximizar curiosidade/loop aberto em vez do ângulo original.',
};

export interface EscreverCopyInput {
  nichoId: string;
  tipo: TipoCopy;
  modo: ModoEscrita;
  hipoteseId?: string;
  levaId?: string;
  copyReferenciaId?: string;
  anuncioReferenciaId?: string;
  instrucoesExtra?: string;
}

export async function escreverCopy(
  supabase: SupabaseClient<Database>,
  input: EscreverCopyInput,
): Promise<{ copyId: string }> {
  const { nichoId, tipo, modo, hipoteseId, levaId, copyReferenciaId, anuncioReferenciaId, instrucoesExtra } = input;

  const { data: nicho, error: errNicho } = await supabase.from('nichos').select('*').eq('id', nichoId).single();
  if (errNicho || !nicho) throw errNicho ?? new Error('Nicho não encontrado');

  const { data: avatarLinks } = await supabase.from('avatar_nicho').select('avatar_id').eq('nicho_id', nichoId);
  const avatarIds = (avatarLinks ?? []).map((a) => a.avatar_id);

  let hipotese = null;
  if (hipoteseId) {
    const { data } = await supabase.from('hipoteses').select('*').eq('id', hipoteseId).single();
    hipotese = data;
  }

  let referenciaTexto = '';
  if (copyReferenciaId) {
    const { data: ref } = await supabase.from('copies').select('*').eq('id', copyReferenciaId).single();
    if (ref) referenciaTexto = `Copy de referência (${ref.tipo}):\n${ref.conteudo}`;
  } else if (anuncioReferenciaId) {
    const { data: ref } = await supabase.from('anuncios_espionados').select('*').eq('id', anuncioReferenciaId).single();
    if (ref) {
      referenciaTexto = `Anúncio espionado de referência:\nTítulo: ${ref.titulo ?? ''}\nCopy: ${ref.copy_texto ?? ''}\nTranscrição VSL: ${(ref.transcricao_vsl ?? ref.transcricao ?? '').slice(0, 3000)}`;
    }
  }

  const aprendizados = await buscarAprendizadosAplicaveis(supabase, { nichoId, categoria: nicho.categoria, avatarIds });

  const prompt = `Nicho: ${nicho.nome} (${nicho.categoria})
Produto: ${nicho.produto ?? '(não informado)'}
Público: ${nicho.publico ?? '(não informado)'}
Tipo de peça a escrever: ${tipo}
Modo: ${modo} — ${INSTRUCOES_MODO[modo]}

Hipótese a testar: ${hipotese ? `${hipotese.descricao}\nJustificativa: ${hipotese.justificativa ?? ''}\nÂngulo: ${hipotese.angulo ?? 'livre'} · Dor-alvo: ${hipotese.dor_alvo ?? 'livre'}` : '(sem hipótese vinculada — use o melhor julgamento com base nos aprendizados)'}

Aprendizados do avatar-alvo e do nicho a respeitar como contexto obrigatório:
${aprendizados.map((a) => `- [${a.escopo}] ${a.afirmacao}`).join('\n') || '(nenhum aprendizado interno ainda)'}

${referenciaTexto}

${instrucoesExtra ? `Instruções adicionais do copywriter humano: ${instrucoesExtra}` : ''}

Escreva a peça completa, pronta para gravação/publicação, em português do Brasil. Estruture com marcações
claras de bloco (ex: [HOOK 0-3s], [QUEBRA DE PADRÃO], [MECANISMO], [CTA]) quando o tipo de peça pedir roteiro.`;

  const conteudo = await askClaude({ system: SYSTEM_COPYWRITER, prompt, maxTokens: 3000, temperature: 0.8 });

  const titulo = `${tipo.toUpperCase()} · ${nicho.nome}${hipotese ? ` · H${hipotese.numero}` : ''}`;

  const { data: copy, error } = await supabase
    .from('copies')
    .insert({
      nicho_id: nichoId,
      leva_id: levaId ?? null,
      hipotese_id: hipoteseId ?? null,
      tipo,
      modo,
      copy_referencia_id: copyReferenciaId ?? null,
      anuncio_referencia_id: anuncioReferenciaId ?? null,
      titulo,
      conteudo,
      versao: 1,
      status: 'aguardando_revisao',
    })
    .select()
    .single();
  if (error || !copy) throw error ?? new Error('Falha ao criar copy');

  return { copyId: copy.id };
}

/** Corrige uma copy existente a partir do feedback de revisão do usuário, criando uma nova versão. */
export async function corrigirCopyComFeedback(
  supabase: SupabaseClient<Database>,
  copyId: string,
  feedback: string,
): Promise<{ copyId: string }> {
  const { data: anterior, error } = await supabase.from('copies').select('*').eq('id', copyId).single();
  if (error || !anterior) throw error ?? new Error('Copy não encontrada');

  await supabase.from('copies').update({ status: 'recusada', feedback_usuario: feedback }).eq('id', copyId);

  const conteudoCorrigido = await askClaude({
    system: SYSTEM_COPYWRITER,
    prompt: `O copywriter humano revisou esta peça e pediu o seguinte ajuste: "${feedback}".\n\nPeça anterior (${anterior.tipo}):\n${anterior.conteudo}\n\nReescreva a peça completa já incorporando o ajuste pedido, mantendo tudo que funcionava.`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  const { data: nova, error: errNova } = await supabase
    .from('copies')
    .insert({
      nicho_id: anterior.nicho_id,
      leva_id: anterior.leva_id,
      hipotese_id: anterior.hipotese_id,
      tipo: anterior.tipo,
      modo: anterior.modo,
      copy_referencia_id: anterior.copy_referencia_id,
      anuncio_referencia_id: anterior.anuncio_referencia_id,
      titulo: anterior.titulo,
      conteudo: conteudoCorrigido,
      versao: anterior.versao + 1,
      status: 'aguardando_revisao',
    })
    .select()
    .single();
  if (errNova || !nova) throw errNova ?? new Error('Falha ao criar nova versão da copy');

  return { copyId: nova.id };
}
