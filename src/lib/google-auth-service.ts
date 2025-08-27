
'use server';

/**
 * @fileOverview Service functions for managing Google OAuth tokens in Firestore.
 */
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Credentials } from 'google-auth-library';

const getUserDocRef = (userId: string) => doc(db, "users", userId);

/**
 * Saves the user's Google OAuth tokens to their document in Firestore.
 * @param userId The ID of the user.
 * @param tokens The OAuth2 tokens from Google.
 */
export const saveUserTokens = async (userId: string, tokens: Credentials): Promise<void> => {
    if (!userId) {
        throw new Error("User ID is required to save tokens.");
    }
    const userDocRef = getUserDocRef(userId);
    // Storing tokens in a sub-object for better organization
    await setDoc(userDocRef, { googleTokens: tokens }, { merge: true });
    console.log(`[GoogleAuthService] Successfully saved tokens for user ${userId}`);
};

/**
 * Retrieves the user's Google OAuth tokens from Firestore.
 * @param userId The ID of the user.
 * @returns The stored tokens, or null if not found.
 */
export const getUserTokens = async (userId: string): Promise<Credentials | null> => {
    if (!userId) {
        throw new Error("User ID is required to retrieve tokens.");
    }
    const userDocRef = getUserDocRef(userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        console.warn(`[GoogleAuthService] User document not found for user ${userId}`);
        return null;
    }

    const userData = userDoc.data();
    const tokens = userData.googleTokens || null;
    
    if (tokens && tokens.expiry_date && tokens.expiry_date < Date.now()) {
        console.log(`[GoogleAuthService] Tokens for user ${userId} have expired.`);
    }

    return tokens;
};
