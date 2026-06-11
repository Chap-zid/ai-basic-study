"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Test } from "@/lib/types";

export default function TakeTestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ testId: string }>();
  const testId = params.testId;

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const snapshot = await getDoc(doc(db, "tests", testId));
      if (!snapshot.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const loaded = { id: snapshot.id, ...snapshot.data() } as Test;
      setTest(loaded);
      setAnswers(new Array(loaded.questions.length).fill(null));
      setLoading(false);
    }
    void load();
  }, [testId]);

  const allAnswered = useMemo(
    () => answers.length > 0 && answers.every((a) => a !== null && a !== ""),
    [answers],
  );

  function selectAnswer(value: string) {
    setAnswers((prev) =>
      prev.map((a, i) => (i === currentIndex ? value : a)),
    );
  }

  async function handleSubmit() {
    if (!user || !test || !allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const finalAnswers = answers as string[];
      const score = test.questions.reduce(
        (total, question, index) =>
          finalAnswers[index] === question.correctAnswer ? total + 1 : total,
        0,
      );

      await setDoc(doc(db, "results", `${user.uid}_${test.id}`), {
        uid: user.uid,
        testId: test.id,
        score,
        total: test.questions.length,
        answers: finalAnswers,
        completedAt: serverTimestamp(),
      });

      router.push(`/user/tests/${test.id}/result`);
    } catch {
      setError("답안 제출에 실패했습니다. 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">불러오는 중…</p>;
  }

  if (notFound || !test) {
    return <p className="text-sm text-slate-500">시험을 찾을 수 없습니다.</p>;
  }

  const question = test.questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{test.title}</h1>
      {test.description && (
        <p className="mt-1 text-sm text-slate-600">{test.description}</p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Left: question panel + navigation */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {test.questions.length}문항 중 {currentIndex + 1}번
          </p>
          <p className="mt-3 text-base font-medium text-slate-900">
            {question.questionText}
          </p>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(test.questions.length - 1, i + 1),
                )
              }
              disabled={currentIndex === test.questions.length - 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              다음
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {test.questions.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-8 w-8 rounded-md border text-sm ${
                  index === currentIndex
                    ? "border-slate-900 bg-slate-900 text-white"
                    : answers[index]
                      ? "border-slate-400 bg-slate-100 text-slate-700"
                      : "border-slate-300 text-slate-500"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right: answer input panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-700">내 답안</p>
          <div className="mt-4 space-y-3">
            {question.options.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                  currentAnswer === option
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentIndex}`}
                  checked={currentAnswer === option}
                  onChange={() => selectAnswer(option)}
                />
                <span className="text-slate-800">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6">
        {allAnswered ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "제출 중…" : "시험 제출"}
          </button>
        ) : (
          <p className="text-sm text-slate-500">
            모든 문항에 답해야 제출할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
