import { createClient } from '@/lib/supabase/server';
import { CriativosManager } from '@/components/dados/criativos-manager';
import { ImportarMetricas } from '@/components/dados/importar-metricas';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRoas, formatCurrencyBRL } from '@/lib/utils';
import type { LinhaNaoReconhecida } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DadosPage({ params }: { params: { clienteId: string; nichoId: string } }) {
  const supabase = createClient();

  const { data: criativos } = await supabase
    .from('criativos')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .order('criado_em', { ascending: false });

  const criativoIds = (criativos ?? []).map((c) => c.id);
  const { data: metricas } = await supabase
    .from('metricas')
    .select('*')
    .in('criativo_id', criativoIds.length ? criativoIds : ['00000000-0000-0000-0000-000000000000'])
    .order('periodo_fim', { ascending: false });

  const latestPorCriativo = new Map<string, { roas: number | null; cpl: number | null }>();
  for (const m of metricas ?? []) {
    if (!latestPorCriativo.has(m.criativo_id)) latestPorCriativo.set(m.criativo_id, { roas: m.roas, cpl: m.cpl });
  }

  const criativosComMetrica = (criativos ?? []).map((c) => ({
    ...c,
    roas: latestPorCriativo.get(c.id)?.roas ?? null,
    cpl: latestPorCriativo.get(c.id)?.cpl ?? null,
  }));

  const { data: ultimaImportacao } = await supabase
    .from('importacoes')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  const linhasNaoReconhecidas = (ultimaImportacao?.linhas_nao_reconhecidas as LinhaNaoReconhecida[]) ?? [];

  const cruzamentoAngulo = agruparMedia(criativosComMetrica, 'angulo');
  const cruzamentoFormato = agruparMedia(criativosComMetrica, 'formato');

  return (
    <div className="flex flex-col gap-lg">
      <ImportarMetricas
        nichoId={params.nichoId}
        criativos={criativos ?? []}
        linhasNaoReconhecidas={linhasNaoReconhecidas}
        importacaoId={ultimaImportacao?.id ?? null}
      />

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <CruzamentoCard titulo="Desempenho por ângulo" dados={cruzamentoAngulo} />
        <CruzamentoCard titulo="Desempenho por formato" dados={cruzamentoFormato} />
      </div>

      <CriativosManager clienteId={params.clienteId} nichoId={params.nichoId} criativos={criativosComMetrica} />
    </div>
  );
}

function agruparMedia<T extends { roas: number | null; cpl: number | null }>(
  itens: T[],
  campo: 'angulo' | 'formato',
): { chave: string; roasMedio: number | null; cplMedio: number | null; n: number }[] {
  const grupos = new Map<string, { roas: number[]; cpl: number[] }>();
  for (const item of itens) {
    const chave = (item as any)[campo] ?? '(sem valor)';
    if (!grupos.has(chave)) grupos.set(chave, { roas: [], cpl: [] });
    const grupo = grupos.get(chave)!;
    if (item.roas !== null) grupo.roas.push(item.roas);
    if (item.cpl !== null) grupo.cpl.push(item.cpl);
  }
  return [...grupos.entries()]
    .map(([chave, { roas, cpl }]) => ({
      chave,
      roasMedio: roas.length ? roas.reduce((a, b) => a + b, 0) / roas.length : null,
      cplMedio: cpl.length ? cpl.reduce((a, b) => a + b, 0) / cpl.length : null,
      n: roas.length,
    }))
    .sort((a, b) => (b.roasMedio ?? 0) - (a.roasMedio ?? 0));
}

function CruzamentoCard({ titulo, dados }: { titulo: string; dados: ReturnType<typeof agruparMedia> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-sm">
        {dados.length === 0 && <p className="text-sm text-text-secondary">Sem dados suficientes ainda.</p>}
        {dados.map((d) => (
          <div key={d.chave} className="flex items-center justify-between border-b border-stroke py-2 last:border-b-0">
            <span className="text-sm text-text-primary">{d.chave}</span>
            <span className="font-mono text-sm text-text-secondary">
              {formatRoas(d.roasMedio)} · {formatCurrencyBRL(d.cplMedio)} · {d.n} criativo(s)
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
