'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
  currentSessionId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function ChatSidebar({ open, onClose, currentSessionId, onSelect, onNew }: ChatSidebarProps) {
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
    if (open) loadSessions();
  }, [open]);

  return (
    <div
      className={`absolute inset-y-0 left-0 z-40 w-72 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    > 
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-semibold">Chats</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onNew}>New</Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close sidebar">✕</Button>
        </div>
      </div>
      <div className="p-2">
        {loading && <div className="text-sm text-muted-foreground p-2">Loading…</div>}
        {(!loading && sessions.length === 0) && (
          <div className="text-sm text-muted-foreground p-2">No chats yet</div>
        )}
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent ${currentSessionId === s.id ? 'bg-accent' : ''}`}
                onClick={() => onSelect(s.id)}
              >
                <div className="text-sm truncate">{s.title || 'Untitled chat'}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(s.updated_at || s.created_at).toLocaleString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
