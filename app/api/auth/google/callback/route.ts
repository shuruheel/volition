import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/integrations/google';
import { requireUserId } from '@/lib/auth';

/**
 * GET /api/auth/google/callback
 * Handles OAuth callback — exchanges code for tokens and stores them
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth denied:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?google=error&reason=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?google=error&reason=no_code`
      );
    }

    const userId = await requireUserId();

    await exchangeCodeForTokens(code, userId);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?google=connected`
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?google=error&reason=token_exchange_failed`
    );
  }
}
