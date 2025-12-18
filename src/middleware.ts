import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof res.cookies.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if user is accessing auth pages
  if (req.nextUrl.pathname.startsWith('/auth/')) {
    if (session) {
      return NextResponse.redirect(new URL('/chat', req.url));
    }
    return res;
  }

  // Check if user is accessing protected routes
  if (
    req.nextUrl.pathname.startsWith('/chat') ||
    req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/api/')
  ) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/chat/:path*', '/admin/:path*', '/api/:path*', '/auth/:path*'],
};
