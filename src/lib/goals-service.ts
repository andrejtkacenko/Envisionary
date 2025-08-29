

import { db } from "@/lib/firebase";
import { 
    collection, 
    doc, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    writeBatch, 
    Timestamp, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    Unsubscribe, 
    where, 
    limit,
    collectionGroup
} from "firebase/firestore";
import type { Goal, GoalTemplate, GoalStatus, AppUser, Notification, Task, ScheduleTemplate, DailySchedule } from "@/types";

// Firestore data converter for Goals
const goalConverter = {
    toFirestore: (goal: Partial<Goal>) => {
        const data: any = { ...goal };
        
        delete data.id;

        if (goal.dueDate) {
            data.dueDate = Timestamp.fromDate(goal.dueDate as Date);
        } else {
             delete data.dueDate;
        }

        if (!data.createdAt) {
            data.createdAt = Timestamp.now();
        }
        
        if (!data.category) {
            data.category = 'General';
        }
        
        return data;
    },
    fromFirestore: (snapshot: any, options: any): Goal => {
        const data = snapshot.data(options);
        const goal: Goal = {
             id: snapshot.id,
             userId: data.userId,
             parentId: data.parentId,
             title: data.title,
             status: data.status,
             priority: data.priority,
             category: data.category || 'General',
             description: data.description,
             estimatedTime: data.estimatedTime,
             createdAt: data.createdAt, // Keep timestamp for sorting
        };
        if (data.dueDate) {
            goal.dueDate = (data.dueDate as Timestamp).toDate();
        }
        return goal;
    }
};

// Firestore data converter for Tasks
const taskConverter = {
    toFirestore: (task: Partial<Task>) => {
        const data: any = { ...task };
        delete data.id;

        if (task.dueDate && !(task.dueDate instanceof Timestamp)) {
            const date = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
            data.dueDate = Timestamp.fromDate(date as Date);
        } else if (!task.dueDate) {
            data.dueDate = null;
        }

        if (task.time) {
            data.time = task.time;
        } else {
            data.time = null;
        }

        if (!data.createdAt) {
            data.createdAt = Timestamp.now();
        } else if (data.createdAt && 'toDate' in data.createdAt) {
            data.createdAt = Timestamp.fromDate(data.createdAt.toDate());
        }

        return data;
    },
    fromFirestore: (snapshot: any, options: any): Task => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
            createdAt: data.createdAt,
            duration: data.duration || 60,
        };
    },
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

// Firestore data converter for Schedule Templates
const scheduleTemplateConverter = {
    toFirestore: (template: Omit<ScheduleTemplate, 'id' | 'createdAt'>) => {
        return {
            ...template,
            schedule: template.schedule || [], // Ensure schedule is at least an empty array
            createdAt: Timestamp.now(),
        };
    },
    fromFirestore: (snapshot: any, options: any): ScheduleTemplate => {
        const data = snapshot.data(options);
        return {
            ...data,
            id: snapshot.id,
            createdAt: data.createdAt,
        };
    }
};


// Firestore data converter for Notifications
const notificationConverter = {
  toFirestore: (notification: Omit<Notification, 'id'>) => {
    return {
      ...notification,
      createdAt: notification.createdAt || Timestamp.now(),
      isRead: notification.isRead || false,
    };
  },
  fromFirestore: (snapshot: any, options: any): Notification => {
    const data = snapshot.data(options);
    return {
      ...data,
      id: snapshot.id,
    } as Notification;
  },
};

const getGoalsCollection = () => collection(db, "goals").withConverter(goalConverter);
const getTasksCollection = () => collection(db, 'tasks').withConverter(taskConverter);
const getGoalTemplatesCollection = () => collection(db, "goal_templates").withConverter(goalTemplateConverter);
const getUserScheduleTemplatesCollection = (userId: string) => collection(db, "users", userId, "schedule_templates").withConverter(scheduleTemplateConverter);
const getUserNotificationsCollection = (userId: string) => collection(db, "users", userId, "notifications").withConverter(notificationConverter);

// --- GOAL-RELATED FUNCTIONS ---

