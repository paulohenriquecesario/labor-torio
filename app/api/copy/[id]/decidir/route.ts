import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { corrigirCopyComFeedback } from '@/lib/agentes/copywriter';

/** Portão de revisão da Escrita (requisito 41): aprovar, recusar, ou corrigir com feedback (gera nova versão). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { decisao, feedback } = (await request.json()) as {
    decisao: 'aprovado' | 'recusado' | 'corrigir';
    feedback?: string;
  };

  await supabase
    .from('aprovacoes')
    .insert({ entidade: 'copy', entidade_id: params.id, decisao: decisao === 'corrigir' ? 'recusado' : decisao, feedback: feedback ?? null });

  try {
    if (decisao === 'aprovado') {
      await supabase.from('copies').update({ status: 'aprovada' }).eq('id', params.id);
      return NextResponse.json({ status: 'aprovada' });
    }

    if (decisao === 'corrigir') {
      if (!feedback) return NextResponse.json({ error: 'feedback é obrigatório para corrigir' }, { status: 400 });
      const resultado = await corrigirCopyComFeedback(supabase, params.id, feedback);
      return NextResponse.json({ status: 'aguardando_revisao', ...resultado });
    }

    await supabase.from('copies').update({ status: 'recusada', feedback_usuario: feedback ?? null }).eq('id', params.id);
    return NextResponse.json({ status: 'recusada' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
