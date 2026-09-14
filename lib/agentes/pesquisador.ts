import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TipoPesquisa, OrigemPesquisa, TipoFonte } from '@/types/database';
import { askClaude } from '@/lib/claude';
import { buscarGoogleTrends } from '@/lib/coletores/trends';
import { buscarNoticias } from '@/lib/coletores/noticias';
import { buscarReddit } from '@/lib/coletores/reddit';
import { buscarYoutube, buscarComentariosYoutube } from '@/lib/coletores/youtube';
import { transcreverYoutube } from '@/lib/coletores/transcricao';
import { coletarPagina } from '@/lib/coletores/pagina';

export interface LinkManual {
  tipo: TipoFonte;
  url: string;
}

export interface ExecutarPesquisaInput {
  nichoId: string;
  tipo: TipoPesquisa;
  origem: OrigemPesquisa;
  termoBusca: string; // geralmente nome do nicho + produto/dor/desejo
  linksManuais?: LinkManual[];
}

const SYSTEM_PESQUISADOR = `Você é o agente PESQUISADOR do LABORATÓRIO, um sistema de inteligência de copy
de performance para marketing de resposta direta. Você recebe material bruto coletado
de múltiplas fontes (tendências de busca, notícias, Reddit, YouTube, páginas de venda,
anúncios espionados) sobre um nicho específico e produz um relatório executivo em markdown,
direto e sem enrolação, no tom "cirúrgico" do sistema: técnico, afiado, sem gordura.

O relatório deve conter, quando o material sustentar:
- Síntese executiva (3-5 frases) do que mudou ou se destacou.
- Padrões de linguagem, dor e desejo nas palavras reais do avatar (cite trechos).
- Ângulos e ganchos que aparecem com mais força/repetição.
- Sinais de saturação ou de oportunidade inexplorada.
Nunca invente dado que não esteja no material fornecido. Se uma fonte não trouxe nada
relevante, diga isso brevemente em vez de preencher com generalidades.`;

interface MaterialColetado {
  fontesParaPersistir: Omit<Database['public']['Tables']['fontes_pesquisa']['Insert'], 'pesquisa_id'>[];
  materialBruto: string;
}

/**
 * Executa a etapa de Pesquisa dentro do portão de supervisão: roda os coletores
 * automáticos aplicáveis ao tipo de pesquisa, incorpora os links colados manualmente
 * pelo usuário, sintetiza tudo em um relatório e grava com status 'aguardando_aprovacao'.
 * Nunca avança sozinho para o Briefing — isso depende da aprovação do usuário na UI.
 */
export async function executarPesquisa(
  supabase: SupabaseClient<Database>,
  input: ExecutarPesquisaInput,
): Promise<{ pesquisaId: string }> {
  const { nichoId, tipo, origem, termoBusca, linksManuais = [] } = input;

  const { data: pesquisa, error: errInsert } = await supabase
    .from('pesquisas')
    .insert({ nicho_id: nichoId, tipo, origem, titulo: `Pesquisa ${tipo} · ${termoBusca}`, status: 'rodando' })
    .select()
    .single();
  if (errInsert || !pesquisa) throw errInsert ?? new Error('Falha ao criar pesquisa');

  try {
    const material = await coletarMaterial(tipo, termoBusca, linksManuais);

    if (material.fontesParaPersistir.length > 0) {
      const { error: errFontes } = await supabase
        .from('fontes_pesquisa')
        .insert(material.fontesParaPersistir.map((f) => ({ ...f, pesquisa_id: pesquisa.id })));
      if (errFontes) throw errFontes;
    }

    const relatorio = await askClaude({
      system: SYSTEM_PESQUISADOR,
      prompt: `Nicho: ${termoBusca}\nTipo de pesquisa: ${tipo}\n\nMaterial coletado:\n${material.materialBruto || '(nenhuma fonte automática retornou conteúdo; considere apenas os links manuais anexados, se houver)'}`,
      maxTokens: 3000,
    });

    const resumo = relatorio.split('\n').find((l) => l.trim().length > 0)?.slice(0, 240) ?? null;

    const { error: errUpdate } = await supabase
      .from('pesquisas')
      .update({ relatorio, resumo, status: 'aguardando_aprovacao' })
      .eq('id', pesquisa.id);
    if (errUpdate) throw errUpdate;

    return { pesquisaId: pesquisa.id };
  } catch (err) {
    await supabase.from('pesquisas').update({ status: 'erro' }).eq('id', pesquisa.id);
    throw err;
  }
}

