
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp, getDoc, addDoc, query, orderBy, onSnapshot, Unsubscribe, where, limit } from "firebase/firestore";
import type { Goal, WeeklySchedule, GoalTemplate, ScheduleTemplate, GoalStatus, AppUser } from "@/types";

// Firestore data converter for Users
const userConverter = {
    toFirestore: (user: AppUser) => {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            telegramId: user.telegramId,
        };
    },
    fromFirestore: (snapshot: any, options: any): AppUser => {
        const data = snapshot.data(options);
        return {
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            telegramId: data.telegramId,
        };
    }
};


// Firestore data converter for Goals
const goalConverter = {
    toFirestore: (goal: Goal) => {
        const data: any = { ...goal };
        if (goal.dueDate) {
            data.dueDate = Timestamp.fromDate(goal.dueDate);
        } else {
            delete data.dueDate;
        }

        if (!data.createdAt) {
            data.createdAt = Timestamp.now();
        }
        
        if (!data.category) {
            data.category = 'General';
        }

        if (goal.subGoals) {
            data.subGoals = goal.subGoals.map(sg => {
                const subGoalData: any = {...sg};
                 if (!subGoalData.category) {
                    subGoalData.category = 'General';
                }
                if (sg.dueDate) {
                    subGoalData.dueDate = Timestamp.fromDate(sg.dueDate);
                } else {
                    delete subGoalData.dueDate;
                }
                return subGoalData;
            });
        }
        return data;
    },
    fromFirestore: (snapshot: any, options: any): Goal => {
        const data = snapshot.data(options);
        const goal: Goal = {
             id: snapshot.id,
             title: data.title,
             status: data.status,
             priority: data.priority,
             category: data.category || 'General',
             description: data.description,
             subGoals: data.subGoals || [],
             estimatedTime: data.estimatedTime,
             createdAt: data.createdAt, // Keep timestamp for sorting
        };
        if (data.dueDate) {
            goal.dueDate = (data.dueDate as Timestamp).toDate();
        }
        if (data.subGoals) {
            goal.subGoals = data.subGoals.map((sg: any) => {
                const subGoal: Goal = { ...sg };
                if (sg.dueDate) {
                    subGoal.dueDate = (sg.dueDate as Timestamp).toDate();
                }
                return subGoal;
            });
        }
        return goal;
    }
};

// Firestore data converter for Goal Templates
const goalTemplateConverter = {
    toFirestore: (template: Omit<GoalTemplate, 'id'>) => {
        return {
            ...template,
            createdAt: Timestamp.now(),
        };
    },
    fromFirestore: (snapshot: any, options: any): GoalTemplate => {
        const data = snapshot.data(options);
        return {
            ...data,
            id: snapshot.id,
            createdAt: data.createdAt,
        };
    }
};


// Firestore data converter for Schedules
const scheduleConverter = {
    toFirestore: (schedule: WeeklySchedule) => {
        return {
            ...schedule,
            lastUpdatedAt: Timestamp.now(),
        };
    },
    fromFirestore: (snapshot: any, options: any): WeeklySchedule => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            scheduleData: data.scheduleData,
            createdAt: data.createdAt,
        };
    }
};

// Firestore data converter for Schedule Templates
const scheduleTemplateConverter = {
    toFirestore: (template: Omit<ScheduleTemplate, 'id'>) => {
        return {
            ...template,
            createdAt: Timestamp.now(),
        };
    },
    fromFirestore: (snapshot: any, options: any): ScheduleTemplate => {
        const data = snapshot.data(options);
        return {
            ...data,
            id: snapshot.id,
        } as ScheduleTemplate;
    }
};

const getUsersCollection = () => {
    return collection(db, "users").withConverter(userConverter);
}

const getGoalsCollection = (userId: string) => {
    return collection(db, "users", userId, "goals").withConverter(goalConverter);
}

const getGoalTemplatesCollection = () => {
    return collection(db, "goal_templates").withConverter(goalTemplateConverter);
}

const getSchedulesCollection = (userId: string) => {
    return collection(db, "users", userId, "schedules").withConverter(scheduleConverter);
}

const getScheduleTemplatesCollection = (userId: string) => {
    return collection(db, "users", userId, "schedule_templates").withConverter(scheduleTemplateConverter);
}

// --- USER-RELATED FUNCTIONS ---

