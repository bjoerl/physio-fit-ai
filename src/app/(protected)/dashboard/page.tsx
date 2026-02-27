// src/app/(protected)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// HIER SIND DIE WICHTIGEN IMPORTE:
import ChatPanel from '@/components/ChatPanel';
import PainLogger from '@/components/PainLogger';
import PainChart from '@/components/PainChart'; // <-- Hier holen wir die neue Datei!
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardPage() {
  // Check, ob User eingeloggt ist
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      
      {/* LINKE SEITE: DASHBOARD */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* Header mit Logout */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Physio-Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Willkommen zurück, {user.email}!
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Dashboard Inhalte (Grid-Layout) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Das neue Chart (nimmt 2/3 des Platzes ein) */}
          <div className="xl:col-span-2">
            <PainChart /> {/* <-- HIER WIRD DAS CHART ANGEZEIGT */}
          </div>

          {/* Der Logger (nimmt 1/3 des Platzes ein) */}
          <div className="xl:col-span-1">
            <PainLogger />
          </div>

        </div>

      </main>

      {/* RECHTE SEITE: DER CHAT */}
      <div className="w-96 flex-shrink-0 bg-white border-l border-gray-200">
        <ChatPanel />
      </div>
      
    </div>
  );
}
