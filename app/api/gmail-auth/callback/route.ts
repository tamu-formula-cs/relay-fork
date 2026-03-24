import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { loadCredentials, getTokenUrlFromDB } from '../../../lib/google-auth';

// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
// const TOKEN_PATH = path.join(process.cwd(), 'token.json');
// const TOKEN_URL = process.env.TOKEN_BLOB_URL;

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
  
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const TOKEN_URL = await getTokenUrlFromDB();
    if (!TOKEN_URL) {
      throw new Error('Token URL is undefined.');
    }

    // Store the new tokens
    const response = await fetch(TOKEN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokens),
    });

    if (!response.ok) {
      throw new Error('Failed to store token');
    }

    return tokens;
  } catch (error) {
    console.error('Error in token exchange:', error);
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
