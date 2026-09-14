'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function criarAvatarEVincular(clienteId: string, nichoId: string, formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome do avatar é obrigatório');

  const faixaEtaria = String(formData.get('faixa_etaria') ?? '').trim() || null;
  const genero = String(formData.get('genero') ?? '').trim() || null;
  const descricao = String(formData.get('descricao') ?? '').trim() || null;

  const supabase = createClient();
  const { data: avatar, error } = await supabase
    .from('avatares')
    .insert({ nome, faixa_etaria: faixaEtaria, genero, descricao })
    .select()
    .single();
  if (error || !avatar) throw new Error(error?.message ?? 'Falha ao criar avatar');

  const { error: errLink } = await supabase.from('avatar_nicho').insert({ avatar_id: avatar.id, nicho_id: nichoId });
  if (errLink) throw new Error(errLink.message);

  revalidatePath(`/clientes/${clienteId}/${nichoId}/briefing`);
}

export async function vincularAvatarExistente(clienteId: string, nichoId: string, avatarId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('avatar_nicho').insert({ avatar_id: avatarId, nicho_id: nichoId });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/${nichoId}/briefing`);
}

export async function desvincularAvatar(clienteId: string, nichoId: string, avatarId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('avatar_nicho').delete().eq('avatar_id', avatarId).eq('nicho_id', nichoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/${nichoId}/briefing`);
}
