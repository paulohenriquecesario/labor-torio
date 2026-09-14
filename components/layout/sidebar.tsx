'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Library, Lightbulb, Settings, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';

const WORKSPACE_ITEMS = [
  { href: '/clientes', label: 'Clientes', icon: LayoutGrid },
  { href: '/biblioteca', label: 'Biblioteca', icon: Library },
  { href: '/sugestoes', label: 'Sugestões', icon: Lightbulb },
];

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-stroke bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-stroke px-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/40 bg-accent/10">
          <FlaskConical className="h-4 w-4 text-accent" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-text-primary">LABORATÓRIO</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Intelligence Desk</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-sm">
        <p className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-text-muted">Workspace</p>
        <ul className="flex flex-col gap-0.5">
          {WORKSPACE_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-medium text-text-secondary transition-colors',
                    active ? 'bg-elevated text-text-primary' : 'hover:bg-elevated/60 hover:text-text-primary',
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-accent" />}
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-lg px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-text-muted">Ambiente</p>
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link
              href="/configuracoes"
              className="flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-medium text-text-secondary hover:bg-elevated/60 hover:text-text-primary"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t border-stroke p-md">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-elevated" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-text-primary">{userEmail ?? 'Copywriter'}</p>
            <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-profit">
              <span className="h-1.5 w-1.5 rounded-full bg-profit" /> Online
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs text-text-muted hover:text-text-primary">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
