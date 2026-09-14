import { createClient } from '@/lib/supabase/server';
import { SugestoesList } from '@/components/sugestoes/sugestoes-list';

export const dynamic = 'force-dynamic';

export default async function SugestoesPage() {
  const supabase = createClient();
  const { data: sugestoes } = await supabase
    .from('sugestoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50);
  const { data: concorrentesSugeridos } = await supabase
    .from('concorrentes')
    .select('*')
    .eq('status', 'sugerido')
    .order('criado_em', { ascending: false });

  return (
    <div className="p-xl">
      <div className="mb-lg">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Motor Analítico</p>
        <h1 className="text-[32px] font-bold tracking-tight text-text-primary">Sugestões do Sistema</h1>
      </div>
      <SugestoesList sugestoes={sugestoes ?? []} concorrentesSugeridos={concorrentesSugeridos ?? []} />
    </div>
  );
}
