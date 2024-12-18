import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/pubsub'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadCredentials() {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading credentials:', error);
    throw new Error('Failed to load credentials');
  }
}

async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  // console.log(redirect_uris[0])
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    redirect_uri: redirect_uris[0],
    prompt: 'select_account'
  });
  
  return NextResponse.redirect(url);
}

export async function GET() {
  return await authorize();
}
