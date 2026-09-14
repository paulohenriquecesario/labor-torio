import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen w-full bg-canvas">
      <Sidebar userEmail={user?.email ?? null} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
