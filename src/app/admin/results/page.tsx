"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import type { TestResult } from "@/lib/types";

// A result paired with its Firestore document id, so each row has a stable key.
type ResultRow = TestResult & { id: string };

// Formats a Firestore timestamp as a local date-time string, or a dash when
// the timestamp is still pending (serverTimestamp not yet resolved) or missing.
function formatDateTime(result: TestResult): string {
  const millis = result.completedAt?.toMillis();
  if (!millis) return "—";
  return new Date(millis).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Splits a result's per-question details into correct/incorrect lists. Older
// results saved before `details` existed return empty lists; callers fall back
// to the aggregate counts in that case.
function splitDetails(result: TestResult) {
  const details = result.details ?? [];
  return {
    correct: details.filter((d) => d.isCorrect),
    incorrect: details.filter((d) => !d.isCorrect),
  };
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Newest first; the admin can see the full history across all users.
      const snapshot = await getDocs(
        query(collection(db, "results"), orderBy("completedAt", "desc")),
      );
      setResults(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ResultRow),
      );
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">불러오는 중…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">응시 결과</h1>
      <p className="mt-2 text-sm text-slate-600">
        모든 사용자의 시험 결과를 최신순으로 확인하세요. 행을 클릭하면 맞은 문제와
        틀린 문제를 볼 수 있습니다.
      </p>

      {results.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">아직 응시 결과가 없습니다.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">응시 시각</th>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">시험</th>
                <th className="px-4 py-3 font-medium text-right">점수</th>
                <th className="px-4 py-3 font-medium text-right">정답</th>
                <th className="px-4 py-3 font-medium text-right">오답</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((result) => {
                const { correct, incorrect } = splitDetails(result);
                const hasDetails = (result.details?.length ?? 0) > 0;
                const questionCount =
                  result.questionCount ?? result.details?.length;
                // Prefer the per-question breakdown; fall back to stored aggregates.
                const correctCount = hasDetails
                  ? correct.length
                  : result.correctCount;
                const incorrectCount = hasDetails
                  ? incorrect.length
                  : typeof result.correctCount === "number" &&
                      typeof questionCount === "number"
                    ? questionCount - result.correctCount
                    : undefined;
                const isExpanded = expandedId === result.id;
                const percentage =
                  result.total > 0
                    ? Math.round((result.score / result.total) * 100)
                    : 0;

                return (
                  <Fragment key={result.id}>
                    <tr
                      onClick={() =>
                        setExpandedId(isExpanded ? null : result.id)
                      }
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDateTime(result)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {result.userName ?? "이름 없음"}
                        </span>
                        {result.userEmail && (
                          <span className="block text-xs text-slate-400">
                            {result.userEmail}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {result.testTitle ?? result.testId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="font-semibold text-slate-900">
                          {result.score} / {result.total}
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                          ({percentage}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {correctCount ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {incorrectCount ?? "—"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-4">
                          {hasDetails ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <h3 className="text-xs font-semibold uppercase text-green-700">
                                  맞은 문제 ({correct.length})
                                </h3>
                                {correct.length === 0 ? (
                                  <p className="mt-1 text-sm text-slate-400">
                                    없음
                                  </p>
                                ) : (
                                  <ul className="mt-2 space-y-1">
                                    {correct.map((d, i) => (
                                      <li
                                        key={i}
                                        className="rounded-md border border-green-200 bg-white px-3 py-2 text-sm text-slate-700"
                                      >
                                        {d.questionText}
                                        <span className="ml-1 text-xs text-slate-400">
                                          (+{d.earnedPoints}점)
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <h3 className="text-xs font-semibold uppercase text-red-600">
                                  틀린 문제 ({incorrect.length})
                                </h3>
                                {incorrect.length === 0 ? (
                                  <p className="mt-1 text-sm text-slate-400">
                                    없음
                                  </p>
                                ) : (
                                  <ul className="mt-2 space-y-1">
                                    {incorrect.map((d, i) => (
                                      <li
                                        key={i}
                                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-slate-700"
                                      >
                                        <p>{d.questionText}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                          내 답안: {d.given ?? "—"} · 정답:{" "}
                                          {d.correctAnswer}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              이 결과에는 문항별 상세 정보가 저장되어 있지 않습니다.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
