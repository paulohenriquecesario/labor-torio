/**
 * Coletor de Google Trends via endpoint público não-oficial (mesmo usado pelo
 * widget embutido do próprio Trends). Não requer chave, mas não é um contrato
 * estável — se a Google mudar o endpoint, este coletor deve ser atualizado.
 */

export interface PontoTendencia {
  data: string;
  valor: number;
}

export async function buscarGoogleTrends(termo: string, geo = 'BR'): Promise<PontoTendencia[]> {
  const exploreUrl = `https://trends.google.com/trends/api/explore?hl=pt-BR&tz=180&req=${encodeURIComponent(
    JSON.stringify({
      comparisonItem: [{ keyword: termo, geo, time: 'today 3-m' }],
      category: 0,
      property: '',
    }),
  )}`;

  const exploreRes = await fetch(exploreUrl);
  if (!exploreRes.ok) throw new Error(`Google Trends explore falhou (${exploreRes.status})`);
  const exploreText = (await exploreRes.text()).replace(")]}',", '');
  const exploreJson = JSON.parse(exploreText);

  const widget = exploreJson.widgets?.find((w: any) => w.id === 'TIMESERIES');
  if (!widget) return [];

  const timelineUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=pt-BR&tz=180&req=${encodeURIComponent(
    JSON.stringify(widget.request),
  )}&token=${widget.token}`;

  const timelineRes = await fetch(timelineUrl);
  if (!timelineRes.ok) throw new Error(`Google Trends timeline falhou (${timelineRes.status})`);
  const timelineText = (await timelineRes.text()).replace(")]}',", '');
  const timelineJson = JSON.parse(timelineText);

  const pontos = timelineJson?.default?.timelineData ?? [];
  return pontos.map((p: any) => ({ data: p.formattedTime, valor: p.value?.[0] ?? 0 }));
}
