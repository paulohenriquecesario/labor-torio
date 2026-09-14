'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function criarCliente(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim() || null;
  if (!nome) throw new Error('Nome é obrigatório');

  const supabase = createClient();
  const { error } = await supabase.from('clientes').insert({ nome, descricao });
  if (error) throw new Error(error.message);

  revalidatePath('/clientes');
}

export async function alternarClienteAtivo(clienteId: string, ativo: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('clientes').update({ ativo }).eq('id', clienteId);
  if (error) throw new Error(error.message);
  revalidatePath('/clientes');
}
