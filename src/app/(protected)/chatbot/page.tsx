// src\app\(protected)\chatbot\page.tsx


// Auch hier brauchen wir 'use client', da wir Client-Komponenten (ChatPanel & PainLogger) einbinden.
'use client';

// IMPORT-ANWEISUNG: 
// Wir laden jetzt ZWEI Module aus unserem Komponenten-Ordner.
import ChatPanel from '@/components/ChatPanel';
import PainLogger from '@/components/PainLogger'; // <--- Das neue Modul für die Schmerzeingabe

export default function Home() {
  return (
    /* DER HAUPT-CONTAINER DER GESAMTEN SEITE
       - flex: Ordnet Dashboard (links) und Chat (rechts) nebeneinander an.
       - h-screen: Die Seite ist exakt so hoch wie der Bildschirm.
       - bg-gray-100: Hellgrauer Hintergrund (Clean Look).
    */
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      
      {/* LINKER BEREICH: DAS DASHBOARD 
          - flex-1: Nimmt allen Platz ein, den der Chat rechts übrig lässt.
          - p-10: Großzügiger Abstand zum Rand.
          - overflow-y-auto: Wenn der Inhalt zu hoch wird, erscheint nur hier ein Scrollbalken.
      */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* Hauptüberschrift */}
        <h1 className="text-4xl font-bold text-gray-800">Mein Physio-Dashboard</h1>
        
        {/* Untertitel */}
        <p className="mt-4 text-gray-600">Willkommen zurück! Tracke deinen Schmerzverlauf.</p>
        
        {/* CONTAINER FÜR DIE SCHMERZ-EINGABE (Vorher war hier der Platzhalter)
            - mt-10: Abstand nach oben.
            - w-full max-w-lg: Nimmt die volle Breite, wird aber nie breiter als "lg" (ca. 500px),
              damit die Eingabemaske nicht zu riesig und unübersichtlich wirkt.
        */}
        <div className="mt-10 w-full max-w-lg">
           {/* HIER RUFEN WIR UNSERE NEUE KOMPONENTE AUF */}
           <PainLogger />
        </div>

      </main>

      {/* RECHTER BEREICH: DER PERMANENTE CHAT 
          - Er bleibt immer am rechten Rand, weil er außerhalb von <main> steht.
      */}
      <ChatPanel />
      
    </div>
  );
}
