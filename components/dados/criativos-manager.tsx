'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { criarCriativo } from '@/lib/actions/criativos';
import { formatRoas, formatCurrencyBRL } from '@/lib/utils';
import type { Criativo } from '@/types/database';

interface CriativoComMetrica extends Criativo {
  roas: number | null;
  cpl: number | null;
}

export function CriativosManager({
  clienteId,
  nichoId,
  criativos,
}: {
  clienteId: string;
  nichoId: string;
  criativos: CriativoComMetrica[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-text-primary">Criativos ({criativos.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Novo criativo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar criativo</DialogTitle>
            </DialogHeader>
            <form
              ref={formRef}
              action={(formData) => {
                setErro(null);
                startTransition(async () => {
                  try {
                    await criarCriativo(clienteId, nichoId, formData);
                    setOpen(false);
                    formRef.current?.reset();
                  } catch (err) {
                    setErro((err as Error).message);
                  }
                });
              }}
              className="flex flex-col gap-md"
            >
              {erro && <p className="rounded-md border border-critical/25 bg-critical-tint px-3 py-2 text-sm text-critical">{erro}</p>}
              <div className="flex flex-col gap-sm">
                <Label htmlFor="nome_criativo">Nome do criativo (idêntico ao usado no tráfego)</Label>
                <Input id="nome_criativo" name="nome_criativo" required placeholder="Ex: CR_ALOP_V3.2_LUZ_ESC" className="font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-sm">
                  <Label htmlFor="angulo">Ângulo</Label>
                  <Input id="angulo" name="angulo" placeholder="Ex: Luz de Escritório" />
                </div>
                <div className="flex flex-col gap-sm">
                  <Label htmlFor="formato">Formato</Label>
                  <Input id="formato" name="formato" placeholder="Ex: UGC POV" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-sm">
                  <Label htmlFor="legenda">Legenda</Label>
                  <Input id="legenda" name="legenda" placeholder="Ex: Legenda curta" />
                </div>
                <div className="flex flex-col gap-sm">
                  <Label htmlFor="trilha_sonora">Trilha sonora</Label>
                  <Input id="trilha_sonora" name="trilha_sonora" placeholder="Ex: Sem música" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Salvando...' : 'Salvar criativo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do criativo</TableHead>
            <TableHead>Ângulo</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>ROAS</TableHead>
            <TableHead>CPL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criativos.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nome_criativo}</TableCell>
              <TableCell>{c.angulo ?? '—'}</TableCell>
              <TableCell>{c.formato ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={c.status === 'no_ar' ? 'lucro' : c.status === 'pausado' ? 'atencao' : 'neutral'}>{c.status}</Badge>
              </TableCell>
              <TableCell>{formatRoas(c.roas)}</TableCell>
              <TableCell>{formatCurrencyBRL(c.cpl)}</TableCell>
            </TableRow>
          ))}
          {criativos.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-text-secondary">
                Nenhum criativo cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
