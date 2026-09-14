'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Nicho, Hipotese, Copy, TipoCopy, ModoEscrita, AnuncioEspionado } from '@/types/database';
import { Loader2, PenSquare } from 'lucide-react';

const TIPOS: { value: TipoCopy; label: string }[] = [
  { value: 'vsl', label: 'VSL (Vídeo Longo)' },
  { value: 'microlead', label: 'Microlead (45s)' },
  { value: 'lead', label: 'Lead (3-5 min)' },
  { value: 'anuncio', label: 'Anúncio' },
  { value: 'gancho', label: 'Gancho (Hooks)' },
];

const MODOS: { value: ModoEscrita; label: string }[] = [
  { value: 'zero', label: 'Do zero' },
  { value: 'variacao', label: 'Variação direta' },
  { value: 'modelagem_estrutura', label: 'Modelagem por estrutura invisível' },
  { value: 'modelagem_nicho', label: 'Modelagem trocando de nicho' },
  { value: 'variacao_dor', label: 'Variação de dor' },
  { value: 'variacao_curiosidade', label: 'Variação de curiosidade' },
];

const STATUS_LABEL: Record<Copy['status'], string> = {
  rascunho: 'Rascunho',
  aguardando_revisao: 'Aguardando revisão',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
};

export function EscritaPanel({
  nicho,
  hipotesesDisponiveis,
  anunciosEspionados,
  copies,
}: {
  nicho: Nicho;
  hipotesesDisponiveis: Hipotese[];
  anunciosEspionados: AnuncioEspionado[];
  copies: Copy[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoCopy>('anuncio');
  const [modo, setModo] = useState<ModoEscrita>('zero');
  const [hipoteseId, setHipoteseId] = useState<string>(hipotesesDisponiveis[0]?.id ?? '');
  const [copyReferenciaId, setCopyReferenciaId] = useState<string>('');
  const [anuncioReferenciaId, setAnuncioReferenciaId] = useState<string>('');
  const [instrucoesExtra, setInstrucoesExtra] = useState('');
  const [gerando, setGerando] = useState(false);

  const precisaReferencia = modo !== 'zero';

  async function gerar() {
    setGerando(true);
    try {
      const res = await fetch('/api/copy/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nichoId: nicho.id,
          tipo,
          modo,
          hipoteseId: hipoteseId || undefined,
          copyReferenciaId: copyReferenciaId || undefined,
          anuncioReferenciaId: anuncioReferenciaId || undefined,
          instrucoesExtra: instrucoesExtra || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setInstrucoesExtra('');
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <Card>
        <CardHeader>
          <CardTitle>Escrever nova peça</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          <div className="flex flex-col gap-sm">
            <Label>Tipo de peça</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCopy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-sm">
            <Label>Modo</Label>
            <Select value={modo} onValueChange={(v) => setModo(v as ModoEscrita)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-sm">
            <Label>Hipótese a testar (opcional)</Label>
            <Select value={hipoteseId || '__none'} onValueChange={(v) => setHipoteseId(v === '__none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem hipótese vinculada</SelectItem>
                {hipotesesDisponiveis.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    #{h.numero} · {h.descricao.slice(0, 60)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {precisaReferencia && (
          <div className="mt-md grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="flex flex-col gap-sm">
              <Label>Referência: copy existente</Label>
              <Select value={copyReferenciaId || '__none'} onValueChange={(v) => setCopyReferenciaId(v === '__none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhuma</SelectItem>
                  {copies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-sm">
              <Label>Ou referência: anúncio espionado</Label>
              <Select value={anuncioReferenciaId || '__none'} onValueChange={(v) => setAnuncioReferenciaId(v === '__none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhum</SelectItem>
                  {anunciosEspionados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.titulo ?? a.url ?? a.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-md flex flex-col gap-sm">
          <Label>Instruções adicionais (opcional)</Label>
          <Textarea value={instrucoesExtra} onChange={(e) => setInstrucoesExtra(e.target.value)} rows={2} />
        </div>

        <Button className="mt-md" onClick={gerar} disabled={gerando}>
          {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
          {gerando ? 'Escrevendo...' : 'Gerar copy'}
        </Button>
      </Card>

      <div>
        <h2 className="mb-md text-[18px] font-semibold text-text-primary">Peças</h2>
        <div className="flex flex-col gap-md">
          {copies.length === 0 && <p className="text-sm text-text-secondary">Nenhuma peça escrita ainda.</p>}
          {copies.map((c) => (
            <CopyItem key={c.id} copy={c} onChanged={() => router.refresh()} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CopyItem({ copy, onChanged }: { copy: Copy; onChanged: () => void }) {
  const [expandido, setExpandido] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [mostrarFeedback, setMostrarFeedback] = useState<'recusado' | 'corrigir' | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function decidir(decisao: 'aprovado' | 'recusado' | 'corrigir') {
    if ((decisao === 'recusado' || decisao === 'corrigir') && mostrarFeedback !== decisao) {
      setMostrarFeedback(decisao);
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/copy/${copy.id}/decidir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisao, feedback: feedback || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMostrarFeedback(null);
      setFeedback('');
      onChanged();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-md">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={copy.status === 'aprovada' ? 'lucro' : copy.status === 'recusada' ? 'prejuizo' : 'atencao'}>
              {STATUS_LABEL[copy.status]}
            </Badge>
            <Badge variant="neutral">v{copy.versao}</Badge>
            <span className="text-xs text-text-muted">{new Date(copy.criado_em).toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-sm font-medium text-text-primary">{copy.titulo}</p>
          {expandido && (
            <pre className="mt-sm max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-stroke bg-canvas p-md font-sans text-sm text-text-secondary scrollbar-thin">
              {copy.conteudo}
            </pre>
          )}
          <button className="mt-1 text-xs text-accent hover:underline" onClick={() => setExpandido((v) => !v)}>
            {expandido ? 'Recolher' : 'Ver peça completa'}
          </button>
        </div>

        {copy.status === 'aguardando_revisao' && (
          <div className="flex shrink-0 gap-sm">
            <Button size="sm" variant="outline" onClick={() => decidir('recusado')} disabled={enviando}>
              Recusar
            </Button>
            <Button size="sm" variant="outline" onClick={() => decidir('corrigir')} disabled={enviando}>
              Corrigir
            </Button>
            <Button size="sm" onClick={() => decidir('aprovado')} disabled={enviando}>
              Aprovar
            </Button>
          </div>
        )}
      </div>

      {mostrarFeedback && (
        <div className="mt-md flex flex-col gap-sm border-t border-stroke pt-md">
          <Label>{mostrarFeedback === 'corrigir' ? 'O que ajustar' : 'Motivo da recusa'}</Label>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} />
          <div className="flex justify-end gap-sm">
            <Button size="sm" variant="ghost" onClick={() => setMostrarFeedback(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => decidir(mostrarFeedback)} disabled={enviando || !feedback}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
