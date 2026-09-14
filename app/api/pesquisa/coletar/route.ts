import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { coletarPagina } from '@/lib/coletores/pagina';
import type { TipoFonte } from '@/types/database';

/**
 * Coleta avulsa de fontes bloqueadas (biblioteca de anúncios, TikTok, Instagram,
 * Amazon, ferramentas de espionagem) coladas manualmente pelo usuário, anexando
 * o material extraído a uma pesquisa já em andamento sem regenerar o relatório.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const { pesquisaId, links } = body as { pesquisaId: string; links: { tipo: TipoFonte; url: string }[] };

  if (!pesquisaId || !links?.length) {
    return NextResponse.json({ error: 'pesquisaId e links são obrigatórios' }, { status: 400 });
  }

  const resultados = await Promise.allSettled(
    links.map(async (link) => {
      const pagina = await coletarPagina(link.url);
      const { error } = await supabase.from('fontes_pesquisa').insert({
        pesquisa_id: pesquisaId,
        tipo: link.tipo,
        url: link.url,
        titulo: pagina.titulo,
        conteudo_extraido: pagina.texto,
        coletado_via: 'manual',
      });
      if (error) throw error;
      return link.url;
    }),
  );

  const falhas = resultados.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  const sucesso = resultados.length - falhas.length;

  return NextResponse.json({
    coletados: sucesso,
    falhas: falhas.map((f) => String(f.reason)),
  });
}
