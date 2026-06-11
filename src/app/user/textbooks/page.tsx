"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase";
import type { Textbook } from "@/lib/types";

export default function UserTextbooksPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const q = query(
        collection(db, "textbooks"),
        orderBy("uploadedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      setTextbooks(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Textbook),
      );
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">교재</h1>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">불러오는 중…</p>
      ) : textbooks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          아직 이용할 수 있는 교재가 없습니다.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {textbooks.map((textbook) => (
            <li
              key={textbook.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <span className="text-sm font-medium text-slate-800">
                {textbook.title}
              </span>
              <a
                href={textbook.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                열기
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
