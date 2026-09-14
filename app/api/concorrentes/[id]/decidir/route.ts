import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Aceitar ou ignorar um concorrente sugerido pela descoberta automática (requisito 13). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { decisao } = (await request.json()) as { decisao: 'aceitar' | 'ignorar' };

  const novoStatus = decisao === 'aceitar' ? 'ativo' : 'ignorado';
  const { error } = await supabase
    .from('concorrentes')
    .update({ status: novoStatus, monitorado: decisao === 'aceitar' })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: novoStatus });
}
