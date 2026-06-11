"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Test, TestResult } from "@/lib/types";

export default function TestResultPage() {
  const { user } = useAuth();
  const params = useParams<{ testId: string }>();
  const testId = params.testId;

  const [test, setTest] = useState<Test | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [testSnap, resultSnap] = await Promise.all([
        getDoc(doc(db, "tests", testId)),
        getDoc(doc(db, "results", `${user.uid}_${testId}`)),
      ]);
      if (testSnap.exists()) {
        setTest({ id: testSnap.id, ...testSnap.data() } as Test);
      }
      if (resultSnap.exists()) {
        setResult(resultSnap.data() as TestResult);
      }
      setLoading(false);
    }
    void load();
  }, [user, testId]);

  if (loading) {
    return <p className="text-sm text-slate-500">불러오는 중…</p>;
  }

  if (!test || !result) {
    return (
      <div>
        <p className="text-sm text-slate-500">이 시험에 대한 결과를 찾을 수 없습니다.</p>
        <Link
          href="/user/tests"
          className="mt-3 inline-block text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          시험 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const percentage = Math.round((result.score / result.total) * 100);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{test.title} — 결과</h1>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">내 점수</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {result.score} / {result.total}
        </p>
        <p className="mt-1 text-sm text-slate-500">{percentage}%</p>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">문항별 결과</h2>
      <ol className="mt-3 space-y-3">
        {test.questions.map((question, index) => {
          const given = result.answers[index];
          const isCorrect = given === question.correctAnswer;
          return (
            <li
              key={index}
              className={`rounded-xl border p-5 ${
                isCorrect
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-sm font-medium text-slate-900">
                {index + 1}. {question.questionText}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                내 답안:{" "}
                <span className="font-medium">{given ?? "—"}</span>{" "}
                {isCorrect ? (
                  <span className="text-green-700">✓ 정답</span>
                ) : (
                  <span className="text-red-700">✗ 오답</span>
                )}
              </p>
              {!isCorrect && (
                <p className="mt-1 text-sm text-slate-700">
                  정답:{" "}
                  <span className="font-medium">{question.correctAnswer}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <Link
        href="/user/tests"
        className="mt-8 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        시험 목록으로 돌아가기
      </Link>
    </div>
  );
}
