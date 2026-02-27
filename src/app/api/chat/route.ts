// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Wir nutzen hier direkt den Admin/Service-Key oder den normalen Setup-Client, 
// um aus der Backend-Route heraus zu speichern.
// (Voraussetzung: Du schickst die user_id vom Frontend mit!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. WAS KOMMT VOM FRONTEND?
    // Wir erwarten jetzt neben den Nachrichten auch die user_id!
    const { messages, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID fehlt' }, { status: 400 });
    }

    // Wir holen uns die LETZTE Nachricht (das ist die, die der User gerade getippt hat)
    const lastUserMessage = messages[messages.length - 1];

    // --- 2. DATENBANK: USER-NACHRICHT SPEICHERN ---
    const { error: dbErrorUser } = await supabase
      .from('chat_messages')
      .insert([
        {
          user_id: userId,
          sender: 'user',
          content: lastUserMessage.content,
        }
      ]);

    if (dbErrorUser) {
      console.error('Fehler beim Speichern der User-Nachricht:', dbErrorUser);
    }

    // --- 3. OLLAMA ANRUFEN ---
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        messages: messages, // Wir schicken den Verlauf an die KI
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      return NextResponse.json({ error: 'Ollama antwortet nicht' }, { status: 500 });
    }

    const data = await ollamaResponse.json();
    const botReply = data.message?.content || "Keine Antwort erhalten.";

    // --- 4. DATENBANK: BOT-NACHRICHT SPEICHERN ---
    const { error: dbErrorBot } = await supabase
      .from('chat_messages')
      .insert([
        {
          user_id: userId,
          sender: 'bot',
          content: botReply,
        }
      ]);

    if (dbErrorBot) {
      console.error('Fehler beim Speichern der Bot-Nachricht:', dbErrorBot);
    }

    // --- 5. ANTWORT ZURÜCK ANS FRONTEND ---
    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
