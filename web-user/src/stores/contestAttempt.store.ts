import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/schema/language.schema";
import { DEFAULT_LANGUAGE } from "@/schema/language.schema";

export type CodeByLanguageMap = Partial<Record<Language, string>>;

export type CurrentProblemType = "mcq" | "dsa";

export interface DsaAnswerState {
  selectedLanguage: Language;
  codeByLanguage: CodeByLanguageMap;
}

interface ContestAttemptState {
  /** True after persist has rehydrated from storage (used to avoid reset on refresh) */
  _hasHydrated: boolean;

  /** Current attempt context */
  contestId: number | null;
  attemptId: number | null;

  /** Current problem only (one question at a time) */
  currentProblemId: number | null;
  currentProblemType: CurrentProblemType | null;
  currentQuestionIndex: number;

  /** Answer for current problem only */
  mcqAnswer: number | null;
  dsaAnswer: DsaAnswerState | null;

  /** IDs of questions already submitted */
  submittedQuestionIds: number[];

  setActiveContest: (contestId: number, attemptId: number) => void;
  setCurrentQuestionIndex: (index: number) => void;

  /** Set current problem; optionally pass initial answer (e.g. from persisted/reconciled state). */
  setCurrentProblem: (
    questionId: number,
    type: CurrentProblemType,
    initialAnswer?: { mcq?: number } | { dsa?: { code: string; language: Language } }
  ) => void;

  setMcqAnswer: (selectedOptionIndex: number | null) => void;
  setDsaCode: (code: string) => void;
  setDsaLanguage: (language: Language) => void;
  setDsaAnswer: (payload: { code: string; language: Language }) => void;

  /** Set submitted IDs from API (e.g. derived from currentProblemId on load) */
  setSubmittedQuestionIds: (ids: number[]) => void;

  /** Called on submit: add question to submitted, clear current answer */
  markSubmitted: (questionId: number) => void;
  hasSubmitted: (questionId: number) => boolean;

  /** Clear only current answer (keeps current problem and submitted list) */
  clearCurrentAnswer: () => void;

  reset: () => void;
}

const initialState = {
  _hasHydrated: false,
  contestId: null,
  attemptId: null,
  currentProblemId: null,
  currentProblemType: null,
  currentQuestionIndex: 0,
  mcqAnswer: null,
  dsaAnswer: null,
  submittedQuestionIds: [],
};

export const useContestAttemptStore = create<ContestAttemptState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveContest: (contestId, attemptId) =>
        set({
          ...initialState,
          contestId,
          attemptId,
        }),

      setCurrentQuestionIndex: (index) =>
        set({ currentQuestionIndex: Math.max(0, index) }),

      setCurrentProblem: (questionId, type, initialAnswer) =>
        set((state) => {
          const next: Partial<ContestAttemptState> = {
            currentProblemId: questionId,
            currentProblemType: type,
            mcqAnswer: null,
            dsaAnswer: null,
          };
          if (initialAnswer) {
            if ("mcq" in initialAnswer && initialAnswer.mcq != null) {
              next.mcqAnswer = initialAnswer.mcq;
            }
            if ("dsa" in initialAnswer && initialAnswer.dsa) {
              const { code, language } = initialAnswer.dsa;
              // Merge with existing codeByLanguage so code for other languages is preserved
              const existingMap =
                state.currentProblemId === questionId && state.dsaAnswer?.codeByLanguage
                  ? state.dsaAnswer.codeByLanguage
                  : {};
              next.dsaAnswer = {
                selectedLanguage: language,
                codeByLanguage: { ...existingMap, [language]: code },
              };
            }
          }
          if (type === "dsa" && !next.dsaAnswer) {
            next.dsaAnswer = {
              selectedLanguage: DEFAULT_LANGUAGE,
              codeByLanguage: {},
            };
          }
          if (type === "mcq") {
            next.dsaAnswer = null;
          }
          return next;
        }),

      setMcqAnswer: (selectedOptionIndex) =>
        set((s) =>
          s.currentProblemType !== "mcq"
            ? s
            : { mcqAnswer: selectedOptionIndex }
        ),

      setDsaCode: (code) =>
        set((s) => {
          if (s.currentProblemType !== "dsa" || s.currentProblemId == null) return s;
          const entry: DsaAnswerState =
            s.dsaAnswer ?? {
              selectedLanguage: DEFAULT_LANGUAGE,
              codeByLanguage: {},
            };
          const lang = entry.selectedLanguage;
          const updated: DsaAnswerState = {
            ...entry,
            codeByLanguage: {
              ...entry.codeByLanguage,
              [lang]: code,
            },
          };
          return { dsaAnswer: updated };
        }),

      setDsaLanguage: (language) =>
        set((s) => {
          if (s.currentProblemType !== "dsa" || s.currentProblemId == null) return s;
          const existing: DsaAnswerState = s.dsaAnswer ?? {
            selectedLanguage: language,
            codeByLanguage: {},
          };
          const updated: DsaAnswerState = {
            ...existing,
            selectedLanguage: language,
          };
          return { dsaAnswer: updated };
        }),

      setDsaAnswer: (payload) =>
        set((s) => {
          if (s.currentProblemType !== "dsa" || s.currentProblemId == null) return s;
          const { code, language } = payload;
          const existing: DsaAnswerState = s.dsaAnswer ?? {
            selectedLanguage: language,
            codeByLanguage: {},
          };
          const updated: DsaAnswerState = {
            ...existing,
            selectedLanguage: language,
            codeByLanguage: {
              ...existing.codeByLanguage,
              [language]: code,
            },
          };
          return { dsaAnswer: updated };
        }),

      clearCurrentAnswer: () =>
        set({ mcqAnswer: null, dsaAnswer: null }),

      setSubmittedQuestionIds: (ids) =>
        set({ submittedQuestionIds: ids }),

      markSubmitted: (questionId) =>
        set((s) => {
          const already = s.submittedQuestionIds.includes(questionId);
          return {
            submittedQuestionIds: already
              ? s.submittedQuestionIds
              : [...s.submittedQuestionIds, questionId],
            mcqAnswer: null,
            dsaAnswer: null,
          };
        }),

      hasSubmitted: (questionId) =>
        get().submittedQuestionIds.includes(questionId),

      reset: () => set(initialState),
    }),
    {
      name: "contest-attempt-store",
      partialize: (state) => ({
        contestId: state.contestId,
        attemptId: state.attemptId,
        currentProblemId: state.currentProblemId,
        currentProblemType: state.currentProblemType,
        currentQuestionIndex: state.currentQuestionIndex,
        mcqAnswer: state.mcqAnswer,
        dsaAnswer: state.dsaAnswer,
        submittedQuestionIds: state.submittedQuestionIds,
      }),
      onRehydrateStorage: () => () => {
        useContestAttemptStore.setState({ _hasHydrated: true });
      },
    }
  )
);
