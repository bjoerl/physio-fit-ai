// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
// WICHTIG: Wir nutzen NICHT mehr '@supabase/supabase-js' direkt!
// Wir nutzen deinen eigenen Server-Client, der Cookies lesen kann.
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // ============================================================
    // 1. FRONTEND-DATEN LESEN
    // Wir holen uns die Nachrichten, die der User getippt hat.
    // Die 'userId' brauchen wir hier eigentlich gar nicht mehr zwingend
    // vom Frontend, da wir sie gleich sicher aus der Session holen!
    // ============================================================
    const { messages } = await req.json();

    const lastUserMessage = messages[messages.length - 1];

    // ============================================================
    // 2. SUPABASE SERVER-CLIENT INITIALISIEREN
    // Dieser Client liest automatisch die Cookies des Users!
    // ============================================================
    const supabase = await createClient();

    // Wir holen den User sicher aus der Session (vom Cookie)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const userId = user.id;

    // ============================================================
    // 3. USER-NACHRICHT SPEICHERN
    // Da wir den Server-Client mit Session nutzen, greift RLS 
    // jetzt korrekt und erlaubt den Insert!
    // ============================================================
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

    // ============================================================
    // 4. KI-GEHIRN (RAG): SCHMERZDATEN LADEN
    // Wir holen die letzten 5 Einträge des Users, damit die KI
    // weiß, wie es ihm geht.
    // ============================================================
    const { data: painLogs, error: painError } = await supabase
      .from('pain_logs')
      .select('pain_level, location, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (painError) {
      console.error("Fehler beim Laden der Schmerzdaten:", painError);
    }

    // ============================================================
    // 5. DATEN FÜR DIE KI FORMATIEREN (SYSTEM PROMPT)
    // Wir wandeln das Array in einen lesbaren String für Qwen um.
    // ============================================================
    const painHistoryText = painLogs && painLogs.length > 0
      ? painLogs.map(log => 
          `- Am ${new Date(log.created_at).toLocaleDateString('de-DE')}: Schmerzlevel ${log.pain_level}/10 im Bereich '${log.location}'.`
        ).join('\n')
      : 'Bisher hat der Nutzer noch keine Schmerzdaten erfasst.';

    // Die geheime Anweisung an die KI:
    const systemMessage = {
      role: 'system',
      content: `Du bist ein einfühlsamer, professioneller KI-Physiotherapie-Coach im Projekt "Physio-Fit-AI".
Deine Aufgabe ist es, dem Nutzer bei der Einordnung seiner körperlichen Beschwerden zu helfen und schonende, allgemeine Tipps zu geben.

HIER SIND DIE AKTUELLEN SCHMERZDATEN DES NUTZERS (aus seinem Tracking-Tagebuch):
${painHistoryText}

WICHTIGE REGELN FÜR DICH:
1. Beziehe dich in deinen Antworten natürlich und proaktiv auf diese Tagebuch-Daten (z.B. "Ich sehe, dein Rücken war gestern auf Level 7...").
2. Gib NIEMALS medizinische Diagnosen ab. Rate bei akuten Schmerzen immer zu einem echten Arztbesuch.
3. Antworte immer auf Deutsch, sei motivierend und schreibe in kurzen, gut lesbaren Absätzen. Vermeide Markdown-Sonderzeichen, wenn möglich.`
    };

    // Wir setzen die System-Nachricht GANZ AN DEN ANFANG des Arrays, das an Ollama geht.
    const messagesForAI = [systemMessage, ...messages];

    // ============================================================
    // 6. OLLAMA ANRUFEN
    // Wir übergeben 'messagesForAI' anstelle von 'messages'
    // ============================================================
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        messages: messagesForAI, 
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      return NextResponse.json({ error: 'Ollama antwortet nicht' }, { status: 500 });
    }

    const data = await ollamaResponse.json();
    const botReply = data.message?.content || "Keine Antwort erhalten.";

    // ============================================================
    // 7. BOT-NACHRICHT SPEICHERN
    // ============================================================
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

    // ============================================================
    // 8. ANTWORT ZURÜCK ANS FRONTEND
    // ============================================================
    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
