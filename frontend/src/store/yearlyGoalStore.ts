import { create } from "zustand";
import { yearlyGoalService } from "@/services/yearlyGoalService";
import type {
  YearlyGoal,
  YearlyGoalCreate,
  YearlyGoalUpdate,
  ProgressUpdate,
} from "@/types/yearlyGoal";

interface YearlyGoalState {
  goals: YearlyGoal[];
  loading: boolean;
  error: string | null;
  fetchGoals: (year?: number, category?: string) => Promise<void>;
  createGoal: (goal: YearlyGoalCreate) => Promise<void>;
  updateGoal: (id: string, goal: YearlyGoalUpdate) => Promise<void>;
  updateProgress: (id: string, progress: ProgressUpdate) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useYearlyGoalStore = create<YearlyGoalState>((set) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async (year?, category?) => {
    set({ loading: true, error: null });
    try {
      const goals = await yearlyGoalService.getAll(year, category);
      set({ goals, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "获取目标失败",
        loading: false,
      });
    }
  },

  createGoal: async (goal) => {
    set({ loading: true, error: null });
    try {
      const newGoal = await yearlyGoalService.create(goal);
      set((state) => ({
        goals: [...state.goals, newGoal],
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "创建目标失败",
        loading: false,
      });
      throw error;
    }
  },

  updateGoal: async (id, goal) => {
    set({ loading: true, error: null });
    try {
      const updatedGoal = await yearlyGoalService.update(id, goal);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? updatedGoal : g)),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "更新目标失败",
        loading: false,
      });
      throw error;
    }
  },

  updateProgress: async (id, progress) => {
    set({ loading: true, error: null });
    try {
      const updatedGoal = await yearlyGoalService.updateProgress(id, progress);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? updatedGoal : g)),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "更新进度失败",
        loading: false,
      });
      throw error;
    }
  },

  deleteGoal: async (id) => {
    set({ loading: true, error: null });
    try {
      await yearlyGoalService.delete(id);
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "删除目标失败",
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
