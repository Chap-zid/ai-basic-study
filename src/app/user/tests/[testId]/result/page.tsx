"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
      const [testSnap, resultsSnap] = await Promise.all([
        getDoc(doc(db, "tests", testId)),
        getDocs(
          query(
            collection(db, "results"),
            where("uid", "==", user.uid),
            where("testId", "==", testId),
          ),
        ),
      ]);
      if (testSnap.exists()) {
        setTest({ id: testSnap.id, ...testSnap.data() } as Test);
      }
      // Multiple attempts may exist; show the most recent one. Sorted client-side
      // so the query needs no composite index.
      const attempts = resultsSnap.docs.map((d) => d.data() as TestResult);
      if (attempts.length > 0) {
        const latest = attempts.reduce((a, b) =>
          (b.completedAt?.toMillis() ?? 0) > (a.completedAt?.toMillis() ?? 0)
            ? b
            : a,
        );
        setResult(latest);
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
        {result.userName && (
          <p className="text-sm text-slate-500">응시자: {result.userName}</p>
        )}
        <p className="mt-1 text-sm text-slate-600">내 점수</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {result.score} / {result.total}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {percentage}%
          {typeof result.correctCount === "number" && (
            <>
              {" · "}맞힌 문항 {result.correctCount} /{" "}
              {result.questionCount ?? test.questions.length}
            </>
          )}
        </p>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">문항별 결과</h2>
      <ol className="mt-3 space-y-3">
        {test.questions.map((question, index) => {
          const given = result.answers[index];
          const isCorrect = given === question.correctAnswer;
          const questionPoints = question.points ?? 1;
          const earnedPoints = isCorrect ? questionPoints : 0;
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
                <span className="ml-2 font-normal text-slate-500">
                  ({earnedPoints} / {questionPoints}점)
                </span>
              </p>
              {question.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={question.imageUrl}
                  alt="문제 이미지"
                  className="mt-2 max-h-72 w-auto rounded-md border border-slate-200"
                />
              )}
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
