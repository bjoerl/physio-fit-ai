// src/components/PainLogger.tsx
'use client'; 

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, Save, AlertCircle } from 'lucide-react'; 

export default function PainLogger() {
  const [level, setLevel] = useState(5);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    if (!location.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte gib eine Körperstelle an.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const supabase = createClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Du musst eingeloggt sein, um zu speichern!');
      }

      // SAUBERER INSERT: Ohne .select() und ohne console.logs
      const { error } = await supabase
        .from('pain_logs')
        .insert([
          { 
            pain_level: level, 
            location: location,
            user_id: user.id 
          }
        ]);

      if (error) throw error;

      setStatusMessage({ type: 'success', text: 'Eintrag gespeichert!' });
      setLocation(''); 
      setLevel(5); 

      // Automatischer Reload für das Chart
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Fehler beim Speichern.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. KÖRPERSTELLE EINGABE */}
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

      {/* 2. SCHMERZ-LEVEL SLIDER */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Wie stark ist der Schmerz?
          </label>
          <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
            level <= 3 ? 'bg-green-100 text-green-700' :
            level <= 7 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {level} / 10
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={level}
          onChange={(e) => setLevel(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>😊 Kein Schmerz (0)</span>
          <span>😫 Unerträglich (10)</span>
        </div>
      </div>

      {/* 3. FEEDBACK NACHRICHTEN */}
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
        disabled={isSubmitting}
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
  );
}
