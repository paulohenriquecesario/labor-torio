'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function criarCriativo(clienteId: string, nichoId: string, formData: FormData) {
  const nomeCriativo = String(formData.get('nome_criativo') ?? '').trim();
  if (!nomeCriativo) throw new Error('nome_criativo é obrigatório');

  const angulo = String(formData.get('angulo') ?? '').trim() || null;
  const formato = String(formData.get('formato') ?? '').trim() || null;
  const legenda = String(formData.get('legenda') ?? '').trim() || null;
  const trilhaSonora = String(formData.get('trilha_sonora') ?? '').trim() || null;

  const supabase = createClient();
  const { error } = await supabase.from('criativos').insert({
    nicho_id: nichoId,
    nome_criativo: nomeCriativo,
    angulo,
    formato,
    legenda,
    trilha_sonora: trilhaSonora,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Já existe um criativo com o nome "${nomeCriativo}". Nomes de criativo devem ser únicos.`);
    }
    throw new Error(error.message);
  }

  revalidatePath(`/clientes/${clienteId}/${nichoId}/dados`);
}
