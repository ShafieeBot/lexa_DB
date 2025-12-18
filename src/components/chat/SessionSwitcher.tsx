'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionSwitcherProps {
  currentSessionId?: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

export default function SessionSwitcher({ currentSessionId, onSelect, onNew }: SessionSwitcherProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 border rounded-md px-2 bg-background"
        value={currentSessionId || ''}
        onChange={(e) => {
          const val = e.target.value;
          if (val) onSelect(val);
        }}
      >
        <option value="" disabled>
          {loading ? 'Loading…' : 'Select chat'}
        </option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title || new Date(s.created_at).toLocaleString()}
          </option>
        ))}
      </select>
      <Button variant="outline" size="sm" onClick={onNew}>New Chat</Button>
    </div>
  );
}
