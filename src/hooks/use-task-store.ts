

import { create } from 'zustand';
import {
  getTasks as getTasksFromDb,
  addTask as addTaskToDb,
  updateTask as updateTaskInDb,
  deleteTask as deleteTaskFromDb,
  updateTasks as updateTasksInDb,
} from '@/lib/goals-service';
import type { Task } from '@/types';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (userId: string, taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (userId: string, task: Task) => Promise<void>;
  deleteTask: (userId: string, taskId: string) => Promise<void>;
  updateTasks: (userId: string, tasksToUpdate: Task[]) => Promise<void>;
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
          const sortedTasks = tasks.sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
          set({ tasks: sortedTasks, isLoading: false });
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

  addTask: async (userId, taskData) => {
    try {
      await addTaskToDb({ ...taskData, userId });
      // Real-time listener will update the state
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to add task' });
    }
  },

  updateTask: async (userId, task) => {
    const originalTasks = get().tasks;
    set(state => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t)
    }));
    try {
      await updateTaskInDb(task);
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to update task', tasks: originalTasks });
    }
  },

  deleteTask: async (userId, taskId) => {
    const originalTasks = get().tasks;
    set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
    }));
    try {
      await deleteTaskFromDb(taskId);
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to delete task', tasks: originalTasks });
    }
  },

  updateTasks: async (userId, tasksToUpdate) => {
      const originalTasks = get().tasks;
      const updatesMap = new Map(tasksToUpdate.map(t => [t.id, t]));
      set(state => ({
          tasks: state.tasks.map(t => updatesMap.get(t.id) || t)
      }));
      try {
          await updateTasksInDb(tasksToUpdate);
      } catch (e) {
          console.error(e);
          set({ error: 'Failed to update tasks', tasks: originalTasks });
      }
  }
}));
