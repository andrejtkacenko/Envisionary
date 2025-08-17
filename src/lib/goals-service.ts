
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp } from "firebase/firestore";
import type { Goal } from "@/types";

// Firestore data converter
const goalConverter = {
    toFirestore: (goal: Goal) => {
        const data: any = { ...goal };
        if (goal.dueDate) {
            data.dueDate = Timestamp.fromDate(goal.dueDate);
        }
        if (goal.subGoals) {
            data.subGoals = goal.subGoals.map(sg => {
                const subGoalData: any = {...sg};
                if (sg.dueDate) {
                    subGoalData.dueDate = Timestamp.fromDate(sg.dueDate);
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


const getGoalsCollection = (userId: string) => {
    return collection(db, "users", userId, "goals").withConverter(goalConverter);
}

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
