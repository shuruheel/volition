/**
 * Next.js instrumentation — runs once on server start.
 * In development, sets up a local interval to call the scheduler tick endpoint
 * (in production, Vercel Cron handles this).
 */
export async function register() {
  if (process.env.NODE_ENV === 'development' && typeof setInterval !== 'undefined') {
    // Wait for the server to start
    setTimeout(() => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      console.log('[scheduler] Starting local heartbeat interval (every 60s)');

      setInterval(async () => {
        try {
          await fetch(`${appUrl}/api/scheduler/tick`, { method: 'POST' });
        } catch {
          // Server might not be ready yet, ignore
        }
      }, 60_000);
    }, 5_000);
  }
}
