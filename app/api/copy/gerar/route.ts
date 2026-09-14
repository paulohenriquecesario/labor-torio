import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { escreverCopy } from '@/lib/agentes/copywriter';
import type { TipoCopy, ModoEscrita } from '@/types/database';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const { nichoId, tipo, modo, hipoteseId, levaId, copyReferenciaId, anuncioReferenciaId, instrucoesExtra } = body as {
    nichoId: string;
    tipo: TipoCopy;
    modo: ModoEscrita;
    hipoteseId?: string;
    levaId?: string;
    copyReferenciaId?: string;
    anuncioReferenciaId?: string;
    instrucoesExtra?: string;
  };

  if (!nichoId || !tipo || !modo) {
    return NextResponse.json({ error: 'nichoId, tipo e modo são obrigatórios' }, { status: 400 });
  }

  try {
    const resultado = await escreverCopy(supabase, {
      nichoId,
      tipo,
      modo,
      hipoteseId,
      levaId,
      copyReferenciaId,
      anuncioReferenciaId,
      instrucoesExtra,
    });
    return NextResponse.json(resultado);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
