import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reavaliarAprendizado } from '@/lib/agentes/aprendiz';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { nichoId } = (await request.json()) as { nichoId: string };
  if (!nichoId) return NextResponse.json({ error: 'nichoId é obrigatório' }, { status: 400 });

  try {
    const resultado = await reavaliarAprendizado(supabase, nichoId);
    return NextResponse.json(resultado);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
