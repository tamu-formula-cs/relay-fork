import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

export const loadCredentials = async () => {
    try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
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

    // Load existing token
    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
        oAuth2Client.setCredentials(JSON.parse(token));
    } else {
        throw new Error('Token not found. Please authorize the application first.');
    }

    // Refresh token
    const now = (new Date()).getTime();
    const expiryDate = oAuth2Client.credentials.expiry_date || 0;

    if (expiryDate <= now + 5 * 60 * 1000) {
        const newTokens = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newTokens.credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(oAuth2Client.credentials, null, 2));
    }

    return oAuth2Client;
};