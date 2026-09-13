import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If someone accesses /ar/admin or /en/admin (e.g. /ar/admin/orders), redirect directly to /admin
  const adminMatch = pathname.match(/^\/(?:ar|en)(\/admin(?:\/.*)?)$/);
  if (adminMatch) {
    return NextResponse.redirect(new URL(adminMatch[1], request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  // Exclude: API routes, Next.js internals, static files, AND the /admin section
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};

