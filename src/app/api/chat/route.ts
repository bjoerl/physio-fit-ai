import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURATION ---
// Wir verbinden uns direkt hier mit der Datenbank.
// (In großen Apps macht man das in einer extra Datei, aber für heute reicht es so!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. INPUT: Was kommt vom Frontend?
    const { messages } = await req.json();
    
    // Wir holen uns die allerletzte Nachricht (das ist die, die der User gerade getippt hat)
    const lastUserMessage = messages[messages.length - 1];

    // --- NEU: SPEICHERN (USER) ---
    // Bevor wir die KI fragen, speichern wir die Frage des Users.
    // Wir gehen davon aus, dass deine Tabelle 'chat_history' heißt und die Spalten 'sender' und 'content' hat.
    const { error: saveErrorUser } = await supabase
      .from('chat_history')
      .insert([
        { 
          //sender: 'user', 
          content: lastUserMessage.content // oder .text, je nachdem was das Frontend schickt
        }
      ]);

    if (saveErrorUser) console.error('Fehler beim Speichern (User):', saveErrorUser);


    // 2. OLLAMA ANRUFEN (wie vorher)
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        messages: messages, // Wir schicken den ganzen Verlauf für den Kontext
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      return NextResponse.json({ error: 'Ollama antwortet nicht' }, { status: 500 });
    }

    const data = await ollamaResponse.json();
    const botReply = data.message?.content || "Keine Antwort.";


    // --- NEU: SPEICHERN (BOT) ---
    // Jetzt speichern wir, was die KI geantwortet hat.
    const { error: saveErrorBot } = await supabase
      .from('chat_history')
      .insert([
        { 
          // sender: 'bot', 
          content: botReply 
        }
      ]);

    if (saveErrorBot) console.error('Fehler beim Speichern (Bot):', saveErrorBot);


    // 3. ANTWORT ZURÜCK ANS FRONTEND
    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Server Crash' }, { status: 500 });
  }
}
