
import prisma from "@/lib/prisma";
import type { AppUser } from "@/types";
import { adminApp } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export const findUserByTelegramId = async (telegramId: number): Promise<AppUser | null> => {
    return await prisma.user.findUnique({
        where: { telegramId: String(telegramId) },
    });
};

export const findUserByFirebaseUid = async (firebaseUid: string): Promise<AppUser | null> => {
    return await prisma.user.findUnique({
        where: { firebaseUid },
    });
};

export const createUserFromTelegramData = async (telegramData: any): Promise<AppUser> => {
    if (!adminApp) throw new Error("Firebase Admin not initialized");
    const auth = getAuth(adminApp);
    
    // Create or get Firebase Auth user
    const firebaseUid = `tg-${telegramData.id}`;
    let firebaseUser;
    try {
        firebaseUser = await auth.getUser(firebaseUid);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            firebaseUser = await auth.createUser({
                uid: firebaseUid,
                displayName: `${telegramData.first_name} ${telegramData.last_name || ''}`.trim(),
                photoURL: telegramData.photo_url,
            });
        } else {
            throw error;
        }
    }

    // Create or update user in our database
    const newUser = await prisma.user.upsert({
        where: { telegramId: String(telegramData.id) },
        update: {
            displayName: `${telegramData.first_name} ${telegramData.last_name || ''}`.trim(),
            firebaseUid: firebaseUser.uid,
        },
        create: {
            telegramId: String(telegramData.id),
            displayName: `${telegramData.first_name} ${telegramData.last_name || ''}`.trim(),
            firebaseUid: firebaseUser.uid,
        }
    });
    
    return newUser;
};

export const linkTelegramToUser = async (firebaseUid: string, telegramId: number) => {
    const existingUser = await findUserByTelegramId(telegramId);
    if (existingUser && existingUser.firebaseUid !== firebaseUid) {
        throw new Error("This Telegram account is already linked to another user.");
    }

    const user = await findUserByFirebaseUid(firebaseUid);
    if (!user) {
        throw new Error("User not found.");
    }
    
    await prisma.user.update({
        where: { id: user.id },
        data: { telegramId: String(telegramId) },
    });
};

export const getOrCreateUser = async (firebaseUser: { uid: string, email?: string | null, displayName?: string | null }): Promise<AppUser> => {
    const user = await prisma.user.findUnique({ where: { firebaseUid: firebaseUser.uid } });
    if (user) {
        return user;
    }
    
    // Create new user in our DB if they don't exist
    return await prisma.user.create({
        data: {
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
        }
    });
};
