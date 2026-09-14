/**
 * Coletor de notícias via Google News RSS (público, sem chave). Cobre o
 * requisito de monitorar sites de notícia por termo de nicho/avatar.
 */

export interface NoticiaItem {
  titulo: string;
  url: string;
  fonte: string;
  publicadoEm: string;
}

export async function buscarNoticias(termo: string, limite = 10): Promise<NoticiaItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(termo)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google News RSS falhou (${res.status})`);

  const xml = await res.text();
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limite);

  return itens.map((match) => {
    const bloco = match[1];
    return {
      titulo: extrairTag(bloco, 'title'),
      url: extrairTag(bloco, 'link'),
      fonte: extrairTag(bloco, 'source'),
      publicadoEm: extrairTag(bloco, 'pubDate'),
    };
  });
}

function extrairTag(bloco: string, tag: string): string {
  const match = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return '';
  return match[1].replace('<![CDATA[', '').replace(']]>', '').trim();
}
