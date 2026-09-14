import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { NovoClienteDialog } from '@/components/clientes/novo-cliente-dialog';
import { formatRoas, formatCurrencyBRL, statusPerformance, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const supabase = createClient();

  const [{ data: clientes }, { data: nichos }, { data: criativos }, { data: levas }, { data: metricas }] = await Promise.all([
    supabase.from('clientes').select('*').order('nome'),
    supabase.from('nichos').select('id, cliente_id, categoria'),
    supabase.from('criativos').select('id, nicho_id, status'),
    supabase.from('levas').select('id, nicho_id, status'),
    supabase.from('metricas').select('criativo_id, roas, cpl, periodo_fim, criado_em').order('periodo_fim', { ascending: false }),
  ]);

  const latestMetricaPorCriativo = new Map<string, { roas: number | null; cpl: number | null }>();
  for (const m of metricas ?? []) {
    if (!latestMetricaPorCriativo.has(m.criativo_id)) {
      latestMetricaPorCriativo.set(m.criativo_id, { roas: m.roas, cpl: m.cpl });
    }
  }

  const cards = (clientes ?? []).map((cliente) => {
    const nichoIds = new Set((nichos ?? []).filter((n) => n.cliente_id === cliente.id).map((n) => n.id));
    const criativosDoCliente = (criativos ?? []).filter((c) => nichoIds.has(c.nicho_id));
    const criativosNoAr = criativosDoCliente.filter((c) => c.status === 'no_ar');
    const roasValues = criativosDoCliente
      .map((c) => latestMetricaPorCriativo.get(c.id)?.roas)
      .filter((v): v is number => v !== null && v !== undefined);
    const cplValues = criativosDoCliente
      .map((c) => latestMetricaPorCriativo.get(c.id)?.cpl)
      .filter((v): v is number => v !== null && v !== undefined);
    const levasAtivas = (levas ?? []).filter((l) => nichoIds.has(l.nicho_id) && (l.status === 'em_escrita' || l.status === 'no_ar'));

    const roasMedio = roasValues.length ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length : null;
    const cplMedio = cplValues.length ? cplValues.reduce((a, b) => a + b, 0) / cplValues.length : null;

    return {
      cliente,
      criativosNoAr: criativosNoAr.length,
      roasMedio,
      cplMedio,
      levasAtivas: levasAtivas.length,
      nichosAtivos: nichoIds.size,
    };
  });

  return (
    <div className="p-xl">
      <div className="mb-lg flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Overview Executivo</p>
          <h1 className="text-[32px] font-bold tracking-tight text-text-primary">Seus clientes</h1>
        </div>
        <NovoClienteDialog />
      </div>

      {cards.length === 0 ? (
        <Card className="text-center text-text-secondary">Nenhum cliente cadastrado ainda. Crie o primeiro para começar.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ cliente, criativosNoAr, roasMedio, cplMedio, levasAtivas, nichosAtivos }) => {
            const status = statusPerformance(roasMedio);
            return (
              <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
                <Card className="h-full transition-colors hover:border-[#3A3A4A]">
                  <div className="mb-md flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold text-text-primary">{cliente.nome}</h3>
                    <Badge variant={status === 'lucro' ? 'lucro' : status === 'prejuizo' ? 'prejuizo' : 'atencao'}>
                      {status === 'lucro' ? 'Lucro' : status === 'prejuizo' ? 'Prejuízo' : 'Atenção'}
                    </Badge>
                  </div>
                  <p className="mb-md text-sm text-text-secondary">
                    {nichosAtivos} {nichosAtivos === 1 ? 'nicho ativo' : 'nichos ativos'} · {criativosNoAr} criativos no ar
                  </p>
                  <div className="grid grid-cols-2 gap-sm">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">ROAS médio</p>
                      <p
                        className={cn(
                          'font-mono text-[22px] font-semibold',
                          status === 'lucro' ? 'text-profit' : status === 'prejuizo' ? 'text-critical' : 'text-warning',
                        )}
                      >
                        {formatRoas(roasMedio)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">CPL médio</p>
                      <p className="font-mono text-[22px] font-semibold text-text-primary">{formatCurrencyBRL(cplMedio)}</p>
                    </div>
                  </div>
                  <p className="mt-md text-xs text-text-muted">{levasAtivas} leva(s) ativa(s)</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
