import type { Timestamp } from "firebase/firestore";

export type Role = "admin" | "user";

export interface UserProfile {
  role: Role;
  email: string | null;
  displayName: string | null;
  createdAt: Timestamp | null;
}

export interface Textbook {
  id: string;
  title: string;
  storageUrl: string;
  uploadedAt: Timestamp | null;
  uploadedBy: string;
}

export type QuestionType = "multiple-choice" | "true-false";

export interface Question {
  questionText: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  points: number;
  // Optional image (e.g. a diagram or a screenshot of a table) shown with the
  // question. Stored as an external URL; omitted entirely when not used.
  imageUrl?: string;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  published: boolean;
  questions: Question[];
  createdAt: Timestamp | null;
  createdBy: string;
}

// Per-question record stored with a result, so the breakdown is readable
// directly in Firestore without cross-referencing the test.
export interface AnswerDetail {
  questionText: string;
  type: QuestionType;
  given: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
}

export interface TestResult {
  uid: string;
  // Fields below are optional so results saved before they were added still fit.
  userName?: string | null;
  userEmail?: string | null;
  testId: string;
  testTitle?: string;
  score: number;
  total: number;
  correctCount?: number;
  questionCount?: number;
  answers: string[];
  details?: AnswerDetail[];
  completedAt: Timestamp | null;
}
