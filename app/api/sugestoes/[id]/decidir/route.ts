import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Aceitar/recusar sugestão autônoma (requisito 69) — a decisão alimenta o aprendizado vinculado. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { decisao } = (await request.json()) as { decisao: 'aceita' | 'recusada' };

  const { data: sugestao, error } = await supabase
    .from('sugestoes')
    .update({ status: decisao })
    .eq('id', params.id)
    .select()
    .single();
  if (error || !sugestao) return NextResponse.json({ error: error?.message ?? 'Sugestão não encontrada' }, { status: 404 });

  if (sugestao.aprendizado_id) {
    const { data: aprendizado } = await supabase.from('aprendizados').select('*').eq('id', sugestao.aprendizado_id).single();
    if (aprendizado) {
      const bump = decisao === 'aceita' ? 0.02 : -0.05;
      await supabase
        .from('aprendizados')
        .update({ confianca: Math.min(0.97, Math.max(0, aprendizado.confianca + bump)) })
        .eq('id', aprendizado.id);
    }
  }

  return NextResponse.json({ status: decisao });
}
