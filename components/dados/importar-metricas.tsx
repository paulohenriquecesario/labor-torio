'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { parseClipboardParaGrid, gridParaLinhas } from '@/lib/parsers/planilha';
import { Loader2, Upload } from 'lucide-react';
import type { Criativo, LinhaNaoReconhecida } from '@/types/database';

const CAMPOS_DOMINIO = [
  '',
  'nome_criativo',
  'periodo_inicio',
  'periodo_fim',
  'investimento',
  'cpa',
  'cpl',
  'roas',
  'ctr',
  'hook_rate',
  'cpm',
  'cpc',
  'leads',
  'vendas',
  'receita',
] as const;

const GRID_INICIAL = [['nome_criativo', 'investimento', 'leads', 'roas', 'cpl', 'ctr', 'hook_rate']];

export function ImportarMetricas({
  nichoId,
  criativos,
  linhasNaoReconhecidas,
  importacaoId,
}: {
  nichoId: string;
  criativos: Criativo[];
  linhasNaoReconhecidas: LinhaNaoReconhecida[];
  importacaoId: string | null;
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar métricas</CardTitle>
      </CardHeader>
      <Tabs defaultValue="planilha">
        <TabsList>
          <TabsTrigger value="csv">Upload CSV</TabsTrigger>
          <TabsTrigger value="planilha">Planilha interativa</TabsTrigger>
          <TabsTrigger value="texto">Texto livre / log</TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <ImportCsv nichoId={nichoId} onImportado={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="planilha">
          <ImportPlanilha nichoId={nichoId} onImportado={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="texto">
          <ImportTexto nichoId={nichoId} onImportado={() => router.refresh()} />
        </TabsContent>
      </Tabs>

      {linhasNaoReconhecidas.length > 0 && importacaoId && (
        <div className="mt-lg border-t border-stroke pt-md">
          <p className="mb-sm text-sm font-medium text-warning">
            {linhasNaoReconhecidas.length} linha(s) sem criativo correspondente — vincule manualmente:
          </p>
          <div className="flex flex-col gap-sm">
            {linhasNaoReconhecidas.map((linha, index) => (
              <LinhaOrfa
                key={index}
                index={index}
                linha={linha}
                criativos={criativos}
                nichoId={nichoId}
                importacaoId={importacaoId}
                onVinculado={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function LinhaOrfa({
  index,
  linha,
  criativos,
  nichoId,
  importacaoId,
  onVinculado,
}: {
  index: number;
  linha: LinhaNaoReconhecida;
  criativos: Criativo[];
  nichoId: string;
  importacaoId: string;
  onVinculado: () => void;
}) {
  const [criativoId, setCriativoId] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function vincular() {
    if (!criativoId) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/metricas/importar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importacaoId, index, criativoId, nichoId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onVinculado();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-sm rounded-md border border-stroke bg-canvas p-sm">
      <span className="font-mono text-sm text-text-secondary">#{linha.nome_criativo}</span>
      <div className="flex items-center gap-sm">
        <Select value={criativoId} onValueChange={setCriativoId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Vincular a..." />
          </SelectTrigger>
          <SelectContent>
            {criativos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome_criativo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={vincular} disabled={!criativoId || enviando}>
          Vincular
        </Button>
      </div>
    </div>
  );
}

function ImportCsv({ nichoId, onImportado }: { nichoId: string; onImportado: () => void }) {
  const [colunas, setColunas] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Record<string, string>[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setColunas(result.meta.fields ?? []);
        setLinhas(result.data);
      },
    });
  }

  async function confirmar() {
    setEnviando(true);
    try {
      const linhasMapeadas = linhas.map((linha) => {
        const objeto: Record<string, string> = {};
        for (const [colunaOrigem, campoDominio] of Object.entries(mapeamento)) {
          if (campoDominio) objeto[campoDominio] = linha[colunaOrigem] ?? '';
        }
        return objeto;
      });
      const res = await fetch('/api/metricas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nichoId, tipo: 'csv', linhas: linhasMapeadas }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setColunas([]);
      setLinhas([]);
      if (inputRef.current) inputRef.current.value = '';
      onImportado();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <input ref={inputRef} type="file" accept=".csv" onChange={onFile} className="text-sm text-text-secondary" />

      {colunas.length > 0 && (
        <>
          <p className="text-sm text-text-secondary">Mapeie cada coluna do arquivo para um campo do sistema:</p>
          <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
            {colunas.map((coluna) => (
              <div key={coluna} className="flex flex-col gap-1">
                <label className="font-mono text-[11px] text-text-muted">{coluna}</label>
                <Select value={mapeamento[coluna] ?? ''} onValueChange={(v) => setMapeamento((m) => ({ ...m, [coluna]: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ignorar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPOS_DOMINIO.map((campo) => (
                      <SelectItem key={campo || 'ignorar'} value={campo || '__ignore'}>
                        {campo || 'Ignorar'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-muted">Preview ({linhas.length} linhas)</p>
          <Table>
            <TableHeader>
              <TableRow>
                {colunas.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.slice(0, 5).map((linha, i) => (
                <TableRow key={i}>
                  {colunas.map((c) => (
                    <TableCell key={c}>{linha[c]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button onClick={confirmar} disabled={enviando} className="self-start">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {enviando ? 'Importando...' : `Confirmar importação (${linhas.length} linhas)`}
          </Button>
        </>
      )}
    </div>
  );
}

function ImportPlanilha({ nichoId, onImportado }: { nichoId: string; onImportado: () => void }) {
  const [grid, setGrid] = useState<string[][]>(GRID_INICIAL);
  const [enviando, setEnviando] = useState(false);

  function atualizarCelula(linha: number, coluna: number, valor: string) {
    setGrid((atual) => {
      const novo = atual.map((row) => [...row]);
      while (novo.length <= linha) novo.push(new Array(novo[0]?.length ?? 1).fill(''));
      while (novo[linha].length <= coluna) novo[linha].push('');
      novo[linha][coluna] = valor;
      return novo;
    });
  }

  function onPaste(e: React.ClipboardEvent, linhaBase: number, colunaBase: number) {
    const texto = e.clipboardData.getData('text');
    if (!texto.includes('\t') && !texto.includes('\n')) return; // deixa o paste padrão de uma célula única
    e.preventDefault();
    const colado = parseClipboardParaGrid(texto);
    setGrid((atual) => {
      const novo = atual.map((row) => [...row]);
      colado.forEach((linhaColada, i) => {
        const linhaDestino = linhaBase + i;
        while (novo.length <= linhaDestino) novo.push(new Array(novo[0]?.length ?? 1).fill(''));
        linhaColada.forEach((valor, j) => {
          const colunaDestino = colunaBase + j;
          while (novo[linhaDestino].length <= colunaDestino) novo[linhaDestino].push('');
          novo[linhaDestino][colunaDestino] = valor;
        });
      });
      return novo;
    });
  }

  async function confirmar() {
    setEnviando(true);
    try {
      const linhas = gridParaLinhas(grid);
      const res = await fetch('/api/metricas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nichoId, tipo: 'planilha', linhas }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onImportado();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <p className="text-xs text-text-muted">
        Digite normalmente ou cole (Ctrl+V) uma seleção do Excel/Sheets a partir de qualquer célula. Primeira linha = nomes dos campos.
      </p>
      <div className="overflow-auto rounded-md border border-stroke">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {grid.map((linha, i) => (
              <tr key={i}>
                {linha.map((valor, j) => (
                  <td key={j} className="border border-stroke p-0">
                    <input
                      value={valor}
                      onChange={(e) => atualizarCelula(i, j, e.target.value)}
                      onPaste={(e) => onPaste(e, i, j)}
                      className={`h-8 w-32 bg-transparent px-2 font-mono text-[13px] outline-none focus:bg-elevated ${i === 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGrid((g) => [...g, new Array(g[0]?.length ?? 1).fill('')])}
        >
          + linha
        </Button>
        <Button onClick={confirmar} disabled={enviando}>
          {enviando ? 'Importando...' : 'Confirmar importação'}
        </Button>
      </div>
    </div>
  );
}

function ImportTexto({ nichoId, onImportado }: { nichoId: string; onImportado: () => void }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    try {
      const res = await fetch('/api/metricas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nichoId, tipo: 'texto', texto }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTexto('');
      onImportado();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <Textarea
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={'LM-W-109 deu CPL 12,40, ROAS 2,8, hook rate 31%\nCR_ALOP_V3.2_LUZ_ESC: investimento R$ 1.890, 205 leads, ROAS 3,82'}
        className="font-mono text-[13px]"
      />
      <Button onClick={confirmar} disabled={enviando || !texto} className="self-start">
        {enviando ? 'Interpretando com IA...' : 'Interpretar e importar'}
      </Button>
    </div>
  );
}