// Find a user by their Telegram ID
export const findUserByTelegramId = async (telegramId: string): Promise<AppUser | null> => {
    const usersCollection = getUsersCollection();
    const q = query(usersCollection, where("telegramId", "==", telegramId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
};

// Link a telegram ID to a user account
export const linkTelegramAccount = async (userId: string, telegramId: string): Promise<{success: boolean, message: string}> => {
    // Check if another user already has this telegram ID
    const existingUser = await findUserByTelegramId(telegramId);
    if (existingUser && existingUser.uid !== userId) {
        return { success: false, message: "This Telegram account is already linked to another user." };
    }

    const usersCollection = getUsersCollection();
    const userRef = doc(usersCollection, userId);
    
    // Create user doc if it doesn't exist (e.g. for guest accounts)
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        await setDoc(userRef, { uid: userId, telegramId });
    } else {
        await setDoc(userRef, { telegramId }, { merge: true });
    }

    return { success: true, message: "Account linked successfully!" };
};


// --- GOAL-RELATED FUNCTIONS ---

// Get all goals for a user with real-time updates
export const getGoals = (
    userId: string, 
    callback: (goals: Goal[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const goalsCollection = getGoalsCollection(userId);
    const q = query(goalsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const goals = querySnapshot.docs.map(doc => doc.data());
        callback(goals);
    }, (error) => {
        console.error("Error listening to goals collection: ", error);
        onError(error);
    });

    return unsubscribe;
};

// Get a one-time snapshot of goals (for server-side operations)
export const getGoalsSnapshot = async (userId: string): Promise<Goal[]> => {
    const goalsCollection = getGoalsCollection(userId);
    const q = query(goalsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

// Add a single goal
export const addGoal = async (userId: string, goalData: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> => {
    const goalsCollection = getGoalsCollection(userId);
    const newDocRef = doc(goalsCollection);
    const newGoal: Goal = { 
        ...goalData, 
        id: newDocRef.id,
        status: goalData.status || 'todo',
        priority: goalData.priority || 'medium',
        category: goalData.category || 'General',
        subGoals: goalData.subGoals || [],
        createdAt: Timestamp.now(),
    };
    await setDoc(newDocRef, newGoal);
    return newGoal;
};

// Add multiple goals
export const addGoals = async (userId: string, goalsData: Omit<Goal, 'id' | 'createdAt'>[]): Promise<Goal[]> => {
    const goalsCollection = getGoalsCollection(userId);
    const batch = writeBatch(db);
    const newGoals: Goal[] = [];

    goalsData.forEach(goalData => {
        const newDocRef = doc(goalsCollection);
        const newGoal: Goal = { 
            ...goalData, 
            id: newDocRef.id,
            status: goalData.status || 'todo',
            priority: goalData.priority || 'medium',
            category: goalData.category || 'General',
            subGoals: goalData.subGoals || [],
            createdAt: Timestamp.now(),
        };
        batch.set(newDocRef, newGoal);
        newGoals.push(newGoal);
    });

    await batch.commit();
    return newGoals;
};


// Update a goal
export const updateGoal = async (userId: string, goal: Goal): Promise<void> => {
    const goalsCollection = getGoalsCollection(userId);
    const docRef = doc(goalsCollection, goal.id);
    await setDoc(docRef, goal, { merge: true });
};

// Delete a goal
export const deleteGoal = async (userId: string, goalId: string): Promise<void> => {
    const goalsCollection = getGoalsCollection(userId);
    const docRef = doc(goalsCollection, goalId);
    await deleteDoc(docRef);
};


// --- SCHEDULE-RELATED FUNCTIONS ---

// Save a weekly schedule
export const saveSchedule = async (userId: string, schedule: WeeklySchedule): Promise<void> => {
    const schedulesCollection = getSchedulesCollection(userId);
    // We use a fixed ID to ensure only one schedule per user.
    const docRef = doc(schedulesCollection, 'current_week');
    await setDoc(docRef, schedule);
};

// Get the current weekly schedule
export const getSchedule = async (userId: string): Promise<WeeklySchedule | null> => {
    const schedulesCollection = getSchedulesCollection(userId);
    const docRef = doc(schedulesCollection, 'current_week');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
};


// --- GOAL TEMPLATE FUNCTIONS ---

// Get all goal templates
export const getGoalTemplates = async (): Promise<GoalTemplate[]> => {
    const templatesCollection = getGoalTemplatesCollection();
    const snapshot = await getDocs(query(templatesCollection, orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => doc.data());
};

// Add a new goal template
export const addGoalTemplate = async (templateData: Omit<GoalTemplate, 'id' | 'createdAt'>): Promise<GoalTemplate> => {
    const templatesCollection = getGoalTemplatesCollection();
    const newDocRef = doc(templatesCollection);
    const newTemplate: GoalTemplate = { 
        ...templateData, 
        id: newDocRef.id,
        createdAt: Timestamp.now(),
    };
    await setDoc(newDocRef, newTemplate);
    return newTemplate;
};


// --- SCHEDULE TEMPLATE FUNCTIONS ---

// Get all schedule templates for a user
export const getScheduleTemplates = async (userId: string): Promise<ScheduleTemplate[]> => {
    const templatesCollection = getScheduleTemplatesCollection(userId);
    const q = query(templatesCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

// Add a new schedule template
export const addScheduleTemplate = async (userId: string, templateData: Omit<ScheduleTemplate, 'id'>): Promise<ScheduleTemplate> => {
    const templatesCollection = getScheduleTemplatesCollection(userId);
    const newDocRef = await addDoc(templatesCollection, templateData);
    return {
        ...templateData,
        id: newDocRef.id,
    };
};

// Delete a schedule template
export const deleteScheduleTemplate = async (userId: string, templateId: string): Promise<void> => {
    const templatesCollection = getScheduleTemplatesCollection(userId);
    const docRef = doc(templatesCollection, templateId);
    await deleteDoc(docRef);
};
