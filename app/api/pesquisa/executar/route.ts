import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executarPesquisa } from '@/lib/agentes/pesquisador';
import type { TipoPesquisa, TipoFonte } from '@/types/database';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const { nichoId, tipo, termoBusca, linksManuais } = body as {
    nichoId: string;
    tipo: TipoPesquisa;
    termoBusca: string;
    linksManuais?: { tipo: TipoFonte; url: string }[];
  };

  if (!nichoId || !tipo || !termoBusca) {
    return NextResponse.json({ error: 'nichoId, tipo e termoBusca são obrigatórios' }, { status: 400 });
  }

  try {
    const resultado = await executarPesquisa(supabase, {
      nichoId,
      tipo,
      origem: 'manual',
      termoBusca,
      linksManuais,
    });
    return NextResponse.json(resultado);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
