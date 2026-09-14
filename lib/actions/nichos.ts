'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Categoria } from '@/types/database';

export async function criarNicho(clienteId: string, formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  const categoria = String(formData.get('categoria') ?? '') as Categoria;
  const produto = String(formData.get('produto') ?? '').trim() || null;
  const publico = String(formData.get('publico') ?? '').trim() || null;

  if (!nome || (categoria !== 'dor' && categoria !== 'desejo')) {
    throw new Error('Nome e categoria (dor/desejo) são obrigatórios');
  }

  const supabase = createClient();
  const { error } = await supabase.from('nichos').insert({ cliente_id: clienteId, nome, categoria, produto, publico });
  if (error) throw new Error(error.message);

  revalidatePath(`/clientes/${clienteId}`);
}

export async function alternarNichoAtivo(clienteId: string, nichoId: string, ativo: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('nichos').update({ ativo }).eq('id', nichoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}`);
}
