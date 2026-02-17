import { google } from 'googleapis';
import { sql } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }
  return { clientId, clientSecret };
}

/**
 * Build an OAuth2 client for the given user, loading tokens from tool_configs.
 * Automatically refreshes expired tokens and persists the new credentials.
 */
export async function getOAuth2Client(userId: string) {
  const { clientId, clientSecret } = getClientCredentials();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Load stored tokens
  const rows = await sql`
    SELECT data_encrypted FROM tool_configs
    WHERE user_id = ${userId} AND tool = 'google_oauth'
  `;

  if (rows.length === 0) {
    throw new Error('Google account not connected. Please connect via Settings.');
  }

  const tokens = JSON.parse(await decrypt(rows[0].data_encrypted));
  oauth2.setCredentials(tokens);

  // Listen for token refresh events and persist them
  oauth2.on('tokens', async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    const encrypted = await encrypt(JSON.stringify(merged));
    await sql`
      UPDATE tool_configs
      SET data_encrypted = ${encrypted}, updated_at = NOW()
      WHERE user_id = ${userId} AND tool = 'google_oauth'
    `;
  });

  return oauth2;
}

/**
 * Generate the Google OAuth consent URL
 */
export function getAuthUrl(state?: string): string {
  const { clientId, clientSecret } = getClientCredentials();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: state || 'default',
  });
}

/**
 * Exchange an authorization code for tokens and store them
 */
export async function exchangeCodeForTokens(code: string, userId: string) {
  const { clientId, clientSecret } = getClientCredentials();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2.getToken(code);

  const encrypted = await encrypt(JSON.stringify(tokens));

  await sql`
    INSERT INTO tool_configs (user_id, tool, data_encrypted)
    VALUES (${userId}, 'google_oauth', ${encrypted})
    ON CONFLICT (user_id, tool)
    DO UPDATE SET data_encrypted = ${encrypted}, updated_at = NOW()
  `;

  return tokens;
}

// ── Gmail helpers ──

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export async function sendEmail(userId: string, params: SendEmailParams) {
  const auth = await getOAuth2Client(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const headers = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/html; charset=utf-8',
  ];
  if (params.cc) headers.push(`Cc: ${params.cc}`);
  if (params.bcc) headers.push(`Bcc: ${params.bcc}`);

  const raw = Buffer.from(headers.join('\r\n') + '\r\n\r\n' + params.body)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { messageId: result.data.id, threadId: result.data.threadId };
}

export interface ListEmailsParams {
  query?: string;
  maxResults?: number;
}

export async function listEmails(userId: string, params: ListEmailsParams = {}) {
  const auth = await getOAuth2Client(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: params.query || '',
    maxResults: params.maxResults || 10,
  });

  const messages = res.data.messages || [];
  const results = [];

  for (const msg of messages.slice(0, 10)) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });

    const headers = detail.data.payload?.headers || [];
    results.push({
      id: msg.id,
      threadId: msg.threadId,
      subject: headers.find((h) => h.name === 'Subject')?.value || '',
      from: headers.find((h) => h.name === 'From')?.value || '',
      date: headers.find((h) => h.name === 'Date')?.value || '',
      snippet: detail.data.snippet || '',
    });
  }

  return results;
}

// ── Calendar helpers ──

export interface ListCalendarEventsParams {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

export async function listCalendarEvents(
  userId: string,
  params: ListCalendarEventsParams = {}
) {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: params.timeMin || new Date().toISOString(),
    timeMax: params.timeMax,
    maxResults: params.maxResults || 20,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map((event) => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location,
    attendees: event.attendees?.map((a) => a.email),
    htmlLink: event.htmlLink,
  }));
}

export interface CreateCalendarEventParams {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export async function createCalendarEvent(
  userId: string,
  params: CreateCalendarEventParams
) {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.start },
      end: { dateTime: params.end },
      attendees: params.attendees?.map((email) => ({ email })),
    },
  });

  return {
    id: event.data.id,
    summary: event.data.summary,
    htmlLink: event.data.htmlLink,
    start: event.data.start?.dateTime,
    end: event.data.end?.dateTime,
  };
}
