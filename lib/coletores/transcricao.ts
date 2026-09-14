/**
 * Transcrição de vídeo/áudio.
 *
 * - YouTube: usa o endpoint público de legendas (timedtext). Funciona sem
 *   chave para vídeos com legenda (automática ou manual) em pt/en.
 * - Upload manual (áudio/vídeo sem legenda, ex. VSL baixada de uma spy tool):
 *   delega para um provedor de speech-to-text externo configurável via
 *   TRANSCRICAO_API_URL/TRANSCRICAO_API_KEY (ex: um endpoint Whisper). Sem
 *   essas variáveis configuradas, lança erro explícito — a Anthropic API não
 *   faz ASR, então este ponto de integração precisa de um provedor dedicado.
 */

export async function transcreverYoutube(videoId: string, idiomas = ['pt', 'pt-BR', 'en']): Promise<string> {
  for (const lang of idiomas) {
    const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const xml = await res.text();
    if (!xml.trim()) continue;
    return extrairTextoTimedtext(xml);
  }
  return '';
}

function extrairTextoTimedtext(xml: string): string {
  const trechos = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  return trechos
    .map((m) =>
      m[1]
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, ''),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function transcreverArquivo(fileUrl: string): Promise<string> {
  const endpoint = process.env.TRANSCRICAO_API_URL;
  if (!endpoint) {
    throw new Error(
      'Nenhum provedor de transcrição configurado (TRANSCRICAO_API_URL). ' +
        'Configure um endpoint de speech-to-text para transcrever arquivos fora do YouTube.',
    );
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.TRANSCRICAO_API_KEY ? { Authorization: `Bearer ${process.env.TRANSCRICAO_API_KEY}` } : {}),
    },
    body: JSON.stringify({ url: fileUrl }),
  });

  if (!res.ok) throw new Error(`Provedor de transcrição falhou (${res.status})`);
  const json = await res.json();
  return json.texto ?? json.text ?? '';
}
