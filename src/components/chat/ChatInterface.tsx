'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, Document } from '@/types';
import MessageDisplay from './MessageDisplay';
import ChatInput from './ChatInput';
import SourcesPanel from './SourcesPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import { PenSquare } from 'lucide-react';

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionCreate?: (sessionId: string) => void;
}

export default function ChatInterface({ sessionId, onSessionCreate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load last session id from localStorage on first mount
  useEffect(() => {
    if (!sessionId) {
      const last = typeof window !== 'undefined' ? localStorage.getItem('lexa.currentSessionId') : null;
      if (last) setCurrentSessionId(last);
    }
  }, [sessionId]);

  useEffect(() => {
    if (currentSessionId) {
      if (typeof window !== 'undefined') localStorage.setItem('lexa.currentSessionId', currentSessionId);
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        // Extract unique sources from all messages
        const allSources = data.messages
          .flatMap((msg: ChatMessage) => msg.sources || [])
          .map((src: any) => src.document)
          .filter((doc: Document, index: number, self: Document[]) =>
            index === self.findIndex((d) => d.id === doc.id)
          );
        setSources(allSources);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    setLoading(true);

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: currentSessionId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          session_id: currentSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Update session ID if this was the first message
      if (!currentSessionId) {
        setCurrentSessionId(data.session_id);
        if (typeof window !== 'undefined') localStorage.setItem('lexa.currentSessionId', data.session_id);
        onSessionCreate?.(data.session_id);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: data.message_id,
        session_id: data.session_id,
        role: 'assistant',
        content: data.answer,
        created_at: new Date().toISOString(),
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update sources
      const newSources = [...sources];
      data.sources.forEach((source: Document) => {
        if (!newSources.find((s) => s.id === source.id)) {
          newSources.push(source);
        }
      });
      setSources(newSources);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        session_id: currentSessionId || '',
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Close sidebar on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Listen for global toggle requests from the Header burger
  useEffect(() => {
    const toggle = () => setSidebarOpen((v) => !v);
    // @ts-ignore - custom event name
    window.addEventListener('lexa-toggle-sidebar', toggle as EventListener);
    return () => {
      // @ts-ignore
      window.removeEventListener('lexa-toggle-sidebar', toggle as EventListener);
    };
  }, []);

  return (
    // Subtract the sticky header height (h-16 = 4rem) so the input stays visible
    <div className="relative flex h-[calc(100vh-4rem)]">
      {/* Left chat history sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSessionId={currentSessionId || null}
        onSelect={(id) => {
          setSidebarOpen(false);
          setMessages([]);
          setSources([]);
          setCurrentSessionId(id);
        }}
        onNew={() => {
          setSidebarOpen(false);
          setMessages([]);
          setSources([]);
          setCurrentSessionId(undefined);
          if (typeof window !== 'undefined') localStorage.removeItem('lexa.currentSessionId');
        }}
      />
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Topic Header */}
        <div className="border-b bg-background p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            TOPIC: <span className="uppercase">Legal Research Assistant</span>
          </h1>
          <button
            aria-label="Start new chat"
            className="p-2 rounded-md border hover:bg-accent"
            onClick={() => {
              setMessages([]);
              setSources([]);
              setCurrentSessionId(undefined);
              if (typeof window !== 'undefined') localStorage.removeItem('lexa.currentSessionId');
            }}
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="p-6 max-w-4xl mx-auto w-full">
            {messages.length === 0 && !loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🤖</div>
                  <h2 className="text-2xl font-semibold">Welcome to Legal Research Assistant</h2>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything about legislation, regulations, and legal cases.
                    I'll find relevant documents and provide comprehensive answers.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageDisplay key={message.id} message={message} />
            ))}

            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} disabled={loading} />
      </div>

      {/* Sources Panel */}
      <div className="w-96">
        <SourcesPanel sources={sources} />
      </div>
    </div>
  );
}
