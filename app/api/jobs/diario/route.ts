import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { executarPesquisa } from '@/lib/agentes/pesquisador';
import { descobrirConcorrentes } from '@/lib/agentes/analista';
import { coletarPagina } from '@/lib/coletores/pagina';

export const maxDuration = 300;

/**
 * Cron diário (requisitos 21, 74): executa pesquisa e espionagem automática para cada
 * nicho ativo, gera relatório com status 'aguardando_aprovacao', monitora concorrentes
 * cadastrados e descobre novos players. Protegido por CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: nichos, error } = await supabase.from('nichos').select('*').eq('ativo', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resultados = [];

  for (const nicho of nichos ?? []) {
    const { data: job } = await supabase
      .from('jobs')
      .insert({ tipo: 'pesquisa_diaria', nicho_id: nicho.id, status: 'rodando', iniciado_em: new Date().toISOString() })
      .select()
      .single();

    if (!job) {
      resultados.push({ nichoId: nicho.id, status: 'erro', erro: 'Falha ao registrar job' });
      continue;
    }

    try {
      const termo = [nicho.nome, nicho.produto].filter(Boolean).join(' — ');
      const { pesquisaId } = await executarPesquisa(supabase, {
        nichoId: nicho.id,
        tipo: 'diaria',
        origem: 'automatica',
        termoBusca: termo,
      });

      await monitorarConcorrentes(supabase, nicho.id);
      const { sugeridos } = await descobrirConcorrentes(supabase, pesquisaId).catch(() => ({ sugeridos: 0 }));

      await supabase
        .from('jobs')
        .update({ status: 'concluido', finalizado_em: new Date().toISOString(), log: `pesquisaId=${pesquisaId} concorrentesSugeridos=${sugeridos}` })
        .eq('id', job.id);

      resultados.push({ nichoId: nicho.id, pesquisaId, sugeridos, status: 'concluido' });
    } catch (err) {
      await supabase
        .from('jobs')
        .update({ status: 'erro', finalizado_em: new Date().toISOString(), log: (err as Error).message })
        .eq('id', job.id);
      resultados.push({ nichoId: nicho.id, status: 'erro', erro: (err as Error).message });
    }
  }

  return NextResponse.json({ nichosProcessados: resultados.length, resultados });
}

async function monitorarConcorrentes(supabase: ReturnType<typeof createServiceClient>, nichoId: string) {
  const { data: concorrentes } = await supabase
    .from('concorrentes')
    .select('*')
    .eq('nicho_id', nichoId)
    .eq('status', 'ativo')
    .eq('monitorado', true);

  for (const concorrente of concorrentes ?? []) {
    const url = concorrente.url_biblioteca_anuncios || concorrente.url_pagina;
    if (!url) continue;
    try {
      const pagina = await coletarPagina(url);
      await supabase.from('anuncios_espionados').insert({
        nicho_id: nichoId,
        concorrente_id: concorrente.id,
        plataforma: 'outro',
        url,
        titulo: pagina.titulo,
        copy_texto: pagina.texto.slice(0, 4000),
        coletado_via: 'auto',
      });
      await supabase.from('concorrentes').update({ ultima_verificacao: new Date().toISOString() }).eq('id', concorrente.id);
    } catch {
      // concorrente pode bloquear scraping (Meta/TikTok) — segue para o próximo,
      // esse conteúdo depende de coleta manual pelo usuário.
    }
  }
}
