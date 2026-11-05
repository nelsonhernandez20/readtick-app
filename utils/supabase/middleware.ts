import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@/lib/admin';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Avoid redirecting during Next.js production build / static page collection
  if (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    request.headers.get('x-prerender-revalidate')
  ) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if credentials are valid and configured
  const isConfigured = !!(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto') &&
    !supabaseAnonKey.includes('tu-clave')
  );

  const pathname = request.nextUrl.pathname;

  // Public routes that never require authentication:
  const isAdminRoute =
    pathname.startsWith('/cobros') || pathname.startsWith('/api/admin');

  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/pagos') ||
    pathname.startsWith('/overlay') ||
    pathname.startsWith('/api/tiktok') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico');

  // If Supabase is not configured yet with real keys, allow viewing login / demo
  if (!isConfigured) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Verify authentication with Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If NOT logged in and attempting to access protected route (e.g. '/')
  if (!user && (!isPublicRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (isAdminRoute) {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Panel de cobros: solo cuentas listadas en ADMIN_EMAILS (servidor)
  if (user && isAdminRoute && !isAdminEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'admin_only');
    return NextResponse.redirect(url);
  }

  // If ALREADY logged in and visiting '/login', redirect to dashboard
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}
