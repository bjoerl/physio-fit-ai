'use client'; // WICHTIG: Da wir User-Eingaben (Klicks, Text) verarbeiten, muss das im Browser laufen.

// 1. IMPORTE
import { useState } from 'react';
// Wir importieren den Supabase-Client (wir gehen davon aus, dass du ihn in lib/supabase.ts konfiguriert hast)
// Falls nicht, zeige ich dir gleich, wie man das schnell fixt.
import { createClient } from '@supabase/supabase-js'; 

// Für schöne Icons (optional, falls du lucide-react installiert hast)
import { Activity, Save, AlertCircle } from 'lucide-react';

// ACHTUNG: Das hier ist eine vereinfachte Initialisierung für den Client. 
// In einem echten Next.js Projekt würde man das zentral in 'src/lib/supabase.ts' machen.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PainLogger() {
  
  // --- A. DAS KURZZEITGEDÄCHTNIS (STATE) ---
  
  // 1. Schmerzlevel (0-10)
  // Startwert: 5 (die Mitte), damit der User nicht bei 0 anfangen muss.
  const [level, setLevel] = useState(5);
  
  // 2. Wo tut es weh? (String)
  // Startwert: Leer, der User soll es eintippen.
  const [location, setLocation] = useState('');
  
  // 3. Status-Management
  // Speichert: "Senden wir gerade Daten?" (damit man nicht doppelt klickt)
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Speichert: "Hat es geklappt?" oder "Gab es einen Fehler?" für Feedback-Nachrichten
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- B. DIE LOGIK (DATENBANK SPEICHERN) ---
  
  const handleSave = async () => {
    // VALIDIERUNG: Erst prüfen, ob alles da ist.
    if (!location.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte gib eine Körperstelle an.' });
      return;
    }

    // LADE-STATUS: Button sperren, User sieht "Speichert..."
    setIsSubmitting(true);
    setStatusMessage(null); // Alte Nachrichten löschen

    try {
      // DATENBANK-INSERT: Der eigentliche API-Aufruf an Supabase.
      // await = "Warte, bis die Daten wirklich in der Cloud angekommen sind."
      const { error } = await supabase
        .from('pain_logs') // Name deiner Tabelle in Supabase
        .insert([
          { 
            pain_level: level, 
            location: location,
            // created_at macht Supabase meist automatisch, aber wir können es auch explizit setzen
          }
        ]);

      if (error) {
        // Wenn Supabase "Nein" sagt (z.B. Tabelle existiert nicht, Rechte fehlen)
        throw error;
      }

      // ERFOLG: Feedback geben und Formular zurücksetzen
      setStatusMessage({ type: 'success', text: 'Eintrag gespeichert!' });
      setLocation(''); // Feld leeren
      setLevel(5);     // Slider zurücksetzen

    } catch (err) {
      // FEHLERBEHANDLUNG: Wenn das Internet weg ist oder der Code crasht
      console.error('Fehler beim Speichern:', err);
      setStatusMessage({ type: 'error', text: 'Fehler beim Speichern. Siehe Konsole.' });
    } finally {
      // AUFRÄUMEN: Egal was passiert ist, der Lade-Modus ist vorbei.
      setIsSubmitting(false);
    }
  };

  // --- C. DAS UI (WAS DER USER SIEHT) ---
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      
      {/* ÜBERSCHRIFT */}
      <div className="flex items-center gap-2 mb-6 text-emerald-700">
        <Activity className="w-5 h-5" />
        <h2 className="font-bold text-lg">Schmerz-Tagebuch</h2>
      </div>

      <div className="space-y-6">
        
        {/* 1. SCHMERZ-LEVEL SLIDER */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wie stark ist der Schmerz? ({level})
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={level}
            // Wenn man zieht, updaten wir SOFORT den State
            onChange={(e) => setLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Kein Schmerz (0)</span>
            <span>Unerträglich (10)</span>
          </div>
        </div>

        {/* 2. KÖRPERSTELLE EINGABE */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wo tut es weh?
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. Unterer Rücken, Rechtes Knie..."
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>

        {/* 3. FEEDBACK NACHRICHTEN (Nur sichtbar wenn statusMessage existiert) */}
        {statusMessage && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        )}

        {/* 4. SPEICHERN BUTTON */}
        <button
          onClick={handleSave}
          disabled={isSubmitting} // Verhindert Doppelklicks
          className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isSubmitting ? (
            'Speichert...'
          ) : (
            <>
              <Save className="w-4 h-4" />
              Eintrag speichern
            </>
          )}
        </button>

      </div>
    </div>
  );
}
