// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
// WICHTIG: Wir nutzen den SERVER Client, weil wir uns im Backend befinden (API Route).
// Der Server-Client kann die Cookies auslesen, um zu checken, wer gerade eingeloggt ist.
import { createClient } from '@/lib/supabase/server'; 

export async function POST(req: Request) {
  try {
    // 1. INPUT VOM FRONTEND (Was hat der User getippt?)
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1];

    // --- NEU: 2. USER HERAUSFINDEN ---
    // Wir bauen die Verbindung zu Supabase auf.
    const supabase = await createClient();
    // Wir fragen Supabase: "Wer schickt gerade diesen Request?" (anhand der Cookies)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Sicherheits-Check: Wenn niemand eingeloggt ist, brechen wir sofort ab.
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    // --- NEU: 3. USER-NACHRICHT SPEICHERN ---
    // Jetzt schieben wir die Nachricht in die neue Tabelle 'chat_history'.
    const { error: saveErrorUser } = await supabase
      .from('chat_history')
      .insert([{
        user_id: user.id,          // <-- Hier verknüpfen wir die Nachricht mit dem echten User!
        sender: 'user',            // Wer hat's geschrieben?
        content: lastUserMessage.content // Der Text
      }]);

    // Wenn Supabase meckert, schreiben wir es ins Terminal, damit wir es sehen.
    if (saveErrorUser) console.error('Fehler beim Speichern (User):', saveErrorUser);

    // 4. KI ANFRAGEN (Ollama)
    // Wir leiten die komplette Konversation an deinen lokalen KI-Container weiter.
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        messages: messages,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      return NextResponse.json({ error: 'Ollama antwortet nicht' }, { status: 500 });
    }

    // KI-Antwort auspacken
    const data = await ollamaResponse.json();
    const botReply = data.message?.content || "Keine Antwort.";

    // --- NEU: 5. BOT-NACHRICHT SPEICHERN ---
    // Wir speichern auch das, was die KI gesagt hat, wieder für DEN GLEICHEN User.
    const { error: saveErrorBot } = await supabase
      .from('chat_history')
      .insert([{
        user_id: user.id, // <-- Auch die Bot-Nachricht gehört in die Historie DIESES Users
        sender: 'bot',
        content: botReply
      }]);

    if (saveErrorBot) console.error('Fehler beim Speichern (Bot):', saveErrorBot);

    // 6. ANTWORT ZURÜCK ANS FRONTEND
    // Das ChatPanel empfängt das hier und rendert die neue Sprechblase.
    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Server Crash' }, { status: 500 });
  }
}
