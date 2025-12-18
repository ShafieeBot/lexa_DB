'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Don't show header on login page
  if (pathname === '/login' || pathname === '/auth/login') {
    return null;
  }

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Sidebar toggle (burger) */}
          <button
            aria-label="Toggle chat history"
            className="p-2 rounded-md border hover:bg-accent"
            onClick={() => {
              // Tell the chat page to toggle its sidebar
              try {
                // @ts-ignore - custom event name
                window.dispatchEvent(new Event('lexa-toggle-sidebar'));
              } catch {}
              // If not on chat page, navigate there first
              if (pathname !== '/chat') router.push('/chat');
            }}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Lexa DB</h1>
          
          {user && (
            <nav className="flex space-x-2">
              <Button
                variant={pathname === '/chat' ? 'default' : 'ghost'}
                onClick={() => router.push('/chat')}
              >
                Chat
              </Button>
              
              {isAdmin && (
                <Button
                  variant={pathname === '/admin' ? 'default' : 'ghost'}
                  onClick={() => router.push('/admin')}
                >
                  Admin
                </Button>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
