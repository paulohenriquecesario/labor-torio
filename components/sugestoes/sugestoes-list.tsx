'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Sugestao, Concorrente } from '@/types/database';

export function SugestoesList({ sugestoes, concorrentesSugeridos }: { sugestoes: Sugestao[]; concorrentesSugeridos: Concorrente[] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-lg">
      {concorrentesSugeridos.length > 0 && (
        <div>
          <h2 className="mb-md text-[18px] font-semibold text-text-primary">Concorrentes descobertos</h2>
          <div className="flex flex-col gap-sm">
            {concorrentesSugeridos.map((c) => (
              <ConcorrenteItem key={c.id} concorrente={c} onChanged={() => router.refresh()} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-md text-[18px] font-semibold text-text-primary">Sugestões autônomas</h2>
        <div className="flex flex-col gap-sm">
          {sugestoes.length === 0 && <p className="text-sm text-text-secondary">Nenhuma sugestão nova.</p>}
          {sugestoes.map((s) => (
            <SugestaoItem key={s.id} sugestao={s} onChanged={() => router.refresh()} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SugestaoItem({ sugestao, onChanged }: { sugestao: Sugestao; onChanged: () => void }) {
  const [enviando, setEnviando] = useState(false);

  async function decidir(decisao: 'aceita' | 'recusada') {
    setEnviando(true);
    try {
      const res = await fetch(`/api/sugestoes/${sugestao.id}/decidir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisao }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
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
        <div>
          <Badge variant="accent" className="mb-1">
            {sugestao.tipo}
          </Badge>
          <p className="text-sm font-medium text-text-primary">{sugestao.conteudo}</p>
          {sugestao.justificativa && <p className="text-xs text-text-secondary">{sugestao.justificativa}</p>}
        </div>
        {sugestao.status === 'nova' && (
          <div className="flex shrink-0 gap-sm">
            <Button size="sm" variant="outline" onClick={() => decidir('recusada')} disabled={enviando}>
              Recusar
            </Button>
            <Button size="sm" onClick={() => decidir('aceita')} disabled={enviando}>
              Aceitar
            </Button>
          </div>
        )}
        {sugestao.status !== 'nova' && <Badge variant={sugestao.status === 'aceita' ? 'lucro' : 'prejuizo'}>{sugestao.status}</Badge>}
      </div>
    </Card>
  );
}

function ConcorrenteItem({ concorrente, onChanged }: { concorrente: Concorrente; onChanged: () => void }) {
  const [enviando, setEnviando] = useState(false);

  async function decidir(decisao: 'aceitar' | 'ignorar') {
    setEnviando(true);
    try {
      const res = await fetch(`/api/concorrentes/${concorrente.id}/decidir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisao }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onChanged();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-md">
        <div>
          <Badge variant="neutral" className="mb-1">
            Concorrente sugerido
          </Badge>
          <p className="text-sm font-medium text-text-primary">{concorrente.nome}</p>
        </div>
        <div className="flex gap-sm">
          <Button size="sm" variant="outline" onClick={() => decidir('ignorar')} disabled={enviando}>
            Ignorar
          </Button>
          <Button size="sm" onClick={() => decidir('aceitar')} disabled={enviando}>
            Aceitar e monitorar
          </Button>
        </div>
      </div>
    </Card>
  );
}
