
'use server';

/**
 * @fileOverview Server actions for user-related operations.
 * These actions are safe to call from client components.
 */

import { getOrCreateUser as getOrCreateUserInDb } from '@/lib/firebase-admin-service';
import type { AppUser } from '@/types';

// This function is a server action that can be called from the client
// to safely interact with the server-side getOrCreateUser function.
export async function getAppUser(firebaseUser: { uid: string, email?: string | null, displayName?: string | null }): Promise<AppUser> {
  const user = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
  return await getOrCreateUserInDb(user);
}
