"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Textbook } from "@/lib/types";

export default function AdminTextbooksPage() {
  const { user } = useAuth();
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTextbooks() {
    const q = query(collection(db, "textbooks"), orderBy("uploadedAt", "desc"));
    const snapshot = await getDocs(q);
    setTextbooks(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Textbook),
    );
  }

  useEffect(() => {
    void loadTextbooks();
  }, []);

  function isValidUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!user) return;
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError("올바른 링크(http:// 또는 https://)를 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "textbooks"), {
        title: title.trim(),
        storageUrl: url.trim(),
        uploadedAt: serverTimestamp(),
        uploadedBy: user.uid,
      });

      setTitle("");
      setUrl("");
      setMessage("교재가 추가되었습니다.");
      await loadTextbooks();
    } catch {
      setError("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">교재</h1>

      <form
        onSubmit={handleSave}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-slate-700"
          >
            제목
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="예: 머신러닝 입문"
          />
        </div>

        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-slate-700"
          >
            PDF 링크
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="https://drive.google.com/..."
          />
          <p className="mt-1 text-xs text-slate-500">
            Google Drive, Dropbox 등에 PDF를 올린 뒤 공개 공유 링크를 붙여넣으세요.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "교재 추가"}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">
        등록된 교재
      </h2>
      {textbooks.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">아직 교재가 없습니다.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
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
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                보기
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
