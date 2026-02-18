import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - / (landing page - public)
     * - /api/auth (NextAuth routes)
     * - /login (sign-in page)
     * - /api/twilio (Twilio webhooks - unauthenticated)
     * - /api/telegram (Telegram webhooks - unauthenticated)
     * - /api/scheduler/tick (Cron job - uses secret)
     * - /_next (Next.js internals)
     * - /favicon.ico, /sitemap.xml, /robots.txt (static files)
     *
     * Note: .+ (not .*) ensures the root path / is excluded from middleware
     */
    '/((?!api/auth|login|api/twilio|api/telegram|api/scheduler|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt).+)',
  ],
};
