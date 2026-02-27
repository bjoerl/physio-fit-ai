// src/components/ChatPanel.tsx
'use client';

import { useState, useEffect } from 'react';
// Wir brauchen den Client, um den eingeloggten User und alte Nachrichten zu holen
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // --- 1. BEIM STARTEN: USER HOLEN & ALTE NACHRICHTEN LADEN ---
  useEffect(() => {
    const initChat = async () => {
      const supabase = createClient();
      
      // A) Wer ist gerade eingeloggt?
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id); // Wir merken uns die ID für später (beim Senden)

      // B) Alte Nachrichten aus der Datenbank holen
      const { data: history, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }); // Älteste zuerst (oben)

      if (error) {
        console.error("Fehler beim Laden des Chat-Verlaufs:", error);
      } else if (history) {
        // Die Datenbank-Daten in unser Frontend-Format umwandeln
        const loadedMessages: Message[] = history.map((row) => ({
          id: row.id,
          text: row.content,
          sender: row.sender as 'user' | 'bot'
        }));
        setMessages(loadedMessages);
      }
    };

    initChat();
  }, []);

  // --- 2. BEIM SENDEN: NACHRICHT & USER-ID AN DIE API SCHICKEN ---
  const handleSend = async () => {
    if (!input.trim() || isLoading || !userId) return;

    // A) User-Nachricht ins UI schreiben
    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // B) API aufrufen (Jetzt MIT userId!)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // Format für Ollama (role / content)
          messages: newHistory.map(m => ({ role: m.sender, content: m.text })),
          // WICHTIG: Wir geben der API unsere ID, damit sie speichern kann!
          userId: userId 
        }),
      });

      if (!response.ok) throw new Error('Netzwerk-Fehler');

      const data = await response.json(); 

      // C) Bot-Antwort ins UI schreiben
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
        text: "Entschuldigung, ich konnte den Server nicht erreichen.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. DAS AUSSEHEN ---
  return (
    <div className="w-full h-full bg-[color:var(--md-surface)] p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-4 text-[color:var(--md-text)]">
        Physio-AI Coach
      </h2>

      {/* CHAT-VERLAUF (Scrollbar) */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.length === 0 && !isLoading && (
          <p className="text-[color:var(--md-muted-2)] text-sm text-center mt-10">
            Schreib mir, wo es weh tut. Ich merke mir unseren Verlauf!
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-[color:var(--md-primary)] text-white rounded-tr-none' 
                : 'bg-[color:var(--md-bg)] text-[color:var(--md-text)] border border-[color:var(--md-outline)] rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[color:var(--md-bg)] border border-[color:var(--md-outline)] p-3 rounded-2xl rounded-tl-none text-[color:var(--md-muted)] text-xs italic animate-pulse">
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
          disabled={isLoading || !userId} // Sperren, falls User ID noch lädt
          className="flex-1 p-3 border border-[color:var(--md-outline)] bg-[color:var(--md-bg)] rounded-[var(--md-radius-lg)] focus:ring-2 focus:ring-[color:var(--md-primary)] outline-none text-sm transition-all text-[color:var(--md-text)] disabled:opacity-50"
        />
        <button 
          onClick={handleSend} 
          disabled={isLoading || !input.trim() || !userId}
          className={`px-5 py-2 rounded-[var(--md-radius-lg)] transition-all shadow-sm font-medium text-white ${
            isLoading || !input.trim() || !userId
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-[color:var(--md-primary)] hover:opacity-90'
          }`}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
