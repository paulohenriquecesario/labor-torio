/**
 * Parser da grade editável de "Dados" — aceita colar do clipboard (Ctrl+V),
 * que o navegador entrega como texto TSV (colunas separadas por tab, linhas
 * por quebra de linha), no mesmo formato que Excel/Google Sheets copiam.
 */

export interface CelulaGrid {
  linha: number;
  coluna: number;
  valor: string;
}

/** Converte o texto colado (TSV) em uma matriz para popular a grade a partir da célula ativa. */
export function parseClipboardParaGrid(textoColado: string): string[][] {
  return textoColado
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((linha) => linha.length > 0)
    .map((linha) => linha.split('\t'));
}

/** Converte a grade (com cabeçalho na primeira linha) de volta para objetos por linha, prontos para importar. */
export function gridParaLinhas(grid: string[][]): Record<string, string>[] {
  if (grid.length === 0) return [];
  const [cabecalho, ...linhas] = grid;
  return linhas
    .filter((linha) => linha.some((celula) => celula.trim() !== ''))
    .map((linha) => {
      const objeto: Record<string, string> = {};
      cabecalho.forEach((coluna, i) => {
        objeto[coluna.trim()] = (linha[i] ?? '').trim();
      });
      return objeto;
    });
}
