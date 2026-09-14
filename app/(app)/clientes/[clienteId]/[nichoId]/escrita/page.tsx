import { createClient } from '@/lib/supabase/server';
import { EscritaPanel } from '@/components/escrita/escrita-panel';

export const dynamic = 'force-dynamic';

export default async function EscritaPage({ params }: { params: { nichoId: string } }) {
  const supabase = createClient();
  const { data: nicho } = await supabase.from('nichos').select('*').eq('id', params.nichoId).single();
  if (!nicho) return null;

  const { data: levas } = await supabase.from('levas').select('id').eq('nicho_id', params.nichoId);
  const levaIds = (levas ?? []).map((l) => l.id);

  const { data: hipoteses } = await supabase
    .from('hipoteses')
    .select('*')
    .in('leva_id', levaIds.length ? levaIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('resultado', 'pendente')
    .order('numero');

  const { data: anunciosEspionados } = await supabase
    .from('anuncios_espionados')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .order('capturado_em', { ascending: false })
    .limit(30);

  const { data: copies } = await supabase
    .from('copies')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .order('criado_em', { ascending: false });

  return (
    <EscritaPanel
      nicho={nicho}
      hipotesesDisponiveis={hipoteses ?? []}
      anunciosEspionados={anunciosEspionados ?? []}
      copies={copies ?? []}
    />
  );
}
