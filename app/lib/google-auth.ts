import { google } from 'googleapis';

const CREDENTIALS_URL = process.env.CREDENTIALS_BLOB_URL;
const TOKEN_URL = process.env.TOKEN_BLOB_URL;

export const loadCredentials = async () => {
    try {
        if (!CREDENTIALS_URL) {
            throw new Error('credentials are undefined.');
        }

        const response = await fetch(CREDENTIALS_URL);
        if (!response.ok) {
            throw new Error(`Failed to felltch credentials: ${response.statusText}`);
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

    // Load existing token
    // if (fs.existsSync(TOKEN_PATH)) {
    //     const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
    //     oAuth2Client.setCredentials(JSON.parse(token));
    // } else {
    //     throw new Error('Token not found. Please authorize the application first.');
    // }

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

    // Refresh token
    const now = (new Date()).getTime();
    const expiryDate = oAuth2Client.credentials.expiry_date || 0;

    if (expiryDate <= now + 5 * 60 * 1000) {
        const newTokens = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newTokens.credentials);
        await saveTokenToBlob(oAuth2Client.credentials);
    }

    return oAuth2Client;
};

export const saveTokenToBlob = async (token: object) => {
    try {

        if (!TOKEN_URL) {
            throw new Error('token is undefined.');
        }

        const response = await fetch(TOKEN_URL!, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(token),
        });
        if (!response.ok) {
            throw new Error(`Failed to save token: ${response.statusText}`);
        }
        console.log('Token updated in blob storage');
    } catch (error) {
        console.error('Error saving token to blob:', error);
    }
};