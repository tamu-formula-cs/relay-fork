import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { loadCredentials } from '../../lib/google-auth';
import { denyUnlessAdmin } from '../../lib/requireUser';

export const dynamic = 'force-dynamic';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/pubsub'];

// async function loadCredentials() {
//   try {
//     const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
//     return JSON.parse(content);
//   } catch (error) {
//     console.error('Error loading credentials:', error);
//     throw new Error('Failed to load credentials');
//   }
// }

async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  // console.log(redirect_uris[0])
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    redirect_uri: redirect_uris[0],
    prompt: 'consent'
  });
  
  return NextResponse.redirect(url);
}

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  return await authorize();
}
