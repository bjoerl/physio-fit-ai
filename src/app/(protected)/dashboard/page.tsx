// src/app/(protected)/dashboard/page.tsx

// 1. ARCHITEKTUR-HINWEIS:
// WICHTIG: Diese Datei hat oben KEIN 'use client'!
// Das bedeutet: Sie ist eine sogenannte "SERVER COMPONENT" (Standard im App Router).
// Vorteil: Sie wird schon auf dem Server "gebaut" (gerendert) und schickt nur fertiges HTML an den Browser.
// Sie kann direkte Datenbankabfragen (Supabase) machen, ohne eine API-Route zu brauchen.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// 2. IMPORTE UNSERER BAUSTEINE (Komponenten)
// Hier laden wir die Lego-Steine, die wir in anderen Dateien gebaut haben,
// um sie gleich auf unserer "Dashboard-Platte" zu platzieren.
import ChatPanel from '@/components/ChatPanel';   // Das KI-Chat-Fenster
import PainLogger from '@/components/PainLogger'; // Das Schmerz-Eingabe-Formular
import LogoutButton from '@/components/LogoutButton'; // Der Abmelde-Knopf

// 3. HAUPTFUNKTION DER SEITE
// Das 'async' (asynchron) erlaubt uns, 'await' zu nutzen (also auf die Datenbank zu warten).
export default async function DashboardPage() {
  
  // --- A. DATENBESCHAFFUNG (SERVER-SIDE) ---
  
  // Wir erstellen einen Supabase-Client, der Cookies lesen darf (Server-Client).
  const supabase = await createClient();
  
  // Wir fragen Supabase: "Wer ist gerade laut Cookie eingeloggt?"
  // Dies ist eine Sicherheitsabfrage direkt beim Laden der Seite.
  const { data: { user }, error } = await supabase.auth.getUser();

  // --- B. ZUGRIFFSKONTROLLE (FALLBACK) ---
  // Falls jemand diese URL aufruft, aber gar nicht eingeloggt ist (oder der Cookie abgelaufen ist),
  // schmeißen wir ihn sofort zurück zur Login-Seite.
  // Eigentlich macht das unsere middleware.ts schon, aber doppelt hält besser!
  if (error || !user) {
    redirect('/login');
  }

  // Ab hier im Code sind wir 100% sicher: Wir haben einen legitimen User.
  // Wir können jetzt auf Dinge wie 'user.email' oder 'user.id' zugreifen.

  // --- C. DAS AUSSEHEN (UI / HTML) ---
  return (
    /* 
       HAUPT-WRAPPER: Der Container für den gesamten sichtbaren Bildschirm.
       - flex: Wir nutzen Flexbox, um Elemente nebeneinander/untereinander auszurichten.
       - h-screen: Macht diesen Container exakt so hoch wie dein Monitor (Viewport Height).
       - bg-gray-50: Ein sehr helles, freundliches Grau für den Hintergrund.
       - overflow-hidden: Verhindert, dass die ganze Seite scrollt. Wir wollen nur IN den Bereichen scrollen.
    */
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* 
         LINKE SPALTE: DAS EIGENTLICHE DASHBOARD (Hauptbereich)
         - flex-1: Das ist der Trick! "Nimm allen Platz ein, der übrig bleibt."
                   Da der Chat rechts eine feste Breite hat (w-96), füllt das Dashboard den ganzen Rest auf.
         - p-8: Großzügiger Innenabstand (Padding), damit nichts am Bildschirmrand klebt.
         - overflow-y-auto: Wenn der Inhalt hier länger wird als der Bildschirm, darf NUR dieser linke Bereich scrollen!
         - flex & flex-col & gap-8: Ordnet alle "Kästen" (Header, Logger, etc.) untereinander an mit 2rem (32px) Abstand.
      */}
      <main className="flex-1 p-8 overflow-y-auto flex flex-col gap-8">
        
        {/* 
           BEREICH 1: DER KOPFBEREICH (Header)
           Eine weiße Karte oben, die den User begrüßt und den Logout-Button hält.
           - justify-between: Schiebt den Text ganz nach links und den Button ganz nach rechts.
           - rounded-2xl & shadow-sm: Gibt dem Kasten weiche Ecken und einen leichten Schatten (Shadcn-Stil).
        */}
        <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Physio-Dashboard
            </h1>
            <p className="mt-1 text-gray-500">
              Willkommen zurück, <span className="font-semibold text-emerald-600">{user.email}</span>!
            </p>
          </div>
          <LogoutButton />
        </header>

        {/* 
           BEREICH 2: DAS GRID FÜR INHALTE (PainLogger & Platzhalter)
           - grid: Wir aktivieren das CSS-Grid-System.
           - grid-cols-1: Auf kleineren Bildschirmen sind die Elemente untereinander (1 Spalte).
           - xl:grid-cols-2: Ab extrem großen Bildschirmen (xl) ordnen wir sie nebeneinander an (2 Spalten).
           - gap-8: Abstand zwischen den Boxen.
        */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* KASTEN A: DAS SCHMERZ-FORMULAR (PainLogger) */}
          <section className="flex flex-col gap-4">
             {/* Kleine Überschrift über dem Modul */}
             <h2 className="text-xl font-semibold text-gray-700">Heutiger Check-In</h2>
             
             {/* HIER STECKEN WIR UNSEREN LEGO-STEIN EIN! 
                 Der gesamte Code aus 'src/components/PainLogger.tsx' wird genau hier gerendert. */}
             <PainLogger />
          </section>

          {/* KASTEN B: DER PLATZHALTER FÜR SPÄTER (Chart) */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-700">Dein Verlauf</h2>
            
            {/* Eine leere Platzhalter-Karte, die in etwa so aussieht wie später das Diagramm */}
            <div className="h-full min-h-[300px] w-full bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-gray-400 italic p-6">
              {/* Ein kleines SVG-Icon (sieht aus wie ein kleines Diagramm/Herzschlag) */}
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Schmerzverlauf Grafik kommt in der nächsten Phase</p>
            </div>
          </section>

        </div>
      </main>

      {/* 
         RECHTE SPALTE: DER KI-CHAT
         - <aside>: Ein semantischer HTML-Tag für Seitenleisten (Sidebars).
         - border-l: Macht einen feinen Strich auf der linken Seite, um ihn vom Dashboard abzutrennen.
         - shadow-xl: Wirft einen Schatten NACH LINKS über das Dashboard, dadurch wirkt der Chat wie "drübergelegt".
         - z-10: Stellt sicher, dass der Chat auf der Z-Achse (Ebenen) über dem Dashboard liegt.
      */}
      <aside className="h-full border-l border-gray-200 bg-white shadow-xl z-10">
        {/* HIER STECKEN WIR UNSEREN ZWEITEN LEGO-STEIN EIN! 
            Der gesamte Code aus 'src/components/ChatPanel.tsx' wird hier gerendert. 
            Zur Erinnerung: Die Breite (w-96) des Chats ist IM ChatPanel selbst definiert! */}
        <ChatPanel />
      </aside>
      
    </div>
  );
}