export const getGoals = (
    userId: string, 
    callback: (goals: Goal[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(
        getGoalsCollection(), 
        where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const goals = querySnapshot.docs.map(doc => doc.data());
        callback(goals);
    }, (error) => {
        console.error("Error listening to goals collection: ", error);
        onError(error);
    });

    return unsubscribe;
};

export const getGoalsSnapshot = async (userId: string): Promise<Goal[]> => {
    const q = query(getGoalsCollection(), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const addGoal = async (goalData: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> => {
    const newDocRef = await addDoc(getGoalsCollection(), goalData);
    return { 
        ...goalData, 
        id: newDocRef.id,
        createdAt: Timestamp.now(),
    };
};

export const addGoals = async (userId: string, goalsData: Omit<Goal, 'id' | 'createdAt' | 'userId'>[]): Promise<Goal[]> => {
    const batch = writeBatch(db);
    const newGoals: Goal[] = [];

    goalsData.forEach(goalData => {
        const newDocRef = doc(getGoalsCollection());
        const goalWithUser = { ...goalData, userId };
        batch.set(newDocRef, goalWithUser);
        newGoals.push({ ...goalWithUser, id: newDocRef.id, createdAt: Timestamp.now() });
    });

    await batch.commit();
    return newGoals;
};

export const updateGoal = async (goal: Goal): Promise<void> => {
    const docRef = doc(getGoalsCollection(), goal.id);
    await setDoc(docRef, goal, { merge: true });
};

export const deleteGoal = async (goalId: string): Promise<void> => {
    // Also delete sub-goals
    const subGoalsQuery = query(getGoalsCollection(), where("parentId", "==", goalId));
    const subGoalsSnapshot = await getDocs(subGoalsQuery);
    
    const batch = writeBatch(db);
    subGoalsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const docRef = doc(getGoalsCollection(), goalId);
    batch.delete(docRef);

    await batch.commit();
};

export const getSubGoals = async (goalId: string): Promise<Goal[]> => {
    const q = query(getGoalsCollection(), where("parentId", "==", goalId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}


// --- TASK-RELATED FUNCTIONS ---
export const getTasks = (
    userId: string,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const q = query(getTasksCollection(), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => doc.data());
        callback(tasks);
    }, onError);
};

export const getTasksSnapshot = async (userId: string): Promise<Task[]> => {
    const q = query(getTasksCollection(), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'> & { userId: string }): Promise<Task> => {
    const newDocRef = await addDoc(getTasksCollection(), taskData);
    return { ...taskData, id: newDocRef.id, createdAt: Timestamp.now() };
};

export const updateTask = async (task: Task): Promise<void> => {
    const docRef = doc(getTasksCollection(), task.id);
    await setDoc(docRef, task, { merge: true });
};

export const updateTasks = async (tasks: Task[]): Promise<void> => {
    const batch = writeBatch(db);
    tasks.forEach(task => {
        const docRef = doc(getTasksCollection(), task.id);
        batch.set(docRef, task, { merge: true });
    });
    await batch.commit();
};

export const deleteTask = async (taskId: string): Promise<void> => {
     // Also delete sub-tasks
    const subTasksQuery = query(getTasksCollection(), where("parentId", "==", taskId));
    const subTasksSnapshot = await getDocs(subTasksQuery);
    
    const batch = writeBatch(db);
    subTasksSnapshot.forEach(doc => batch.delete(doc.ref));

    const docRef = doc(getTasksCollection(), taskId);
    batch.delete(docRef);
    await batch.commit();
};

export const deleteTasks = async (taskIds: string[]): Promise<void> => {
    const batch = writeBatch(db);
    taskIds.forEach(id => {
        const docRef = doc(getTasksCollection(), id);
        batch.delete(docRef);
    });
    await batch.commit();
};

export const getSubTasks = async (taskId: string): Promise<Task[]> => {
    const q = query(getTasksCollection(), where("parentId", "==", taskId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}

// --- GOAL TEMPLATE FUNCTIONS ---
export const getGoalTemplates = async (): Promise<GoalTemplate[]> => {
    const q = query(getGoalTemplatesCollection(), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const addGoalTemplate = async (templateData: Omit<GoalTemplate, 'id' | 'createdAt'>): Promise<GoalTemplate> => {
    const newDocRef = await addDoc(getGoalTemplatesCollection(), templateData);
    return { ...templateData, id: newDocRef.id, createdAt: Timestamp.now() };
};

// --- SCHEDULE TEMPLATE FUNCTIONS ---
export const getScheduleTemplates = async (userId: string): Promise<ScheduleTemplate[]> => {
    const q = query(getUserScheduleTemplatesCollection(userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const addScheduleTemplate = async (userId: string, templateData: Omit<ScheduleTemplate, 'id'|'createdAt'>): Promise<ScheduleTemplate> => {
    const newDocRef = await addDoc(getUserScheduleTemplatesCollection(userId), templateData);
    return { ...templateData, id: newDocRef.id, createdAt: Timestamp.now() };
};

export const deleteScheduleTemplate = async (userId: string, templateId: string): Promise<void> => {
    const docRef = doc(getUserScheduleTemplatesCollection(userId), templateId);
    await deleteDoc(docRef);
};

// --- NOTIFICATION FUNCTIONS ---
export const getNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const q = query(getUserNotificationsCollection(userId), orderBy('createdAt', 'desc'), limit(20));
  return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data()));
  }, onError);
};

export const addNotification = async (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<void> => {
  await addDoc(getUserNotificationsCollection(notificationData.userId), notificationData);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const q = query(getUserNotificationsCollection(userId), where('isRead', '==', false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true });
  });

  await batch.commit();
};

export type { Goal, GoalTemplate, GoalStatus, AppUser, Notification, Task, DailySchedule, ScheduleTemplate };
