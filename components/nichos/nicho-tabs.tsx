'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ClipboardList, PenSquare, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { slug: 'pesquisa', label: 'Pesquisa', icon: Search },
  { slug: 'briefing', label: 'Briefing', icon: ClipboardList },
  { slug: 'escrita', label: 'Escrita', icon: PenSquare },
  { slug: 'dados', label: 'Dados', icon: BarChart3 },
];

export function NichoTabs({ clienteId, nichoId }: { clienteId: string; nichoId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-stroke px-xl">
      {TABS.map((tab) => {
        const href = `/clientes/${clienteId}/${nichoId}/${tab.slug}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              'flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors',
              active ? 'border-accent text-text-primary' : 'hover:text-text-primary',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
