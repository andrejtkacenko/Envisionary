












import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, Timestamp, getDoc, addDoc, query, orderBy, onSnapshot, Unsubscribe, where, limit } from "firebase/firestore";
import type { Goal, GoalTemplate, GoalStatus, AppUser, Notification, Task } from "@/types";


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

const subTaskToFirestore = (task: Task) => {
    const data: any = { ...task };
    if (task.dueDate) {
        // Ensure dueDate is a Date object before converting
        const date = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
        data.dueDate = Timestamp.fromDate(date as Date);
    } else {
        delete data.dueDate
    }
    if (!data.createdAt) {
        data.createdAt = Timestamp.now();
    }
    if (data.subTasks) {
        data.subTasks = data.subTasks.map(subTaskToFirestore);
    }
     // Handle `time` field
    if (task.time === undefined || task.time === null) {
        delete data.time;
    } else {
        data.time = task.time;
    }
    return data;
}

const subTaskFromFirestore = (data: any): Task => {
    const task: Task = {
        ...data,
        dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
        createdAt: data.createdAt,
    };
    if (data.subTasks) {
        task.subTasks = data.subTasks.map(subTaskFromFirestore);
    }
    return task;
}

// Firestore data converter for Tasks
const taskConverter = {
    toFirestore: (task: Omit<Task, 'id'>) => {
        const data: any = { ...task };
        if (task.dueDate) {
             // Ensure dueDate is a Date object before converting
            const date = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
            data.dueDate = Timestamp.fromDate(date as Date);
        } else {
            delete data.dueDate
        }
        if (!data.createdAt) {
            data.createdAt = Timestamp.now();
        }
        if (task.subTasks) {
            data.subTasks = task.subTasks.map(subTaskToFirestore);
        }
        // Handle `time` field
        if (task.time === undefined || task.time === null) {
            delete data.time;
        } else {
            data.time = task.time;
        }
        // Handle duration, setting a default if not present
        data.duration = task.duration || 60;
        
        return data;
    },
    fromFirestore: (snapshot: any, options: any): Task => {
        const data = snapshot.data(options);
        const task: Task = {
            id: snapshot.id,
            ...data,
            dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
            createdAt: data.createdAt,
            duration: data.duration || 60, // Default to 60 if not present
        };
        if (data.subTasks) {
            task.subTasks = data.subTasks.map(subTaskFromFirestore);
        }
        return task;
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

const getGoalsCollection = (userId: string) => {
    return collection(db, "users", userId, "goals").withConverter(goalConverter);
}

const getTasksCollection = (userId: string) => {
    return collection(db, 'users', userId, 'tasks').withConverter(taskConverter);
};

const getGoalTemplatesCollection = () => {
    return collection(db, "goal_templates").withConverter(goalTemplateConverter);
}

const getNotificationsCollection = (userId: string) => {
    return collection(db, "users", userId, "notifications").withConverter(notificationConverter);
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


// --- TASK-RELATED FUNCTIONS ---

// Get all tasks for a user with real-time updates
export const getTasks = (
    userId: string,
    callback: (tasks: Task[]) => void,
    onError: (error: Error) => void
): Unsubscribe => {
    const tasksCollection = getTasksCollection(userId);
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
            const tasks = querySnapshot.docs.map((doc) => doc.data());
            callback(tasks);
        },
        (error) => {
            console.error('Error listening to tasks collection: ', error);
            onError(error);
        }
    );

    return unsubscribe;
};

// Get a one-time snapshot of tasks (for server-side operations)
export const getTasksSnapshot = async (userId: string): Promise<Task[]> => {
    const tasksCollection = getTasksCollection(userId);
    const q = query(tasksCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};


// Add a single task
export const addTask = async (userId: string, taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const tasksCollection = getTasksCollection(userId);
    const newDocRef = doc(tasksCollection);
    const newTask: Task = {
        ...taskData,
        id: newDocRef.id,
        createdAt: Timestamp.now(),
    };
    await setDoc(newDocRef, newTask);
    return newTask;
};

// Update a task
export const updateTask = async (userId: string, task: Task): Promise<void> => {
    const tasksCollection = getTasksCollection(userId);
    const docRef = doc(tasksCollection, task.id);
    await setDoc(docRef, task, { merge: true });
};

// Update multiple tasks in a batch
export const updateTasks = async (userId: string, tasks: Task[]): Promise<void> => {
    const tasksCollection = getTasksCollection(userId);
    const batch = writeBatch(db);
    tasks.forEach(task => {
        const docRef = doc(tasksCollection, task.id);
        batch.set(docRef, task, { merge: true });
    });
    await batch.commit();
}


// Delete a task
export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
    const tasksCollection = getTasksCollection(userId);
    const docRef = doc(tasksCollection, taskId);
    await deleteDoc(docRef);
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



// --- NOTIFICATION FUNCTIONS ---

// Get notifications for a user with real-time updates
export const getNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const notificationsCollection = getNotificationsCollection(userId);
  const q = query(notificationsCollection, orderBy('createdAt', 'desc'), limit(20));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const notifications = querySnapshot.docs.map((doc) => doc.data());
      callback(notifications);
    },
    (error) => {
      console.error('Error listening to notifications collection: ', error);
      onError(error);
    }
  );

  return unsubscribe;
};

// Add a new notification
export const addNotification = async (userId: string, notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<void> => {
  const notificationsCollection = getNotificationsCollection(userId);
  await addDoc(notificationsCollection, {
    ...notificationData,
    userId,
    isRead: false,
    createdAt: Timestamp.now(),
  });
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const notificationsCollection = getNotificationsCollection(userId);
  const q = query(notificationsCollection, where('isRead', '==', false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true });
  });

  await batch.commit();
};

export type { Goal, GoalTemplate, GoalStatus, AppUser, Notification, Task };
