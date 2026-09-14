import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reexecutarBriefingComFeedback } from '@/lib/agentes/estrategista';

/** Portão de supervisão do Briefing (requisito 35). Aprovar libera a leva para a Escrita. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { decisao, feedback } = (await request.json()) as { decisao: 'aprovado' | 'recusado'; feedback?: string };

  await supabase.from('aprovacoes').insert({ entidade: 'briefing', entidade_id: params.id, decisao, feedback: feedback ?? null });

  try {
    if (decisao === 'aprovado') {
      const { data: briefing } = await supabase
        .from('briefings')
        .update({ status: 'aprovado', aprovado_em: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single();
      if (briefing) await supabase.from('levas').update({ status: 'em_escrita' }).eq('briefing_id', briefing.id);
      return NextResponse.json({ status: 'aprovado' });
    }

    await supabase.from('briefings').update({ status: 'recusado', feedback_usuario: feedback ?? null }).eq('id', params.id);
    if (feedback) await reexecutarBriefingComFeedback(supabase, params.id, feedback);
    return NextResponse.json({ status: 'aguardando_aprovacao' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
