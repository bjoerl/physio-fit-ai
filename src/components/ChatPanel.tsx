// src/components/ChatPanel.tsx
'use client';

// 1. IMPORTE
// Wir holen 'useEffect', um Dinge beim Start der Komponente auszuführen.
import { useState, useEffect } from 'react';
// Wir importieren den BROWSER-Client für Supabase.
// Wichtig: In Client Components IMMER den Client aus 'client.ts' nehmen!
import { createClient } from '@/lib/supabase/client'; 

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

export default function ChatPanel() {
  // --- A. DAS GEDÄCHTNIS (STATE) ---
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // NEU: Ein Status, der anzeigt, ob wir gerade den alten Verlauf aus der DB laden
  const [isInitializing, setIsInitializing] = useState(true); 

  // --- B. INITIALISIERUNG (CHAT-VERLAUF LADEN) ---
  // useEffect wird genau EINMAL ausgeführt, wenn die Komponente im Browser geladen wird (wegen der leeren Klammer [] am Ende).
  useEffect(() => {
    // Da wir in useEffect keine direkte 'await' Funktion nutzen dürfen, 
    // schreiben wir eine kleine Hilfsfunktion innerhalb des Hooks und rufen sie sofort auf.
    const fetchHistory = async () => {
      try {
        const supabase = createClient();
        
        // 1. Wir holen die angemeldete User-ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Falls nicht eingeloggt (sollte durch Middleware nicht passieren), brechen wir ab.

        // 2. Wir rufen die alten Nachrichten aus der DB ab.
        // Wir sortieren aufsteigend nach created_at (älteste zuerst, neueste unten).
        // LIMIT 50: Wir laden nur die letzten 50 Nachrichten, damit es nicht ewig dauert.
        const { data, error } = await supabase
          .from('chat_history')
          .select('id, sender, content, created_at')
          .eq('user_id', user.id) // WICHTIG: Nur MEINE Nachrichten!
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        // 3. Wir formatieren die Daten um, damit sie in unser 'Message' Interface passen.
        // Die DB nutzt UUIDs für 'id', wir haben hier im State aktuell Nummern erwartet (Date.now()).
        // In React können Keys aber auch Strings sein. Für heute wandeln wir es einfach um, 
        // oder nutzen den Timestamp, um es simpel zu halten.
        if (data && data.length > 0) {
          const formattedMessages: Message[] = data.map((row) => ({
            id: new Date(row.created_at).getTime() + Math.random(), // Eindeutige ID generieren
            text: row.content,
            sender: row.sender as 'user' | 'bot'
          }));
          
          // Wir packen die formatierten alten Nachrichten in unser State-Gedächtnis
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Fehler beim Laden des Chat-Verlaufs:", error);
      } finally {
        // Egal ob Erfolg oder Fehler: Wir sind fertig mit dem Initialisieren
        setIsInitializing(false);
      }
    };

    fetchHistory();
  }, []); // <-- Das leere Array bedeutet: Nur einmal beim Mounten (Starten) ausführen!


  // --- C. DIE LOGIK (NACHRICHT SENDEN) ---
  // Dieser Teil bleibt fast identisch zu vorher.
  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newHistory.map(m => ({ role: m.sender, content: m.text })) 
        }),
      });

      if (!response.ok) throw new Error('Netzwerk-Fehler');

      const data = await response.json(); 

      const botReply: Message = {
        id: Date.now() + 1,
        text: data.reply,
        sender: 'bot',
      };

      setMessages((prev) => [...prev, botReply]);

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now() + 1,
        text: "Entschuldigung, ich konnte die KI nicht erreichen. Läuft Ollama?",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- D. DAS AUSSEHEN (UI) ---
  return (
    <div className="w-96 bg-white border-l border-gray-200 p-6 shadow-xl flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4 text-emerald-600">Physio-AI Coach</h2>

      {/* NACHRICHTEN-LISTE (Scrollbar) */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        
        {/* LADE-ANIMATION BEIM START (Wenn alte Nachrichten aus DB geladen werden) */}
        {isInitializing && (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 text-sm animate-pulse">Lade alten Verlauf...</p>
          </div>
        )}

        {/* FALLBACK: Keine Nachrichten und fertig geladen? */}
        {!isInitializing && messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-10">
            Schreib mir, wo es weh tut.
          </p>
        )}

        {/* NACHRICHTEN RENDERN */}
        {!isInitializing && messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-emerald-500 text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* LADE-INDIKATOR WÄHREND KI DENKT */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none text-gray-400 text-xs italic animate-pulse">
              Coach tippt...
            </div>
          </div>
        )}
      </div>

      {/* INPUT-BEREICH */}
      <div className="mt-auto flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Frag deinen Coach..." 
          // Sperren, wenn KI denkt ODER wenn wir noch initialisieren
          disabled={isLoading || isInitializing}
          className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all disabled:bg-gray-50"
        />
        <button 
          onClick={handleSend} 
          disabled={isLoading || isInitializing || !input.trim()}
          className={`px-4 py-2 rounded-lg transition-all shadow-md text-white ${
            isLoading || isInitializing || !input.trim() 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
