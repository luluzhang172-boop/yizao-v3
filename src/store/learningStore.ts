import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { loadQuestions } from "../core/questionBank";
import { starsFromAccuracy } from "../core/levelEngine";
import { createSession } from "../core/sessionEngine";
import { getDueSRSQuestionIds, updateSRSRecord } from "../core/srsEngine";
import {
  ErrorRecord,
  LearningMode,
  LearningProgress,
  QuizSession,
  SRSRecord
} from "../types/progress";
import { Question, QuestionBankStats, Subject } from "../types/question";

const STORAGE_KEY = "exam-performance-engine-v3";
const questionBank = loadQuestions();

const emptyProgress: LearningProgress = {
  answeredQuestionIds: [],
  correctQuestionIds: [],
  wrongQuestionIds: [],
  answerLogs: [],
  xp: 0,
  streak: 0,
  completedLevelIds: [],
  levelResults: {}
};

type PersistedState = {
  progress: LearningProgress;
  errorRecords: Record<string, ErrorRecord>;
  srsRecords: Record<string, SRSRecord>;
  activeSession: QuizSession | null;
};

type StartSessionInput = {
  mode: LearningMode;
  subject?: Subject;
  levelId?: string;
  questionIds?: string[];
  limit?: number;
};

type AnswerQuestionInput = {
  selectedAnswer: string | string[];
};

type LearningStore = PersistedState & {
  questions: Question[];
  questionStats: QuestionBankStats;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startSession: (input: StartSessionInput) => void;
  answerCurrentQuestion: (input: AnswerQuestionInput) => boolean;
  skipCurrentQuestion: () => void;
  nextQuestion: () => void;
  finishSession: () => void;
  resetProgress: () => Promise<void>;
  getQuestionById: (id: string) => Question | undefined;
  getCurrentQuestion: () => Question | undefined;
  getDueSRSQuestionIds: () => string[];
};

const unique = (ids: string[]) => Array.from(new Set(ids));
const todayKey = () => new Date().toISOString().slice(0, 10);
const levelFromXp = (xp: number) => Math.floor(xp / 100) + 1;
export const getLevelFromXp = levelFromXp;

const normalizeSelectedAnswer = (answer: string | string[]) =>
  Array.isArray(answer)
    ? Array.from(new Set(answer)).sort().join("")
    : answer.trim().toUpperCase();

const isAnswerCorrect = (selected: string | string[], correctAnswers: string[]) => {
  const selectedLetters = normalizeSelectedAnswer(selected).split("").sort();
  return (
    selectedLetters.length === correctAnswers.length &&
    selectedLetters.every((letter, index) => letter === correctAnswers[index])
  );
};

const persist = async (state: PersistedState) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const toPersisted = (state: LearningStore): PersistedState => ({
  progress: state.progress,
  errorRecords: state.errorRecords,
  srsRecords: state.srsRecords,
  activeSession: state.activeSession
});

