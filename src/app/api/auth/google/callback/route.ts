
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar-service';

// TODO: In a real app, you would have a service to save and retrieve tokens for a user.
// e.g., import { saveUserTokens } from '@/lib/user-token-service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Optional: for security

    if (!code) {
        return NextResponse.json({ error: 'Authorization code not found.' }, { status: 400 });
    }

    try {
        // Exchange the authorization code for tokens
        const tokens = await exchangeCodeForTokens(code);
        
        // TODO: At this point, you MUST associate these tokens with the logged-in user.
        // 1. Get the user's ID (e.g., from the session or by decoding the 'state' parameter).
        // const userId = getUserIdFromState(state);
        // 2. Securely store the `tokens` (access_token, refresh_token, expiry_date) in your database (e.g., Firestore)
        //    linked to the `userId`. The refresh_token is especially important as it allows
        //    your app to get new access_tokens without asking the user to log in again.
        // await saveUserTokens(userId, tokens);

        console.log('Received tokens:', tokens);
        
        // Redirect the user back to a page in your app, e.g., the settings or tasks page.
        return NextResponse.redirect(new URL('/tasks', req.url));

    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        return NextResponse.json({ error: 'Failed to authenticate with Google.' }, { status: 500 });
    }
}
