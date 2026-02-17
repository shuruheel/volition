import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/integrations/google';

/**
 * GET /api/auth/google
 * Redirects to Google OAuth consent screen
 */
export async function GET() {
  try {
    const url = getAuthUrl('settings');
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start OAuth flow' },
      { status: 500 }
    );
  }
}
