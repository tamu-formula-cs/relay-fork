import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { loadCredentials } from '../../../lib/google-auth';
import { put } from '@vercel/blob';
import prisma from '../../../lib/prisma';

async function exchangeCodeForToken(code: string) {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const { tokens } = await oAuth2Client.getToken(code);

  const blob = await put('token', JSON.stringify(tokens), { access: 'public', allowOverwrite: true });
  if (!blob.url) throw new Error('Failed to upload token to blob storage.');

  await prisma.token.upsert({
    where: { id: 1 },
    create: { url: blob.url },
    update: { url: blob.url },
  });

  return tokens;
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
