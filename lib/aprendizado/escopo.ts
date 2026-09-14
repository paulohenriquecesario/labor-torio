import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Aprendizado, Categoria } from '@/types/database';

/**
 * Regra central de propagação (requisitos 56-62):
 * - escopo 'nicho'      → só vale para o próprio nicho.
 * - escopo 'categoria'  → circula entre nichos da MESMA categoria (dor↔dor, desejo↔desejo).
 * - escopo 'avatar'     → circula entre QUALQUER nicho que compartilhe o mesmo avatar.
 * - escopo 'global'     → vale para todos os nichos e categorias.
 *
 * Métricas e padrões de mercado (tabelas `metricas` e `padroes`) nunca entram aqui:
 * elas são sempre filtradas por nicho_id na origem, nunca propagadas.
 */
export async function buscarAprendizadosAplicaveis(
  supabase: SupabaseClient<Database>,
  params: { nichoId: string; categoria: Categoria; avatarIds: string[] },
): Promise<Aprendizado[]> {
  const { nichoId, categoria, avatarIds } = params;

  const orFilters = [
    `and(escopo.eq.nicho,nicho_id.eq.${nichoId})`,
    `and(escopo.eq.categoria,categoria.eq.${categoria})`,
    'escopo.eq.global',
  ];
  if (avatarIds.length > 0) {
    orFilters.push(`and(escopo.eq.avatar,avatar_id.in.(${avatarIds.join(',')}))`);
  }

  const { data, error } = await supabase
    .from('aprendizados')
    .select('*')
    .eq('ativo', true)
    .or(orFilters.join(','))
    .order('confianca', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Aprendizado[];
}

/**
 * Hipóteses já refutadas bloqueiam repetição para o mesmo avatar/nicho (requisito 62).
 * Retorna o conjunto de afirmações refutadas relevantes, para o Estrategista excluir
 * do espaço de busca antes de propor uma nova hipótese.
 */
export async function buscarHipotesesRefutadas(
  supabase: SupabaseClient<Database>,
  params: { nichoId: string; avatarIds: string[] },
): Promise<{ descricao: string; angulo: string | null; dorAlvo: string | null }[]> {
  const { nichoId, avatarIds } = params;

  const { data: levasDoNicho, error: errLevas } = await supabase
    .from('levas')
    .select('id')
    .eq('nicho_id', nichoId);
  if (errLevas) throw errLevas;
  const levaIds = (levasDoNicho ?? []).map((l) => l.id);

  let query = supabase
    .from('hipoteses')
    .select('descricao, angulo, dor_alvo, avatar_id, leva_id')
    .eq('resultado', 'refutada');

  if (levaIds.length === 0 && avatarIds.length === 0) return [];

  const orParts: string[] = [];
  if (levaIds.length > 0) orParts.push(`leva_id.in.(${levaIds.join(',')})`);
  if (avatarIds.length > 0) orParts.push(`avatar_id.in.(${avatarIds.join(',')})`);
  query = query.or(orParts.join(','));

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((h) => ({ descricao: h.descricao, angulo: h.angulo, dorAlvo: h.dor_alvo }));
}

/** Determina o escopo correto de um novo aprendizado a partir do seu tipo (requisitos 55-60). */
export function inferirEscopo(tipo: Aprendizado['tipo']): 'nicho' | 'categoria_ou_avatar' | 'global' {
  if (tipo === 'performance') return 'nicho';
  if (tipo === 'estrutura' || tipo === 'processo') return 'global';
  return 'categoria_ou_avatar'; // 'psicologia' → avatar/promessa/dor: escopo categoria ou avatar
}
