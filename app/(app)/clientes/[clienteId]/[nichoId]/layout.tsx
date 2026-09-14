import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NichoTabs } from '@/components/nichos/nicho-tabs';
import { Badge } from '@/components/ui/badge';

export default async function NichoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clienteId: string; nichoId: string };
}) {
  const supabase = createClient();
  const { data: nicho } = await supabase.from('nichos').select('*').eq('id', params.nichoId).single();
  if (!nicho) notFound();

  const { data: cliente } = await supabase.from('clientes').select('nome').eq('id', params.clienteId).single();
  const clienteNome = cliente?.nome ?? '';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-xl pt-lg">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/clientes" className="hover:text-text-primary">
            Clientes
          </Link>
          <span>/</span>
          <Link href={`/clientes/${params.clienteId}`} className="hover:text-text-primary">
            {clienteNome}
          </Link>
          <span>/</span>
          <span className="text-text-primary">{nicho.nome}</span>
          <Badge variant={nicho.categoria === 'dor' ? 'dor' : 'desejo'} className="ml-2">
            {nicho.categoria}
          </Badge>
        </div>
      </div>
      <div className="mt-md">
        <NichoTabs clienteId={params.clienteId} nichoId={params.nichoId} />
      </div>
      <div className="flex-1 overflow-y-auto p-xl">{children}</div>
    </div>
  );
}
