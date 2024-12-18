import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { loadCredentials } from '../../../lib/google-auth';

// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
// const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const TOKEN_URL = process.env.TOKEN_BLOB_URL;

// async function loadCredentials() {
//   try {
//     const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
//     return JSON.parse(content);
//   } catch (error) {
//     console.error('Error loading credentials:', error);
//     throw new Error('Failed to load credentials');
//   }
// }

async function exchangeCodeForToken(code: string) {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  if (!TOKEN_URL) {
    throw new Error('token is undefined.');
  }

  try {
    const tokenResponse = await fetch(TOKEN_URL);
    if (!tokenResponse.ok) {
      throw new Error('Token not found. Please authorize the application first.');
    }
    const token = await tokenResponse.json();
    oAuth2Client.setCredentials(token);
  } catch (error) {
    console.error('Error loading token:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    await exchangeCodeForToken(code);
    return NextResponse.json({ message: 'Authorization successful! You can close this window.' });
  }

  return NextResponse.json({ error: 'No code provided' }, { status: 400 });
}
