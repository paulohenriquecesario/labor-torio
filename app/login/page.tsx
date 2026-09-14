import { signIn } from '@/lib/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { KeyRound, Lock } from 'lucide-react';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  async function action(formData: FormData) {
    'use server';
    const result = await signIn(formData);
    if (result?.error) {
      const { redirect } = await import('next/navigation');
      redirect(`/login?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-lg border border-stroke bg-surface p-xl">
        <div className="mb-lg flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-sm border border-stroke bg-elevated px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-profit" /> Sistema Restrito
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
            <Lock className="h-3 w-3" /> SSL.Secure
          </span>
        </div>

        <div className="mb-xl flex flex-col items-center gap-1 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border border-accent/40 bg-accent/10">
            <KeyRound className="h-5 w-5 text-accent" />
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight">LABORATÓRIO</h1>
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Copy Intelligence Terminal</p>
        </div>

        <form action={action} className="flex flex-col gap-lg">
          {searchParams?.error && (
            <p className="rounded-md border border-critical/25 bg-critical-tint px-3 py-2 text-sm text-critical">
              {searchParams.error}
            </p>
          )}
          <div className="flex flex-col gap-sm">
            <Label htmlFor="email">E-mail profissional</Label>
            <Input id="email" name="email" type="email" required placeholder="voce@dominio.com" />
          </div>
          <div className="flex flex-col gap-sm">
            <Label htmlFor="senha">Chave de acesso / senha</Label>
            <Input id="senha" name="senha" type="password" required placeholder="••••••••••••" />
          </div>
          <Button type="submit" size="lg" className="mt-sm">
            Entrar no Laboratório
          </Button>
        </form>

        <p className="mt-lg text-center font-mono text-[11px] uppercase tracking-wide text-text-muted">
          256-bit encryption · Direct Response High-Velocity Workspace
        </p>
      </div>
    </main>
  );
}
