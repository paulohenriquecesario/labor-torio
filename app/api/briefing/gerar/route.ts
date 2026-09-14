import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gerarBriefing } from '@/lib/agentes/estrategista';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const { nichoId, pesquisaId, nomeLeva, objetivo, quantidadePecas } = body as {
    nichoId: string;
    pesquisaId: string;
    nomeLeva: string;
    objetivo?: string;
    quantidadePecas: number;
  };

  if (!nichoId || !pesquisaId || !nomeLeva || !quantidadePecas) {
    return NextResponse.json({ error: 'nichoId, pesquisaId, nomeLeva e quantidadePecas são obrigatórios' }, { status: 400 });
  }

  try {
    const resultado = await gerarBriefing(supabase, { nichoId, pesquisaId, nomeLeva, objetivo, quantidadePecas });
    return NextResponse.json(resultado);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
