import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NovoNichoDialog } from '@/components/nichos/novo-nicho-dialog';
import { formatRoas } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClienteDetalhePage({ params }: { params: { clienteId: string } }) {
  const supabase = createClient();

  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', params.clienteId).single();
  if (!cliente) notFound();

  const { data: nichos } = await supabase.from('nichos').select('*').eq('cliente_id', params.clienteId).order('criado_em');
  const nichoIds = (nichos ?? []).map((n) => n.id);

  const [{ data: criativos }, { data: levas }, { data: metricas }] = await Promise.all([
    supabase.from('criativos').select('id, nicho_id').in('nicho_id', nichoIds.length ? nichoIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('levas').select('id, nicho_id, status').in('nicho_id', nichoIds.length ? nichoIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('metricas')
      .select('criativo_id, roas, periodo_fim')
      .order('periodo_fim', { ascending: false }),
  ]);

  const latestRoasPorCriativo = new Map<string, number | null>();
  for (const m of metricas ?? []) {
    if (!latestRoasPorCriativo.has(m.criativo_id)) latestRoasPorCriativo.set(m.criativo_id, m.roas);
  }

  return (
    <div className="p-xl">
      <Link href="/clientes" className="mb-sm inline-block text-xs text-text-muted hover:text-text-primary">
        ← Clientes
      </Link>
      <div className="mb-lg flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-text-primary">{cliente.nome}</h1>
          {cliente.descricao && <p className="text-sm text-text-secondary">{cliente.descricao}</p>}
        </div>
        <NovoNichoDialog clienteId={cliente.id} />
      </div>

      {(nichos ?? []).length === 0 ? (
        <Card className="text-center text-text-secondary">Nenhum nicho cadastrado para este cliente ainda.</Card>
      ) : (
        <div className="flex flex-col gap-md">
          {(nichos ?? []).map((nicho) => {
            const criativosDoNicho = (criativos ?? []).filter((c) => c.nicho_id === nicho.id);
            const roasValues = criativosDoNicho
              .map((c) => latestRoasPorCriativo.get(c.id))
              .filter((v): v is number => v !== null && v !== undefined);
            const roasMedio = roasValues.length ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length : null;
            const levasAtivas = (levas ?? []).filter((l) => l.nicho_id === nicho.id && l.status !== 'encerrada').length;

            return (
              <Link key={nicho.id} href={`/clientes/${cliente.id}/${nicho.id}/pesquisa`}>
                <Card className="flex items-center justify-between transition-colors hover:border-[#3A3A4A]">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={nicho.categoria === 'dor' ? 'dor' : 'desejo'}>{nicho.categoria}</Badge>
                      <h3 className="text-[18px] font-semibold text-text-primary">{nicho.nome}</h3>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {nicho.produto ?? 'Sem produto vinculado'} · {levasAtivas} leva(s) em andamento
                    </p>
                  </div>
                  <div className="flex items-center gap-lg">
                    <div className="text-right">
                      <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">ROAS médio</p>
                      <p className="font-mono text-[18px] font-semibold text-text-primary">{formatRoas(roasMedio)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
