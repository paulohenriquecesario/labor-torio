/**
 * Coletor de YouTube: busca, comentários e (via transcricao.ts) legendas.
 * Usa a YouTube Data API v3 quando YOUTUBE_API_KEY está configurada — modo
 * recomendado, com resultados e cotas confiáveis. Sem a chave, cai para um
 * scraping best-effort da página de busca pública (menos confiável, sujeito
 * a mudanças de layout do YouTube).
 */

export interface YoutubeVideo {
  videoId: string;
  titulo: string;
  canal: string;
  url: string;
}

export interface YoutubeComentario {
  autor: string;
  texto: string;
  likes: number;
}

export async function buscarYoutube(termo: string, limite = 8): Promise<YoutubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) return buscarComApi(termo, limite, apiKey);
  return buscarComScraping(termo, limite);
}

async function buscarComApi(termo: string, limite: number, apiKey: string): Promise<YoutubeVideo[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limite}&q=${encodeURIComponent(
    termo,
  )}&relevanceLanguage=pt&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube Data API falhou (${res.status})`);
  const json = await res.json();
  return (json.items ?? []).map((item: any) => ({
    videoId: item.id.videoId,
    titulo: item.snippet.title,
    canal: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

async function buscarComScraping(termo: string, limite: number): Promise<YoutubeVideo[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`YouTube search (scraping) falhou (${res.status})`);
  const html = await res.text();

  const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents ?? [];

  const videos: YoutubeVideo[] = [];
  for (const item of contents) {
    const v = item.videoRenderer;
    if (!v) continue;
    videos.push({
      videoId: v.videoId,
      titulo: v.title?.runs?.[0]?.text ?? '',
      canal: v.ownerText?.runs?.[0]?.text ?? '',
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
    });
    if (videos.length >= limite) break;
  }
  return videos;
}

/** Comentários exigem a Data API — sem chave, retorna lista vazia (fonte marcada como indisponível pelo pesquisador). */
export async function buscarComentariosYoutube(videoId: string, limite = 20): Promise<YoutubeComentario[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&maxResults=${limite}&order=relevance&videoId=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items ?? []).map((item: any) => {
    const snippet = item.snippet.topLevelComment.snippet;
    return { autor: snippet.authorDisplayName, texto: snippet.textDisplay, likes: snippet.likeCount ?? 0 };
  });
}
