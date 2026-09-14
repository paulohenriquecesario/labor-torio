/**
 * Coletor genérico de página web: usado para páginas de venda, advertoriais
 * e qualquer URL solada manualmente pelo usuário. Faz fetch do HTML e extrai
 * o texto principal (heurística simples: remove script/style/nav/footer e
 * pega o texto visível).
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface PaginaExtraida {
  url: string;
  titulo: string;
  texto: string;
}

export async function coletarPagina(url: string): Promise<PaginaExtraida> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Falha ao buscar página (${res.status}): ${url}`);
  }

  const html = await res.text();
  return { url, titulo: extrairTitulo(html), texto: extrairTexto(html) };
}

function extrairTitulo(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeEntities(match[1]).trim() : '';
}

function extrairTexto(html: string): string {
  let limpo = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  limpo = decodeEntities(limpo);
  return limpo
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 20000); // limite defensivo para não estourar o contexto do agente
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
