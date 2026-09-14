import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { TipoOrigemBiblioteca } from '@/types/database';

export const dynamic = 'force-dynamic';

const TIPOS_VALIDOS: TipoOrigemBiblioteca[] = ['pesquisa', 'briefing', 'copy', 'criativo', 'padrao', 'aprendizado'];
function ehTipoValido(valor: string): valor is TipoOrigemBiblioteca {
  return (TIPOS_VALIDOS as string[]).includes(valor);
}

const TIPO_VARIANT: Record<string, 'accent' | 'neutral' | 'dor' | 'desejo'> = {
  pesquisa: 'accent',
  briefing: 'neutral',
  copy: 'neutral',
  criativo: 'accent',
  padrao: 'dor',
  aprendizado: 'desejo',
};

export default async function BibliotecaPage({ searchParams }: { searchParams: { q?: string; tipo?: string } }) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? '';
  const tipo = searchParams.tipo ?? '';

  let query = supabase.from('biblioteca_index').select('*').order('criado_em', { ascending: false }).limit(100);
  if (tipo && ehTipoValido(tipo)) query = query.eq('tipo_origem', tipo);
  if (q) query = query.textSearch('busca', q, { type: 'websearch', config: 'portuguese' });

  const { data: itens, error } = await query;

  return (
    <div className="p-xl">
      <div className="mb-lg">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Global Knowledge Base</p>
        <h1 className="text-[32px] font-bold tracking-tight text-text-primary">Biblioteca de Inteligência</h1>
        <p className="text-sm text-text-secondary">
          Repositório único e pesquisável de pesquisas, briefings, copies, criativos, padrões e aprendizados.
        </p>
      </div>

      <form className="mb-lg flex gap-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input name="q" defaultValue={q} placeholder="Buscar por ângulo, avatar, dor, formato..." className="pl-9" />
        </div>
        <select
          name="tipo"
          defaultValue={tipo}
          className="rounded-md border border-stroke bg-canvas px-3 text-sm text-text-primary"
        >
          <option value="">Todos os tipos</option>
          <option value="pesquisa">Pesquisa</option>
          <option value="briefing">Briefing</option>
          <option value="copy">Copy</option>
          <option value="criativo">Criativo</option>
          <option value="padrao">Padrão</option>
          <option value="aprendizado">Aprendizado</option>
        </select>
      </form>

      {error && <p className="text-sm text-critical">{error.message}</p>}

      <div className="flex flex-col gap-md">
        {(itens ?? []).length === 0 && <p className="text-sm text-text-secondary">Nenhum item encontrado.</p>}
        {(itens ?? []).map((item) => (
          <Card key={item.id}>
            <div className="mb-1 flex items-center gap-2">
              <Badge variant={TIPO_VARIANT[item.tipo_origem] ?? 'neutral'}>{item.tipo_origem}</Badge>
              {item.tags.map((tag) => (
                <span key={tag} className="font-mono text-[11px] text-text-muted">
                  #{tag}
                </span>
              ))}
            </div>
            <h3 className="text-[15px] font-semibold text-text-primary">{item.titulo}</h3>
            {item.resumo && <p className="line-clamp-2 text-sm text-text-secondary">{item.resumo}</p>}
            {item.resultado_resumo && (
              <p className="mt-1 font-mono text-xs text-profit">{item.resultado_resumo}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
