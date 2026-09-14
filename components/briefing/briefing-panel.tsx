'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Nicho, Pesquisa, Briefing, Hipotese } from '@/types/database';
import { Loader2, ClipboardList } from 'lucide-react';

const STATUS_LABEL: Record<Briefing['status'], string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

const RESULTADO_VARIANT: Record<Hipotese['resultado'], 'lucro' | 'prejuizo' | 'atencao' | 'neutral'> = {
  validada: 'lucro',
  refutada: 'prejuizo',
  inconclusiva: 'atencao',
  pendente: 'neutral',
};

interface BriefingComHipoteses extends Briefing {
  hipoteses: Hipotese[];
  leva_nome?: string;
}

export function BriefingPanel({
  nicho,
  pesquisasAprovadas,
  briefings,
}: {
  nicho: Nicho;
  pesquisasAprovadas: Pesquisa[];
  briefings: BriefingComHipoteses[];
}) {
  const router = useRouter();
  const [pesquisaId, setPesquisaId] = useState(pesquisasAprovadas[0]?.id ?? '');
  const [nomeLeva, setNomeLeva] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [quantidadePecas, setQuantidadePecas] = useState(6);
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    if (!pesquisaId || !nomeLeva) {
      alert('Selecione a pesquisa aprovada e dê um nome para a leva.');
      return;
    }
    setGerando(true);
    try {
      const res = await fetch('/api/briefing/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nichoId: nicho.id, pesquisaId, nomeLeva, objetivo, quantidadePecas }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNomeLeva('');
      setObjetivo('');
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
          <CardTitle>Gerar novo briefing e leva</CardTitle>
        </CardHeader>
        {pesquisasAprovadas.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma pesquisa aprovada ainda. Aprove uma pesquisa na aba Pesquisa antes de gerar um briefing.
          </p>
        ) : (
          <div className="flex flex-col gap-md">
            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              <div className="flex flex-col gap-sm">
                <Label>Pesquisa aprovada de base</Label>
                <Select value={pesquisaId} onValueChange={setPesquisaId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pesquisasAprovadas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.titulo} ({new Date(p.criado_em).toLocaleDateString('pt-BR')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-sm">
                <Label>Nome da leva</Label>
                <Input value={nomeLeva} onChange={(e) => setNomeLeva(e.target.value)} placeholder="Ex: Leva Q1-B: Ataque ao Cortisol Capilar" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              <div className="flex flex-col gap-sm">
                <Label>Objetivo</Label>
                <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex: Escala de topo de funil" />
              </div>
              <div className="flex flex-col gap-sm">
                <Label>Quantidade de peças</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={quantidadePecas}
                  onChange={(e) => setQuantidadePecas(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={gerar} disabled={gerando} className="self-start">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {gerando ? 'Gerando briefing...' : 'Gerar briefing'}
            </Button>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-md text-[18px] font-semibold text-text-primary">Briefings</h2>
        <div className="flex flex-col gap-md">
          {briefings.length === 0 && <p className="text-sm text-text-secondary">Nenhum briefing gerado ainda.</p>}
          {briefings.map((b) => (
            <BriefingItem key={b.id} briefing={b} onChanged={() => router.refresh()} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BriefingItem({ briefing, onChanged }: { briefing: BriefingComHipoteses; onChanged: () => void }) {
  const [feedback, setFeedback] = useState('');
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function decidir(decisao: 'aprovado' | 'recusado') {
    if (decisao === 'recusado' && !mostrarFeedback) {
      setMostrarFeedback(true);
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/briefing/${briefing.id}/decidir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisao, feedback: feedback || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMostrarFeedback(false);
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
      <div className="mb-md flex items-start justify-between gap-md">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant={briefing.status === 'aprovado' ? 'lucro' : briefing.status === 'recusado' ? 'prejuizo' : 'atencao'}
            >
              {STATUS_LABEL[briefing.status]}
            </Badge>
            <span className="text-xs text-text-muted">{new Date(briefing.criado_em).toLocaleString('pt-BR')}</span>
          </div>
          <h3 className="text-[18px] font-semibold text-text-primary">{briefing.titulo}</h3>
          <p className="text-sm text-text-secondary">{briefing.decisao_estrategica}</p>
        </div>
        {briefing.status === 'aguardando_aprovacao' && (
          <div className="flex shrink-0 gap-sm">
            <Button size="sm" variant="outline" onClick={() => decidir('recusado')} disabled={enviando}>
              Recusar
            </Button>
            <Button size="sm" onClick={() => decidir('aprovado')} disabled={enviando}>
              Aprovar
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border border-stroke">
        {briefing.hipoteses.map((h) => (
          <div key={h.id} className="flex items-start justify-between gap-md border-b border-stroke p-md last:border-b-0">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-xs text-text-muted">#{h.numero}</span>
                <Badge variant="accent">{h.linha === 'replica_padrao' ? 'Réplica do padrão' : 'Psicologia'}</Badge>
                <Badge variant={RESULTADO_VARIANT[h.resultado]}>{h.resultado}</Badge>
              </div>
              <p className="text-sm text-text-primary">{h.descricao}</p>
              {h.justificativa && <p className="mt-1 text-xs text-text-secondary">{h.justificativa}</p>}
            </div>
          </div>
        ))}
      </div>

      {mostrarFeedback && (
        <div className="mt-md flex flex-col gap-sm border-t border-stroke pt-md">
          <Label>Feedback para reexecutar o briefing</Label>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} />
          <div className="flex justify-end gap-sm">
            <Button size="sm" variant="ghost" onClick={() => setMostrarFeedback(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => decidir('recusado')} disabled={enviando || !feedback}>
              {enviando ? 'Reexecutando...' : 'Enviar e reexecutar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
