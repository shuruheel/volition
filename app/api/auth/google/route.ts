import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/integrations/google';

/**
 * GET /api/auth/google
 * Redirects to Google OAuth consent screen
 */
export async function GET() {
  try {
    // Check if Google OAuth env vars are configured before attempting redirect
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${appUrl}/settings?google=error&reason=missing_credentials`
      );
    }

    const url = getAuthUrl('settings');
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Google OAuth error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/settings?google=error&reason=token_exchange_failed`
    );
  }
}
