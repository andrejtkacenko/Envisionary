
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp, getDoc } from "firebase/firestore";
import type { Goal, WeeklySchedule } from "@/types";

// Firestore data converter for Goals
const goalConverter = {
    toFirestore: (goal: Goal) => {
        const data: any = { ...goal };
        if (goal.dueDate) {
            data.dueDate = Timestamp.fromDate(goal.dueDate);
        } else {
            delete data.dueDate;
        }

        if (goal.subGoals) {
            data.subGoals = goal.subGoals.map(sg => {
                const subGoalData: any = {...sg};
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
        const goal: Goal = { ...data, id: snapshot.id };
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

// Firestore data converter for Schedules
const scheduleConverter = {
    toFirestore: (schedule: WeeklySchedule) => {
        return {
            ...schedule,
            createdAt: Timestamp.now(),
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


const getGoalsCollection = (userId: string) => {
    return collection(db, "users", userId, "goals").withConverter(goalConverter);
}

const getSchedulesCollection = (userId: string) => {
    return collection(db, "users", userId, "schedules").withConverter(scheduleConverter);
}


// --- GOAL-RELATED FUNCTIONS ---

// Get all goals for a user
export const getGoals = async (userId: string): Promise<Goal[]> => {
    const goalsCollection = getGoalsCollection(userId);
    const snapshot = await getDocs(goalsCollection);
    return snapshot.docs.map(doc => doc.data());
};

// Add a single goal
export const addGoal = async (userId: string, goalData: Omit<Goal, 'id'>): Promise<Goal> => {
    const goalsCollection = getGoalsCollection(userId);
    const newDocRef = doc(goalsCollection);
    const newGoal: Goal = { ...goalData, id: newDocRef.id, subGoals: goalData.subGoals || [] };
    await setDoc(newDocRef, newGoal);
    return newGoal;
};

// Add multiple goals
export const addGoals = async (userId: string, goalsData: Omit<Goal, 'id'>[]): Promise<Goal[]> => {
    const goalsCollection = getGoalsCollection(userId);
    const batch = writeBatch(db);
    const newGoals: Goal[] = [];

    goalsData.forEach(goalData => {
        const newDocRef = doc(goalsCollection);
        const newGoal: Goal = { ...goalData, id: newDocRef.id, subGoals: goalData.subGoals || [] };
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
