import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 全局"当前病人"上下文：首页切换病人后，提醒页/保险页跟随同一个病人，
 * 切回首页保持；刷新后也保持（localStorage 持久化）。
 */
interface PatientState {
  currentPatientId: number | null;
  setCurrentPatientId: (id: number | null) => void;
}

export const usePatientStore = create<PatientState>()(
  persist(
    (set) => ({
      currentPatientId: null,
      setCurrentPatientId: (id) => set({ currentPatientId: id }),
    }),
    { name: 'family-files-current-patient' },
  ),
);
