/**
 * LinkedIn OAuth 2.0 Helper Script
 * 
 * Run this script to get your LinkedIn access token and person URN.
 * It starts a local server, opens the LinkedIn authorization page,
 * and exchanges the authorization code for an access token.
 * 
 * Usage: npx ts-node scripts/linkedin-oauth.ts
 * 
 * PREREQUISITES:
 * 1. Go to https://www.linkedin.com/developers/apps
 * 2. Select your app → "Auth" tab
 * 3. Add "http://localhost:3000/callback" to "Authorized redirect URLs"
 * 4. Under "OAuth 2.0 scopes", ensure these are enabled:
 *    - openid
 *    - profile  
 *    - w_member_social
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

/** Makes an HTTPS request and returns the response body as a string. */
function httpsRequest(
  url: string,
  options: https.RequestOptions,
  postData?: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions: https.RequestOptions = {
      ...options,
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

/** Exchanges the authorization code for an access token. */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
  });

  const postData = params.toString();
  const { body } = await httpsRequest(
    'https://www.linkedin.com/oauth/v2/accessToken',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData,
  );

  return JSON.parse(body);
}

/** Fetches the user's LinkedIn profile to get the person URN (sub). */
async function fetchUserInfo(accessToken: string): Promise<{ sub: string; name: string }> {
  const { body } = await httpsRequest('https://api.linkedin.com/v2/userinfo', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return JSON.parse(body);
}

// ─── Start local server ──────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (reqUrl.pathname === '/callback') {
    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Authorization Failed</h1><p>Error: ${error}</p>`);
      console.error(`\n❌ Authorization failed: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>❌ No authorization code received</h1>');
      server.close();
      process.exit(1);
    }

    try {
      console.log('\n📥 Authorization code received. Exchanging for access token...');

      const tokenData = await exchangeCodeForToken(code);
      console.log('\n✅ Access token obtained!');
      console.log(`   Expires in: ${tokenData.expires_in} seconds (~${Math.round(tokenData.expires_in / 86400)} days)`);

      console.log('\n👤 Fetching your LinkedIn profile...');
      const userInfo = await fetchUserInfo(tokenData.access_token);

      console.log(`   Name: ${userInfo.name}`);
      console.log(`   Person URN (sub): ${userInfo.sub}`);

      console.log('\n' + '═'.repeat(60));
      console.log('📋 ADD THESE TO YOUR .env FILE:');
      console.log('═'.repeat(60));
      console.log(`LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}`);
      console.log(`LINKEDIN_PERSON_URN=${userInfo.sub}`);
      console.log(`LINKEDIN_TOKEN_CREATED_AT=${new Date().toISOString().split('T')[0]}`);
      console.log('═'.repeat(60));

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>✅ LinkedIn Authorization Successful!</h1>
            <p>Welcome, <strong>${userInfo.name}</strong>!</p>
            <p>Your access token and person URN have been printed in the terminal.</p>
            <p style="color: #666;">You can close this tab now.</p>
          </body>
        </html>
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Token exchange failed: ${msg}`);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Token Exchange Failed</h1><p>${msg}</p>`);
    }

    setTimeout(() => { server.close(); process.exit(0); }, 2000);
    return;
  }

  // Default: show instructions
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>LinkedIn OAuth Server</h1><p>Waiting for callback...</p>');
});

server.listen(PORT, () => {
  const scopes = encodeURIComponent('openid profile w_member_social');
  const state = Math.random().toString(36).substring(7);
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${scopes}` +
    `&state=${state}`;

  console.log('═'.repeat(60));
  console.log('🔐 LinkedIn OAuth 2.0 Authorization');
  console.log('═'.repeat(60));
  console.log('');
  console.log('1. Open this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('2. Sign in with your LinkedIn account');
  console.log('3. Click "Allow" to authorize the app');
  console.log('4. You will be redirected back here automatically');
  console.log('');
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Waiting for authorization...');
});
