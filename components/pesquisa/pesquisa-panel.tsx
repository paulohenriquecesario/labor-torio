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
import type { Nicho, Pesquisa, TipoFonte, TipoPesquisa } from '@/types/database';
import { Loader2, Sparkles } from 'lucide-react';

const STATUS_LABEL: Record<Pesquisa['status'], string> = {
  rodando: 'Rodando',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  erro: 'Erro',
};

function detectarTipoFonte(url: string): TipoFonte {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/facebook\.com\/ads\/library/.test(url)) return 'biblioteca_meta';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/amazon\./.test(url)) return 'amazon';
  return 'pagina_venda';
}

export function PesquisaPanel({ nicho, pesquisas }: { nicho: Nicho; pesquisas: Pesquisa[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoPesquisa>('completa');
  const [termoBusca, setTermoBusca] = useState(`${nicho.nome}${nicho.produto ? ' — ' + nicho.produto : ''}`);
  const [linksTexto, setLinksTexto] = useState('');
  const [rodando, setRodando] = useState(false);

  async function disparar() {
    setRodando(true);
    try {
      const linksManuais = linksTexto
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((url) => ({ tipo: detectarTipoFonte(url), url }));

      const res = await fetch('/api/pesquisa/executar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nichoId: nicho.id, tipo, termoBusca, linksManuais }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setLinksTexto('');
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      <Card>
        <CardHeader>
          <CardTitle>Executar mineração de inteligência</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <div className="flex flex-col gap-sm">
            <Label>Tipo de pesquisa</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoPesquisa)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completa">Completa</SelectItem>
                <SelectItem value="avatar">Avatar</SelectItem>
                <SelectItem value="mercado">Mercado</SelectItem>
                <SelectItem value="trafego_pago">Tráfego pago</SelectItem>
                <SelectItem value="organico">Orgânico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-sm">
            <Label>Termo de busca</Label>
            <Input value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
          </div>
        </div>

        <div className="mt-md grid grid-cols-1 gap-md md:grid-cols-2">
          <div className="rounded-md border border-stroke bg-canvas p-md">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-profit">Roda sozinho</p>
            <p className="text-xs text-text-secondary">Google Trends, notícias, Reddit (posts + comentários), YouTube (busca, transcrição, comentários).</p>
          </div>
          <div className="rounded-md border border-stroke bg-canvas p-md">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-warning">Exige seu material</p>
            <p className="text-xs text-text-secondary">Biblioteca de anúncios do Meta, TikTok, Instagram, Amazon, ferramentas de espionagem pagas.</p>
          </div>
        </div>

        <div className="mt-md flex flex-col gap-sm">
          <Label>Cole aqui links em lote (um por linha) — detecção automática de origem</Label>
          <Textarea
            rows={3}
            value={linksTexto}
            onChange={(e) => setLinksTexto(e.target.value)}
            placeholder={'https://www.facebook.com/ads/library/?...\nhttps://www.tiktok.com/...'}
            className="font-mono text-[13px]"
          />
        </div>

        <Button className="mt-md" onClick={disparar} disabled={rodando}>
          {rodando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {rodando ? 'Executando pesquisa...' : 'Executar pesquisa'}
        </Button>
      </Card>

      <div>
        <h2 className="mb-md text-[18px] font-semibold text-text-primary">Relatórios</h2>
        <div className="flex flex-col gap-md">
          {pesquisas.length === 0 && <p className="text-sm text-text-secondary">Nenhuma pesquisa executada ainda.</p>}
          {pesquisas.map((p) => (
            <PesquisaItem key={p.id} pesquisa={p} onChanged={() => router.refresh()} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PesquisaItem({ pesquisa, onChanged }: { pesquisa: Pesquisa; onChanged: () => void }) {
  const [expandido, setExpandido] = useState(false);
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
      const res = await fetch(`/api/pesquisa/${pesquisa.id}/decidir`, {
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
      <div className="flex items-start justify-between gap-md">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={pesquisa.origem === 'automatica' ? 'accent' : 'neutral'}>{pesquisa.tipo}</Badge>
            <Badge
              variant={
                pesquisa.status === 'aprovada' ? 'lucro' : pesquisa.status === 'recusada' || pesquisa.status === 'erro' ? 'prejuizo' : 'atencao'
              }
            >
              {STATUS_LABEL[pesquisa.status]}
            </Badge>
            <span className="text-xs text-text-muted">{new Date(pesquisa.criado_em).toLocaleString('pt-BR')}</span>
          </div>
          <p className="text-sm font-medium text-text-primary">{pesquisa.titulo}</p>
          {pesquisa.resumo && <p className="text-sm text-text-secondary">{pesquisa.resumo}</p>}
          {expandido && pesquisa.relatorio && (
            <pre className="mt-sm max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-stroke bg-canvas p-md font-sans text-sm text-text-secondary scrollbar-thin">
              {pesquisa.relatorio}
            </pre>
          )}
          {pesquisa.relatorio && (
            <button className="mt-1 text-xs text-accent hover:underline" onClick={() => setExpandido((v) => !v)}>
              {expandido ? 'Recolher relatório' : 'Ver relatório completo'}
            </button>
          )}
        </div>

        {pesquisa.status === 'aguardando_aprovacao' && (
          <div className="flex shrink-0 flex-col items-end gap-sm">
            <div className="flex gap-sm">
              <Button size="sm" variant="outline" onClick={() => decidir('recusado')} disabled={enviando}>
                Recusar
              </Button>
              <Button size="sm" onClick={() => decidir('aprovado')} disabled={enviando}>
                Aprovar
              </Button>
            </div>
          </div>
        )}
      </div>

      {mostrarFeedback && (
        <div className="mt-md flex flex-col gap-sm border-t border-stroke pt-md">
          <Label>Feedback para reexecutar a pesquisa</Label>
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
