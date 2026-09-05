import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Use Node.js runtime instead of Edge to be compatible with Vercel Services
export const runtime = 'nodejs';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
