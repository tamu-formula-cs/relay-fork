import { gmail_v1, google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { loadOAuthClient } from '../../../lib/google-auth';

interface PartialEmailData {
  body: string;
  attachments: {
    filename: string;
    mimeType: string;
    data: string
  }[];
}

interface CompleteEmailData extends PartialEmailData {
  sender: string;
  subject: string;
  snippet: string;
}

async function extractEmailData(
  payload: gmail_v1.Schema$MessagePart,
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<PartialEmailData> {

  let body = '';
  const attachments: { filename: string; mimeType: string; data: string }[] = [];

  if (payload.body && payload.body.data) {
    const encodedBody = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
    body = Buffer.from(encodedBody, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {

      if (part.mimeType?.startsWith('multipart/')) {
        const nestedData = await extractEmailData(part, gmail, messageId);
        body += nestedData.body;
        attachments.push(...nestedData.attachments);
      }

      if (part.mimeType === 'text/plain') {
        const nestedData = await extractEmailData(part, gmail, messageId);
        if (nestedData.body) {
          body += nestedData.body;
        }
      }

      if (part.filename && part.body?.attachmentId) {

        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId
        });

        // gmail api sends URL safe base64 strings for attachment data
        // fix: replace all '-' with '+', all '_' with '/', pad with '=' until string is multiple of 4
        const transformed = attachment.data.data!.replace(/-/g, '+').replace(/_/g, '/');
        const paddingLength = (4 - (transformed.length % 4)) % 4;
        const attachmentData = transformed + '='.repeat(paddingLength);

        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'unknown',
          data: attachmentData || ''
        });
      }
    }
  }

  return { body, attachments };
}

async function fetchEmails(
  auth: OAuth2Client,
  historyId: string
): Promise<CompleteEmailData[]> {

  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${historyId}`,
    maxResults: 1
  });

  // const test_msg_id = process.env.TEST_HISTORY_ID;

  const messages = res.data.messages || [];
  const emailData: CompleteEmailData[] = [];

  for (const message of messages) {
    if (message.id) {

      console.log(message.id);
      const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
      // const msg = await gmail.users.messages.get({ userId: 'me', id: test_msg_id });

      const payload = msg.data.payload;

      if (!payload) continue;

      const headers = payload.headers || [];
      const sender = headers.find(header => header.name === 'From')?.value || 'No sender';
      const subject = headers.find(header => header.name === 'Subject')?.value || 'No subject';
      const snippet = msg.data.snippet || '';

      const { body, attachments } = await extractEmailData(payload, gmail, message.id);

      emailData.push({
        sender,
        subject,
        snippet,
        body,
        attachments
      });
    }
  }

  // return listMessages;
  return emailData;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const historyId = searchParams.get('historyId');

    if (!historyId) {
      return NextResponse.json({ error: 'Missing historyId parameter' }, { status: 400 });
    }

    const auth: OAuth2Client = await loadOAuthClient();
    const emails = await fetchEmails(auth, historyId);
    return NextResponse.json(emails);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching emails:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
