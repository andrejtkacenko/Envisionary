
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar-service';
import { saveUserTokens } from '@/lib/google-auth-service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // The userId we passed earlier

    if (!code) {
        return NextResponse.json({ error: 'Authorization code not found.' }, { status: 400 });
    }
    
    if (!state) {
        return NextResponse.json({ error: 'User ID (state) not found in callback.' }, { status: 400 });
    }
    
    const userId = state;

    try {
        // Exchange the authorization code for tokens
        const tokens = await exchangeCodeForTokens(code);
        
        // Securely store the tokens in Firestore, linked to the userId.
        // The refresh_token is especially important.
        await saveUserTokens(userId, tokens);

        console.log(`Successfully received and stored tokens for user: ${userId}`);
        
        // Redirect the user back to the tasks page.
        const redirectUrl = new URL('/tasks', req.url);
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        return NextResponse.json({ error: 'Failed to authenticate with Google.' }, { status: 500 });
    }
}
