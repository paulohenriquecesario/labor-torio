import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseTextoLivre } from '@/lib/parsers/textoLivre';
import { reavaliarAprendizado } from '@/lib/agentes/aprendiz';
import type { TipoImportacao, LinhaNaoReconhecida } from '@/types/database';

const CAMPOS_NUMERICOS = ['investimento', 'cpa', 'cpl', 'roas', 'ctr', 'hook_rate', 'cpm', 'cpc', 'leads', 'vendas', 'receita'] as const;

interface LinhaNormalizada {
  nome_criativo: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  [campo: string]: string | number | undefined;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const { nichoId, tipo, linhas, texto } = body as {
    nichoId: string;
    tipo: TipoImportacao;
    linhas?: Record<string, string>[];
    texto?: string;
  };

  if (!nichoId || !tipo) return NextResponse.json({ error: 'nichoId e tipo são obrigatórios' }, { status: 400 });

  try {
    let linhasNormalizadas: LinhaNormalizada[] = [];

    if (tipo === 'texto') {
      if (!texto) return NextResponse.json({ error: 'texto é obrigatório para tipo=texto' }, { status: 400 });
      const extraidas = await parseTextoLivre(texto);
      linhasNormalizadas = extraidas.map((l) => ({ ...l }));
    } else {
      if (!linhas?.length) return NextResponse.json({ error: 'linhas é obrigatório para csv/planilha' }, { status: 400 });
      linhasNormalizadas = linhas.map((linha) => normalizarLinha(linha));
    }

    const { data: criativos, error: errCriativos } = await supabase
      .from('criativos')
      .select('id, nome_criativo')
      .eq('nicho_id', nichoId);
    if (errCriativos) throw errCriativos;

    const mapaCriativos = new Map((criativos ?? []).map((c) => [normalizarNome(c.nome_criativo), c.id]));

    const naoReconhecidas: LinhaNaoReconhecida[] = [];
    const metricasParaInserir: Record<string, unknown>[] = [];

    for (const linha of linhasNormalizadas) {
      const criativoId = mapaCriativos.get(normalizarNome(linha.nome_criativo ?? ''));
      if (!criativoId) {
        naoReconhecidas.push({
          nome_criativo: linha.nome_criativo ?? '(sem nome)',
          dados: linha,
          motivo: 'Nenhum criativo cadastrado com este nome_criativo',
        });
        continue;
      }
      metricasParaInserir.push({
        criativo_id: criativoId,
        periodo_inicio: linha.periodo_inicio || null,
        periodo_fim: linha.periodo_fim || null,
        investimento: linha.investimento ?? null,
        cpa: linha.cpa ?? null,
        cpl: linha.cpl ?? null,
        roas: linha.roas ?? null,
        ctr: linha.ctr ?? null,
        hook_rate: linha.hook_rate ?? null,
        cpm: linha.cpm ?? null,
        cpc: linha.cpc ?? null,
        leads: linha.leads ?? null,
        vendas: linha.vendas ?? null,
        receita: linha.receita ?? null,
      });
    }

    const { data: importacao, error: errImportacao } = await supabase
      .from('importacoes')
      .insert({
        nicho_id: nichoId,
        tipo,
        conteudo_bruto: texto ?? JSON.stringify(linhas),
        linhas_processadas: metricasParaInserir.length,
        linhas_nao_reconhecidas: naoReconhecidas,
      })
      .select()
      .single();
    if (errImportacao || !importacao) throw errImportacao ?? new Error('Falha ao registrar importação');

    if (metricasParaInserir.length > 0) {
      const { error: errMetricas } = await supabase
        .from('metricas')
        .insert(metricasParaInserir.map((m) => ({ ...m, importacao_id: importacao.id })));
      if (errMetricas) throw errMetricas;
    }

    let reavaliacao = null;
    if (metricasParaInserir.length > 0) {
      reavaliacao = await reavaliarAprendizado(supabase, nichoId);
    }

    return NextResponse.json({
      importacaoId: importacao.id,
      linhasProcessadas: metricasParaInserir.length,
      linhasNaoReconhecidas: naoReconhecidas,
      reavaliacao,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** Vincula manualmente uma linha órfã a um criativo existente (requisito 50). */
export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { importacaoId, index, criativoId, nichoId } = (await request.json()) as {
    importacaoId: string;
    index: number;
    criativoId: string;
    nichoId: string;
  };

  const { data: importacao, error } = await supabase.from('importacoes').select('*').eq('id', importacaoId).single();
  if (error || !importacao) return NextResponse.json({ error: 'Importação não encontrada' }, { status: 404 });

  const linhas = [...(importacao.linhas_nao_reconhecidas as LinhaNaoReconhecida[])];
  const linha = linhas[index];
  if (!linha) return NextResponse.json({ error: 'Linha não encontrada' }, { status: 404 });

  const dados = linha.dados as LinhaNormalizada;
  await supabase.from('metricas').insert({
    criativo_id: criativoId,
    importacao_id: importacao.id,
    periodo_inicio: dados.periodo_inicio || null,
    periodo_fim: dados.periodo_fim || null,
    investimento: paraNumero(dados.investimento),
    cpa: paraNumero(dados.cpa),
    cpl: paraNumero(dados.cpl),
    roas: paraNumero(dados.roas),
    ctr: paraNumero(dados.ctr),
    hook_rate: paraNumero(dados.hook_rate),
    cpm: paraNumero(dados.cpm),
    cpc: paraNumero(dados.cpc),
    leads: paraNumero(dados.leads),
    vendas: paraNumero(dados.vendas),
    receita: paraNumero(dados.receita),
  });

  linhas.splice(index, 1);
  await supabase
    .from('importacoes')
    .update({ linhas_nao_reconhecidas: linhas, linhas_processadas: importacao.linhas_processadas + 1 })
    .eq('id', importacaoId);

  await reavaliarAprendizado(supabase, nichoId);

  return NextResponse.json({ ok: true });
}

function normalizarNome(nome: string): string {
  return nome.trim().toLowerCase();
}

function paraNumero(valor: string | number | undefined): number | null {
  if (valor === undefined) return null;
  if (typeof valor === 'number') return valor;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

function normalizarLinha(linha: Record<string, string>): LinhaNormalizada {
  const normalizada: LinhaNormalizada = { nome_criativo: linha.nome_criativo ?? '' };
  if (linha.periodo_inicio) normalizada.periodo_inicio = linha.periodo_inicio;
  if (linha.periodo_fim) normalizada.periodo_fim = linha.periodo_fim;
  for (const campo of CAMPOS_NUMERICOS) {
    if (linha[campo] !== undefined && linha[campo] !== '') {
      normalizada[campo] = parseNumeroBR(linha[campo]);
    }
  }
  return normalizada;
}

function parseNumeroBR(valor: string): number {
  const limpo = valor.replace(/[R$\s%]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isNaN(numero) ? 0 : numero;
}
