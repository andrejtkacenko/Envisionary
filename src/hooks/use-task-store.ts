

import { create } from 'zustand';
import {
  getTasks as getTasksFromDb,
  addTask as addTaskToDb,
  updateTask as updateTaskInDb,
  deleteTask as deleteTaskFromDb,
  deleteTasks as deleteTasksFromDb,
  updateTasks as updateTasksInDb,
} from '@/lib/goals-service';
import type { Task } from '@/types';

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTasks: (tasksToUpdate: Task[]) => Promise<void>;
  deleteTasks: (taskIds: string[]) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: true,
  error: null,
  
  fetchTasks: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await getTasksFromDb(userId);
      set({ tasks: tasks, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ error: "Failed to fetch tasks", isLoading: false });
    }
  },

  addTask: async (taskData) => {
    try {
      const newTask = await addTaskToDb(taskData);
      set(state => ({ tasks: [...state.tasks, newTask]}));
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to add task' });
    }
  },

  updateTask: async (task) => {
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

  deleteTask: async (taskId) => {
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

  deleteTasks: async (taskIds) => {
    const originalTasks = get().tasks;
    set(state => ({
        tasks: state.tasks.filter(t => !taskIds.includes(t.id))
    }));
     try {
      await deleteTasksFromDb(taskIds);
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to delete tasks', tasks: originalTasks });
    }
  },

  updateTasks: async (tasksToUpdate) => {
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
