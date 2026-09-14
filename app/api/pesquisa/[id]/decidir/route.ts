import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reexecutarPesquisaComFeedback } from '@/lib/agentes/pesquisador';
import { analisarPesquisa } from '@/lib/agentes/analista';

/**
 * Portão de supervisão da Pesquisa (requisitos 23-24): aprovar libera a extração
 * automática de padrões (ainda dentro da mesma etapa); recusar com feedback refaz
 * o relatório considerando o que foi pedido. Nunca avança para o Briefing sozinho.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { decisao, feedback } = (await request.json()) as { decisao: 'aprovado' | 'recusado'; feedback?: string };

  await supabase.from('aprovacoes').insert({ entidade: 'pesquisa', entidade_id: params.id, decisao, feedback: feedback ?? null });

  try {
    if (decisao === 'aprovado') {
      await supabase.from('pesquisas').update({ status: 'aprovada', aprovado_em: new Date().toISOString() }).eq('id', params.id);
      const { padroesGerados } = await analisarPesquisa(supabase, params.id);
      return NextResponse.json({ status: 'aprovada', padroesGerados });
    }

    await supabase.from('pesquisas').update({ status: 'recusada', feedback_usuario: feedback ?? null }).eq('id', params.id);
    if (feedback) await reexecutarPesquisaComFeedback(supabase, params.id, feedback);
    return NextResponse.json({ status: 'aguardando_aprovacao' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