export const useLearningStore = create<LearningStore>((set, get) => ({
  questions: questionBank.questions,
  questionStats: questionBank.stats,
  progress: emptyProgress,
  errorRecords: {},
  srsRecords: {},
  activeSession: null,
  hydrated: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ hydrated: true });
      return;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const progress = {
      ...emptyProgress,
      ...(parsed.progress ?? {}),
      answeredQuestionIds: parsed.progress?.answeredQuestionIds ?? [],
      correctQuestionIds: parsed.progress?.correctQuestionIds ?? [],
      wrongQuestionIds: parsed.progress?.wrongQuestionIds ?? [],
      answerLogs: parsed.progress?.answerLogs ?? [],
      completedLevelIds: parsed.progress?.completedLevelIds ?? [],
      levelResults: parsed.progress?.levelResults ?? {}
    };
    set({
      progress,
      errorRecords: parsed.errorRecords ?? {},
      srsRecords: parsed.srsRecords ?? {},
      activeSession: parsed.activeSession ?? null,
      hydrated: true
    });
  },

  startSession: ({ mode, subject, levelId, questionIds, limit = 30 }) => {
    const state = get();
    const activeSession = createSession({
      questions: state.questions,
      mode,
      subject,
      levelId,
      questionIds,
      limit,
      answeredQuestionIds: state.progress.answeredQuestionIds,
      wrongQuestionIds: state.progress.wrongQuestionIds,
      errorRecords: state.errorRecords,
      srsDueQuestionIds: getDueSRSQuestionIds(state.srsRecords)
    });

    set({ activeSession });
    void persist({ ...toPersisted(get()), activeSession });
  },

  answerCurrentQuestion: ({ selectedAnswer }) => {
    const state = get();
    const session = state.activeSession;
    if (!session) return false;

    const questionId = session.questionIds[session.currentIndex];
    const question = state.questions.find((item) => item.id === questionId);
    if (!question) return false;

    const correct = isAnswerCorrect(selectedAnswer, question.normalizedAnswer);
    const existingError = state.errorRecords[questionId] ?? {
      questionId,
      wrongCount: 0,
      correctCount: 0,
      lastWrongAt: 0,
      errorWeight: question.errorWeight
    };

    const errorRecords = {
      ...state.errorRecords,
      [questionId]: correct
        ? {
            ...existingError,
            correctCount: existingError.correctCount + 1,
            errorWeight: Math.max(1, existingError.errorWeight - 1)
          }
        : {
            ...existingError,
            wrongCount: existingError.wrongCount + 1,
            lastWrongAt: Date.now(),
            errorWeight: existingError.errorWeight + 1
          }
    };

    const progress: LearningProgress = {
      answeredQuestionIds: unique([
        ...state.progress.answeredQuestionIds,
        questionId
      ]),
      correctQuestionIds: correct
        ? unique([...state.progress.correctQuestionIds, questionId])
        : state.progress.correctQuestionIds.filter((id) => id !== questionId),
      wrongQuestionIds: correct
        ? state.progress.wrongQuestionIds.filter((id) => id !== questionId)
        : unique([...state.progress.wrongQuestionIds, questionId]),
      answerLogs: [
        ...state.progress.answerLogs,
        {
          questionId,
          correct,
          timestamp: Date.now(),
          subject: question.subject,
          mode: session.mode,
          questionType: question.type
        }
      ].slice(-1000),
      xp: state.progress.xp + (correct ? 10 : 0),
      streak: state.progress.streak,
      lastStreakDate: state.progress.lastStreakDate,
      completedLevelIds: state.progress.completedLevelIds,
      levelResults: state.progress.levelResults
    };

    const srsRecords =
      correct && !state.srsRecords[questionId] && !state.progress.wrongQuestionIds.includes(questionId)
        ? state.srsRecords
        : updateSRSRecord(state.srsRecords, questionId, correct);

    const nextState = {
      progress,
      errorRecords,
      srsRecords
    };

    set(nextState);
    void persist({ ...toPersisted(get()), ...nextState });
    return correct;
  },

  skipCurrentQuestion: () => {
    get().nextQuestion();
  },

  nextQuestion: () => {
    const state = get();
    const session = state.activeSession;
    if (!session) return;

    const isLast = session.currentIndex >= session.questionIds.length - 1;
    const activeSession = {
      ...session,
      currentIndex: isLast ? session.currentIndex : session.currentIndex + 1,
      completedAt: isLast ? Date.now() : session.completedAt
    };

    let progress = state.progress;
    if (isLast && !session.rewardGranted) {
      const sessionLogs = state.progress.answerLogs.filter(
        (log) =>
          session.questionIds.includes(log.questionId) &&
          log.timestamp >= session.startedAt
      );
      const correctCount = sessionLogs.filter((log) => log.correct).length;
      const accuracy = sessionLogs.length ? correctCount / sessionLogs.length : 0;
      const stars = starsFromAccuracy(accuracy);
      const todayAnswered = state.progress.answerLogs.filter(
        (log) => new Date(log.timestamp).toISOString().slice(0, 10) === todayKey()
      ).length;
      const earnsStreak =
        todayAnswered >= 10 || (session.mode === "level" && stars > 0);
      const shouldAddStreak =
        earnsStreak && state.progress.lastStreakDate !== todayKey();

      progress = {
        ...state.progress,
        xp:
          state.progress.xp +
          (session.mode === "level" && stars > 0 ? 50 : 0) +
          (session.mode === "daily" ? 30 : 0) +
          (session.mode === "wrong" ? 20 : 0),
        streak: state.progress.streak + (shouldAddStreak ? 1 : 0),
        lastStreakDate: shouldAddStreak
          ? todayKey()
          : state.progress.lastStreakDate,
        completedLevelIds:
          session.levelId && stars > 0
            ? unique([...state.progress.completedLevelIds, session.levelId])
            : state.progress.completedLevelIds,
        levelResults:
          session.levelId && stars > 0
            ? {
                ...state.progress.levelResults,
                [session.levelId]: {
                  levelId: session.levelId,
                  stars,
                  completedAt: Date.now(),
                  accuracy
                }
              }
            : state.progress.levelResults
      };
      activeSession.rewardGranted = true;
    }

    set({ activeSession, progress });
    void persist({ ...toPersisted(get()), activeSession, progress });
  },

  finishSession: () => {
    set({ activeSession: null });
    void persist({ ...toPersisted(get()), activeSession: null });
  },

  resetProgress: async () => {
    const nextState: PersistedState = {
      progress: emptyProgress,
      errorRecords: {},
      srsRecords: {},
      activeSession: null
    };
    set(nextState);
    await persist(nextState);
  },

  getQuestionById: (id) => get().questions.find((question) => question.id === id),

  getCurrentQuestion: () => {
    const state = get();
    const session = state.activeSession;
    if (!session) return undefined;
    const questionId = session.questionIds[session.currentIndex];
    return state.questions.find((question) => question.id === questionId);
  },

  getDueSRSQuestionIds: () => getDueSRSQuestionIds(get().srsRecords)
}));
