
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, query, where, limit, getDocs } from "firebase/firestore";
import type { AppUser } from "@/types";
import { adminApp } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

// This file contains functions that use the Firebase Admin SDK
// and should ONLY be called from the server (e.g., API routes).

// Firestore data converter for Users
const userConverter = {
    toFirestore: (user: AppUser) => {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            telegramId: (user as any).telegramId, // Store telegramId if exists
        };
    },
    fromFirestore: (snapshot: any, options: any): AppUser => {
        const data = snapshot.data(options);
        return {
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            ...data
        };
    }
};

const getUsersCollection = () => {
    return collection(db, "users").withConverter(userConverter);
}


export const findUserByTelegramId = async (telegramId: number): Promise<AppUser | null> => {
    const usersCollection = getUsersCollection();
    const q = query(usersCollection, where("telegramId", "==", telegramId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].data();
    }
    return null;
}

export const createUserFromTelegramData = async (telegramData: any): Promise<AppUser> => {
    if (!adminApp) throw new Error("Firebase Admin not initialized");
    const auth = getAuth(adminApp);
    const usersCollection = getUsersCollection();
    
    // Use Telegram ID as UID in Firebase Auth for simplicity
    const uid = `tg-${telegramData.id}`;
    
    let firebaseUser;
    try {
        firebaseUser = await auth.createUser({
            uid: uid,
            displayName: `${telegramData.first_name} ${telegramData.last_name || ''}`.trim(),
            photoURL: telegramData.photo_url,
        });
    } catch (error: any) {
        if (error.code === 'auth/uid-already-exists') {
            // User already exists in Firebase Auth, just fetch them
            firebaseUser = await auth.getUser(uid);
        } else {
            throw error; // Re-throw other errors
        }
    }

    const newUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null, // Telegram doesn't provide email
        displayName: firebaseUser.displayName || 'Telegram User',
        telegramId: telegramData.id,
    };

    // Create or update the user document in Firestore
    await setDoc(doc(usersCollection, firebaseUser.uid), newUser, { merge: true });
    
    return newUser;
};

export const linkTelegramToUser = async (userId: string, telegramId: number) => {
    const userRef = doc(getUsersCollection(), userId);
    const existingUser = await findUserByTelegramId(telegramId);
    if (existingUser && existingUser.uid !== userId) {
        throw new Error("This Telegram account is already linked to another user.");
    }
    await setDoc(userRef, { telegramId: telegramId }, { merge: true });
}
