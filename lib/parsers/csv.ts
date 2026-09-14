import Papa from 'papaparse';

export interface LinhaMetricaBruta {
  nome_criativo: string;
  [coluna: string]: string;
}

export interface PreviewCsv {
  colunas: string[];
  linhas: LinhaMetricaBruta[];
}

/** Faz o parse do CSV cru e devolve colunas + linhas para o usuário mapear antes de confirmar. */
export function parseCsv(conteudo: string): PreviewCsv {
  const resultado = Papa.parse<Record<string, string>>(conteudo, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (resultado.errors.length > 0) {
    throw new Error(`Erro ao ler CSV: ${resultado.errors[0].message}`);
  }

  const colunas = resultado.meta.fields ?? [];
  const linhas = resultado.data.map((linha) => ({ ...linha, nome_criativo: '' })) as LinhaMetricaBruta[];

  return { colunas, linhas };
}

/**
 * Aplica o mapeamento de colunas escolhido pelo usuário (ex: "Ad Name" → nome_criativo,
 * "Spend" → investimento) e devolve linhas já normalizadas nos campos do domínio.
 */
export function aplicarMapeamento(
  linhas: Record<string, string>[],
  mapeamento: Record<string, string>, // coluna_origem -> campo_domínio
): Record<string, string>[] {
  return linhas.map((linha) => {
    const normalizada: Record<string, string> = {};
    for (const [colunaOrigem, campoDominio] of Object.entries(mapeamento)) {
      if (campoDominio) normalizada[campoDominio] = linha[colunaOrigem] ?? '';
    }
    return normalizada;
  });
}
