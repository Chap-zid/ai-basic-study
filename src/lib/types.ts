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

export interface TestResult {
  uid: string;
  testId: string;
  score: number;
  total: number;
  answers: string[];
  completedAt: Timestamp | null;
}