/** Reexecuta a pesquisa considerando o feedback de recusa do usuário (requisito 24). */
export async function reexecutarPesquisaComFeedback(
  supabase: SupabaseClient<Database>,
  pesquisaId: string,
  feedback: string,
): Promise<void> {
  const { data: pesquisa, error } = await supabase.from('pesquisas').select('*').eq('id', pesquisaId).single();
  if (error || !pesquisa) throw error ?? new Error('Pesquisa não encontrada');

  await supabase.from('pesquisas').update({ status: 'rodando', feedback_usuario: feedback }).eq('id', pesquisaId);

  const relatorioAjustado = await askClaude({
    system: SYSTEM_PESQUISADOR,
    prompt: `O usuário recusou o relatório anterior com o seguinte feedback: "${feedback}".\n\nRelatório anterior:\n${pesquisa.relatorio}\n\nReescreva o relatório considerando o feedback. Se o feedback pedir uma fonte ou ângulo que não está no material original, sinalize isso explicitamente em vez de inventar.`,
    maxTokens: 3000,
  });

  await supabase
    .from('pesquisas')
    .update({ relatorio: relatorioAjustado, status: 'aguardando_aprovacao' })
    .eq('id', pesquisaId);
}

async function coletarMaterial(
  tipo: TipoPesquisa,
  termoBusca: string,
  linksManuais: LinkManual[],
): Promise<MaterialColetado> {
  const fontes: Omit<Database['public']['Tables']['fontes_pesquisa']['Insert'], 'pesquisa_id'>[] = [];
  const blocosTexto: string[] = [];

  const rodaAuto = tipo === 'completa' || tipo === 'mercado' || tipo === 'organico' || tipo === 'diaria';
  const rodaAvatar = tipo === 'completa' || tipo === 'avatar' || tipo === 'diaria';

  if (rodaAuto) {
    await Promise.allSettled([
      buscarGoogleTrends(termoBusca).then((pontos) => {
        if (pontos.length === 0) return;
        blocosTexto.push(`### Google Trends\n${pontos.map((p) => `${p.data}: ${p.valor}`).join(', ')}`);
        fontes.push({
          tipo: 'google_trends',
          titulo: `Tendência de busca: ${termoBusca}`,
          conteudo_extraido: JSON.stringify(pontos),
          comentarios: [],
          coletado_via: 'auto',
        });
      }),
      buscarNoticias(termoBusca).then((itens) => {
        if (itens.length === 0) return;
        blocosTexto.push(
          `### Notícias\n${itens.map((n) => `- [${n.fonte}] ${n.titulo} (${n.publicadoEm})`).join('\n')}`,
        );
        for (const item of itens) {
          fontes.push({ tipo: 'noticia', url: item.url, titulo: item.titulo, comentarios: [], coletado_via: 'auto' });
        }
      }),
    ]);
  }

  if (rodaAvatar) {
    await Promise.allSettled([
      buscarReddit(termoBusca).then((posts) => {
        if (posts.length === 0) return;
        blocosTexto.push(
          `### Reddit\n${posts
            .map(
              (p) =>
                `**${p.titulo}** (score ${p.score})\n${p.texto.slice(0, 500)}\nComentários mais relevantes:\n${p.comentarios
                  .slice(0, 5)
                  .map((c) => `- "${c.texto.slice(0, 300)}"`)
                  .join('\n')}`,
            )
            .join('\n\n')}`,
        );
        for (const post of posts) {
          fontes.push({
            tipo: 'reddit',
            url: post.url,
            titulo: post.titulo,
            conteudo_extraido: post.texto,
            comentarios: post.comentarios,
            coletado_via: 'auto',
          });
        }
      }),
      buscarYoutube(termoBusca).then(async (videos) => {
        if (videos.length === 0) return;
        const detalhados = await Promise.all(
          videos.slice(0, 4).map(async (v) => {
            const [transcricao, comentarios] = await Promise.all([
              transcreverYoutube(v.videoId).catch(() => ''),
              buscarComentariosYoutube(v.videoId).catch(() => []),
            ]);
            return { ...v, transcricao, comentarios };
          }),
        );
        blocosTexto.push(
          `### YouTube\n${detalhados
            .map(
              (v) =>
                `**${v.titulo}** (${v.canal})\nTranscrição (trecho): ${v.transcricao.slice(0, 800) || '(sem legenda disponível)'}\nComentários: ${v.comentarios
                  .slice(0, 5)
                  .map((c) => `"${c.texto.slice(0, 200)}"`)
                  .join(' | ')}`,
            )
            .join('\n\n')}`,
        );
        for (const v of detalhados) {
          fontes.push({
            tipo: 'youtube',
            url: v.url,
            titulo: v.titulo,
            transcricao: v.transcricao || null,
            comentarios: v.comentarios,
            coletado_via: 'auto',
          });
        }
      }),
    ]);
  }

  if (linksManuais.length > 0) {
    const resultados = await Promise.allSettled(
      linksManuais.map(async (link) => {
        const pagina = await coletarPagina(link.url);
        return { link, pagina };
      }),
    );
    for (const r of resultados) {
      if (r.status !== 'fulfilled') continue;
      const { link, pagina } = r.value;
      blocosTexto.push(`### Material manual (${link.tipo})\n${pagina.titulo}\n${pagina.texto.slice(0, 1500)}`);
      fontes.push({
        tipo: link.tipo,
        url: link.url,
        titulo: pagina.titulo,
        conteudo_extraido: pagina.texto,
        comentarios: [],
        coletado_via: 'manual',
      });
    }
  }

  return { fontesParaPersistir: fontes, materialBruto: blocosTexto.join('\n\n') };
}
