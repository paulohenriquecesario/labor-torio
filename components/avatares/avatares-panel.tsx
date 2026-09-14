'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { criarAvatarEVincular, vincularAvatarExistente, desvincularAvatar } from '@/lib/actions/avatares';
import type { Avatar } from '@/types/database';

export function AvataresPanel({
  clienteId,
  nichoId,
  avataresVinculados,
  avataresDisponiveis,
}: {
  clienteId: string;
  nichoId: string;
  avataresVinculados: Avatar[];
  avataresDisponiveis: Avatar[];
}) {
  const [open, setOpen] = useState(false);
  const [avatarParaVincular, setAvatarParaVincular] = useState('');
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatares vinculados a este nicho</CardTitle>
      </CardHeader>

      <div className="mb-md flex flex-wrap gap-sm">
        {avataresVinculados.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhum avatar vinculado — os aprendizados de escopo &quot;avatar&quot; não terão para onde propagar.</p>
        )}
        {avataresVinculados.map((a) => (
          <span key={a.id} className="flex items-center gap-2 rounded-md border border-stroke bg-canvas px-3 py-1.5 text-sm text-text-primary">
            {a.nome}
            {a.faixa_etaria && <Badge variant="neutral">{a.faixa_etaria}</Badge>}
            <button
              onClick={() => startTransition(() => desvincularAvatar(clienteId, nichoId, a.id))}
              className="text-text-muted hover:text-critical"
              title="Desvincular"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-sm">
        {avataresDisponiveis.length > 0 && (
          <>
            <Select value={avatarParaVincular} onValueChange={setAvatarParaVincular}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Vincular avatar existente..." />
              </SelectTrigger>
              <SelectContent>
                {avataresDisponiveis.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!avatarParaVincular || pending}
              onClick={() =>
                startTransition(async () => {
                  await vincularAvatarExistente(clienteId, nichoId, avatarParaVincular);
                  setAvatarParaVincular('');
                })
              }
            >
              Vincular
            </Button>
          </>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Novo avatar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar avatar</DialogTitle>
            </DialogHeader>
            <form
              ref={formRef}
              action={(formData) => {
                startTransition(async () => {
                  await criarAvatarEVincular(clienteId, nichoId, formData);
                  setOpen(false);
                  formRef.current?.reset();
                });
              }}
              className="flex flex-col gap-md"
            >
              <div className="flex flex-col gap-sm">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required placeholder="Ex: Mulher 50+ pós-menopausa" />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-sm">
                  <Label htmlFor="faixa_etaria">Faixa etária</Label>
                  <Input id="faixa_etaria" name="faixa_etaria" placeholder="Ex: 35-50" />
                </div>
                <div className="flex flex-col gap-sm">
                  <Label htmlFor="genero">Gênero</Label>
                  <Input id="genero" name="genero" placeholder="Ex: Feminino" />
                </div>
              </div>
              <div className="flex flex-col gap-sm">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" placeholder="Ex: Executiva com queda capilar por estresse" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Salvando...' : 'Criar e vincular'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
