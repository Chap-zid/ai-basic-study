"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import type { Test } from "@/lib/types";

export default function UserTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const q = query(
        collection(db, "tests"),
        where("published", "==", true),
      );
      const snapshot = await getDocs(q);
      setTests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Test));
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">시험</h1>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">불러오는 중…</p>
      ) : tests.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          아직 이용할 수 있는 시험이 없습니다.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {tests.map((test) => (
            <li
              key={test.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {test.title}
              </h2>
              {test.description && (
                <p className="mt-1 text-sm text-slate-600">
                  {test.description}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {test.questions.length}문항
              </p>
              <Link
                href={`/user/tests/${test.id}`}
                className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                시험 응시
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
