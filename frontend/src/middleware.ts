import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Exclude: API routes, Next.js internals, static files, AND the /admin section
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};
