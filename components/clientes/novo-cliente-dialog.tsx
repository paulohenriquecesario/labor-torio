'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { criarCliente } from '@/lib/actions/clientes';

export function NovoClienteDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          action={(formData) => {
            startTransition(async () => {
              await criarCliente(formData);
              setOpen(false);
              formRef.current?.reset();
            });
          }}
          className="flex flex-col gap-md"
        >
          <div className="flex flex-col gap-sm">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required placeholder="Ex: Lux Cosméticos" />
          </div>
          <div className="flex flex-col gap-sm">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea id="descricao" name="descricao" placeholder="Ex: Operação D2C de cuidados pessoais" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando...' : 'Salvar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
