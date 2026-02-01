import { create } from "zustand";
import { persist } from "zustand/middleware";

export type McqAnswerMap = Record<number, number | null>;

export type DsaAnswerMap = Record<number, { code: string; language: string }>;

interface ContestAttemptState {
  contestId: number | null;
  attemptId: number | null;

  mcqAnswers: McqAnswerMap;
  dsaAnswers: DsaAnswerMap;
  submittedQuestionIds: number[];

  setActiveContest: (contestId: number, attemptId: number) => void;
  setMcqAnswer: (questionId: number, selectedOptionIndex: number | null) => void;
  setDsaAnswer: (questionId: number, payload: { code: string; language: string }) => void;
  markSubmitted: (questionId: number) => void;
  hasSubmitted: (questionId: number) => boolean;
  reset: () => void;
}

const initialState = {
  contestId: null,
  attemptId: null,
  mcqAnswers: {},
  dsaAnswers: {},
  submittedQuestionIds: [],
};

export const useContestAttemptStore = create<ContestAttemptState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveContest: (contestId, attemptId) =>
        set({ contestId, attemptId, mcqAnswers: {}, dsaAnswers: {}, submittedQuestionIds: [] }),

      setMcqAnswer: (questionId, selectedOptionIndex) =>
        set((s) => ({
          mcqAnswers: { ...s.mcqAnswers, [questionId]: selectedOptionIndex },
        })),

      setDsaAnswer: (questionId, payload) =>
        set((s) => ({
          dsaAnswers: { ...s.dsaAnswers, [questionId]: payload },
        })),

      markSubmitted: (questionId) =>
        set((s) =>
          s.submittedQuestionIds.includes(questionId)
            ? s
            : { submittedQuestionIds: [...s.submittedQuestionIds, questionId] }
        ),

      hasSubmitted: (questionId) => get().submittedQuestionIds.includes(questionId),
      reset: () => set(initialState),
    }),
    {
      name: "contest-attempt-store",
      partialize: (state) => ({
        contestId: state.contestId,
        attemptId: state.attemptId,
        mcqAnswers: state.mcqAnswers,
        dsaAnswers: state.dsaAnswers,
        submittedQuestionIds: state.submittedQuestionIds,
      }),
    }
  )
);
