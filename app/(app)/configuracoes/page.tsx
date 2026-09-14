import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-xl">
      <h1 className="mb-lg text-[32px] font-bold tracking-tight text-text-primary">Configurações</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <p className="text-sm text-text-secondary">E-mail: {user?.email}</p>
        <p className="mt-1 text-sm text-text-secondary">
          Sistema single-user — a troca de senha é feita diretamente no painel do Supabase (Authentication → Users).
        </p>
      </Card>
    </div>
  );
}
