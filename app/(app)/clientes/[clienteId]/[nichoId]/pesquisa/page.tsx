import { createClient } from '@/lib/supabase/server';
import { PesquisaPanel } from '@/components/pesquisa/pesquisa-panel';

export const dynamic = 'force-dynamic';

export default async function PesquisaPage({ params }: { params: { nichoId: string } }) {
  const supabase = createClient();
  const { data: nicho } = await supabase.from('nichos').select('*').eq('id', params.nichoId).single();
  const { data: pesquisas } = await supabase
    .from('pesquisas')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .order('criado_em', { ascending: false });

  if (!nicho) return null;

  return <PesquisaPanel nicho={nicho} pesquisas={pesquisas ?? []} />;
}
