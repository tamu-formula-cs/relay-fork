import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function loadCredentials() {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading credentials:', error);
    throw new Error('Failed to load credentials');
  }
}

async function exchangeCodeForToken(code: string) {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token stored to', TOKEN_PATH);
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
