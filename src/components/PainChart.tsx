// src/components/PainChart.tsx
'use client'; 

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PainLog {
  id: number;
  created_at: string;
  pain_level: number;
  location: string;
}

export default function PainChart() {
  const [data, setData] = useState<PainLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPainLogs = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: logs, error } = await supabase
        .from('pain_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }); 

      if (error) {
        console.error('Fehler beim Laden der Schmerzdaten:', error);
      } else if (logs) {
        const formattedData = logs.map((log) => ({
          ...log,
          displayDate: new Date(log.created_at).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit'
          })
        }));
        setData(formattedData);
      }
      setIsLoading(false);
    };

    fetchPainLogs();
  }, []);

  if (isLoading) {
    return (
      <div className="h-64 w-full bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400 animate-pulse">
        Lade Schmerzdaten...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 w-full bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500">
        Noch keine Schmerz-Einträge vorhanden. Trag rechts etwas ein!
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Dein Schmerzverlauf</h3>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              tickLine={false}
              axisLine={false}
              dy={10} 
            />
            <YAxis 
              domain={[0, 10]} 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              dx={-10} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 'bold', color: '#374151' }}
            />
            <Line 
              type="monotone" 
              dataKey="pain_level" 
              name="Schmerzlevel"
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
