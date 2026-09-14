/**
 * Coletor de Reddit via API pública JSON (sem necessidade de credenciais OAuth
 * para leitura de conteúdo público). Busca posts por termo e seus comentários
 * mais relevantes — usado para mapear dor/desejo real do avatar nas próprias
 * palavras dele.
 */

const USER_AGENT = 'laboratorio-copy-intelligence/1.0 (pesquisa de mercado)';

export interface RedditPost {
  titulo: string;
  url: string;
  texto: string;
  score: number;
  numComentarios: number;
  comentarios: { autor: string; texto: string; likes: number }[];
}

export async function buscarReddit(termo: string, limite = 8): Promise<RedditPost[]> {
  const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(termo)}&sort=relevance&limit=${limite}`;
  const res = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Reddit search falhou (${res.status})`);

  const json = await res.json();
  const posts = (json?.data?.children ?? []) as { data: any }[];

  const resultados: RedditPost[] = [];
  for (const { data } of posts) {
    const comentarios = await buscarComentarios(data.permalink).catch(() => []);
    resultados.push({
      titulo: data.title,
      url: `https://www.reddit.com${data.permalink}`,
      texto: data.selftext ?? '',
      score: data.score ?? 0,
      numComentarios: data.num_comments ?? 0,
      comentarios,
    });
  }
  return resultados;
}

async function buscarComentarios(permalink: string): Promise<{ autor: string; texto: string; likes: number }[]> {
  const url = `https://www.reddit.com${permalink}.json?limit=15&sort=top`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return [];
  const json = await res.json();
  const listing = json?.[1]?.data?.children ?? [];
  return listing
    .filter((c: any) => c.kind === 't1' && c.data?.body)
    .map((c: any) => ({ autor: c.data.author, texto: c.data.body, likes: c.data.score ?? 0 }))
    .slice(0, 15);
}
