
import { create } from 'zustand';
import {
  getTasks as getTasksFromDb,
  addTask as addTaskToDb,
  updateTask as updateTaskInDb,
  deleteTask as deleteTaskFromDb,
  updateTasks as updateTasksInDb,
} from '@/lib/goals-service';
import type { Task } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTasks: (tasksToUpdate: Task[]) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: true,
  error: null,
  
  fetchTasks: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      getTasksFromDb(
        userId,
        (tasks) => {
          set({ tasks, isLoading: false });
        },
        (error) => {
          console.error(error);
          set({ error: "Failed to fetch tasks", isLoading: false });
        }
      );
    } catch (e) {
      console.error(e);
      set({ error: "Failed to fetch tasks", isLoading: false });
    }
  },

  addTask: async (taskData) => {
    const { user } = useAuth.getState();
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }
    // Optimistic update can be added here if desired
    try {
      await addTaskToDb(user.uid, taskData);
      // The real-time listener in fetchTasks will update the state
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to add task' });
      // Revert optimistic update here if implemented
    }
  },

  updateTask: async (task) => {
    const { user } = useAuth.getState();
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }

    const originalTasks = get().tasks;
    // Optimistic update
    set(state => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t)
    }));

    try {
      await updateTaskInDb(user.uid, task);
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to update task', tasks: originalTasks }); // Revert on error
    }
  },

  deleteTask: async (taskId) => {
    const { user } = useAuth.getState();
    if (!user) {
      set({ error: 'User not authenticated' });
      return;
    }
    const originalTasks = get().tasks;
    // Optimistic update
    set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
    }));
    try {
      await deleteTaskFromDb(user.uid, taskId);
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to delete task', tasks: originalTasks });
    }
  },

  updateTasks: async (tasksToUpdate: Task[]) => {
      const { user } = useAuth.getState();
      if (!user) {
          set({ error: 'User not authenticated' });
          return;
      }
      const originalTasks = get().tasks;
      
      // Create a map of the updates
      const updatesMap = new Map(tasksToUpdate.map(t => [t.id, t]));
      
      // Optimistic update
      set(state => ({
          tasks: state.tasks.map(t => updatesMap.get(t.id) || t)
      }));

      try {
          await updateTasksInDb(user.uid, tasksToUpdate);
      } catch (e) {
          console.error(e);
          set({ error: 'Failed to update tasks', tasks: originalTasks });
      }
  }
}));
