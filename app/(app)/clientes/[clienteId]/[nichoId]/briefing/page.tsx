import { createClient } from '@/lib/supabase/server';
import { BriefingPanel } from '@/components/briefing/briefing-panel';
import { AvataresPanel } from '@/components/avatares/avatares-panel';

export const dynamic = 'force-dynamic';

export default async function BriefingPage({ params }: { params: { clienteId: string; nichoId: string } }) {
  const supabase = createClient();
  const { data: nicho } = await supabase.from('nichos').select('*').eq('id', params.nichoId).single();

  const { data: avatarLinks } = await supabase.from('avatar_nicho').select('avatar_id').eq('nicho_id', params.nichoId);
  const avatarIdsVinculados = (avatarLinks ?? []).map((l) => l.avatar_id);
  const { data: todosAvatares } = await supabase.from('avatares').select('*').order('nome');
  const avataresVinculados = (todosAvatares ?? []).filter((a) => avatarIdsVinculados.includes(a.id));
  const avataresDisponiveis = (todosAvatares ?? []).filter((a) => !avatarIdsVinculados.includes(a.id));
  const { data: pesquisasAprovadas } = await supabase
    .from('pesquisas')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .eq('status', 'aprovada')
    .order('criado_em', { ascending: false });
  const { data: briefings } = await supabase
    .from('briefings')
    .select('*')
    .eq('nicho_id', params.nichoId)
    .order('criado_em', { ascending: false });

  if (!nicho) return null;

  // hipoteses vêm relacionadas via leva_id -> levas.nicho_id; buscamos separadamente para simplificar o join.
  const { data: levas } = await supabase.from('levas').select('*').eq('nicho_id', params.nichoId);
  const { data: hipotesesTodas } = await supabase
    .from('hipoteses')
    .select('*')
    .in('leva_id', (levas ?? []).map((l) => l.id).length ? (levas ?? []).map((l) => l.id) : ['00000000-0000-0000-0000-000000000000'])
    .order('numero');

  const briefingsComHipoteses = (briefings ?? []).map((b: any) => {
    const leva = (levas ?? []).find((l) => l.briefing_id === b.id);
    return {
      ...b,
      hipoteses: (hipotesesTodas ?? []).filter((h) => h.leva_id === leva?.id),
    };
  });

  return (
    <div className="flex flex-col gap-lg">
      <AvataresPanel
        clienteId={params.clienteId}
        nichoId={params.nichoId}
        avataresVinculados={avataresVinculados}
        avataresDisponiveis={avataresDisponiveis}
      />
      <BriefingPanel nicho={nicho} pesquisasAprovadas={pesquisasAprovadas ?? []} briefings={briefingsComHipoteses} />
    </div>
  );
}
