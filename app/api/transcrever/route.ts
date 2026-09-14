import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcreverYoutube, transcreverArquivo } from '@/lib/coletores/transcricao';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const { videoId, fileUrl } = body as { videoId?: string; fileUrl?: string };

  try {
    if (videoId) {
      const texto = await transcreverYoutube(videoId);
      return NextResponse.json({ texto });
    }
    if (fileUrl) {
      const texto = await transcreverArquivo(fileUrl);
      return NextResponse.json({ texto });
    }
    return NextResponse.json({ error: 'Informe videoId ou fileUrl' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
