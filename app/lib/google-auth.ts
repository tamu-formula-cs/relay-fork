import { google } from 'googleapis';
import prisma from './prisma';
import { put } from '@vercel/blob';

const CREDENTIALS_URL = process.env.CREDENTIALS_BLOB_URL;

export async function getTokenUrlFromDB(): Promise<string | null> {
    const tokenRecord = await prisma.token.findFirst({
        where: { id: 1 },
    });
    return tokenRecord?.url || null;
}

async function saveTokenToBlob(token: object) {
    try {
        // Convert token object to a string for upload
        const blob = await put("token", JSON.stringify(token), {
            access: 'public',
        });

        if (!blob.url) {
            throw new Error(`Failed to save token.`);
        }
        console.log('Token updated in blob storage');
        
        await prisma.token.upsert({
            where: { id: 1 },
            create: { url: blob.url },
            update: { url: blob.url }
        });
    } catch (error) {
        console.error('Error saving token to blob:', error);
    }
}

export const loadCredentials = async () => {
    try {
        if (!CREDENTIALS_URL) {
            throw new Error('credentials are undefined.');
        }

        const response = await fetch(CREDENTIALS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch credentials: ${response.statusText}`);
        }

        const credentials = await response.json();
        return credentials;
    } catch (error) {
        console.error('Error loading credentials:', error);
        throw new Error('Failed to load credentials');
    }
};

export const loadOAuthClient = async () => {
    const credentials = await loadCredentials();
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const token_url = await getTokenUrlFromDB(); // Await the DB call

    if (!token_url) {
        throw new Error('token is undefined.');
    }

    try {
        const tokenResponse = await fetch(token_url);
        if (!tokenResponse.ok) {
            throw new Error('Token not found. Please authorize the application first.');
        }
        const token = await tokenResponse.json();
        oAuth2Client.setCredentials(token);
    } catch (error) {
        console.error('Error loading token:', error);
        throw error;
    }

    // Refresh token if about to expire
    const now = Date.now();
    const expiryDate = oAuth2Client.credentials.expiry_date || 0;

    if (expiryDate <= now + 5 * 60 * 1000) {
        const newTokens = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newTokens.credentials);
        await saveTokenToBlob(oAuth2Client.credentials);
    }

    return oAuth2Client;
};