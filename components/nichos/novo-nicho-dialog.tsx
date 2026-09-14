'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { criarNicho } from '@/lib/actions/nichos';

export function NovoNichoDialog({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState<'dor' | 'desejo'>('dor');
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Adicionar nicho
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo nicho</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={(formData) => {
            formData.set('categoria', categoria);
            startTransition(async () => {
              await criarNicho(clienteId, formData);
              setOpen(false);
              formRef.current?.reset();
            });
          }}
          className="flex flex-col gap-md"
        >
          <div className="flex flex-col gap-sm">
            <Label htmlFor="nome">Nome do nicho</Label>
            <Input id="nome" name="nome" required placeholder="Ex: Alopecia Androgenética (Calvície Feminina)" />
          </div>
          <div className="flex flex-col gap-sm">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as 'dor' | 'desejo')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dor">Dor</SelectItem>
                <SelectItem value="desejo">Desejo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-sm">
            <Label htmlFor="produto">Produto vinculado (opcional)</Label>
            <Input id="produto" name="produto" placeholder="Ex: Sérum Fortalecedor Follicle-Max" />
          </div>
          <div className="flex flex-col gap-sm">
            <Label htmlFor="publico">Público-alvo & contexto (opcional)</Label>
            <Input id="publico" name="publico" placeholder="Ex: Mulheres 35-55 com queda capilar pós-estresse" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando...' : 'Salvar nicho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
