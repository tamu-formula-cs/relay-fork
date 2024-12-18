import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { loadOAuthClient } from '../../../lib/google-auth';


export async function GET() {
  try {
    const auth = await loadOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const topicName = process.env.TOPIC_NAME;

    const request = {
      'labelIds': ['INBOX'],
      'topicName': topicName,
      'labelFilterBehavior': 'INCLUDE'
    }

    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: request
    });

    console.log('Watch Response:', res.data);
    return NextResponse.json({ data: res.data });
  } catch (error) {
    const err = error as Error;
    console.error('Error starting Gmail watch:', error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}