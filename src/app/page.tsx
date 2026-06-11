"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, role, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Once authenticated and the role is resolved, route to the right area.
  useEffect(() => {
    if (!loading && user && role) {
      router.replace(role === "admin" ? "/admin" : "/user");
    }
  }, [loading, user, role, router]);

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">인공지능 기초 학습</h1>
        <p className="mt-2 text-sm text-slate-600">
          Google 계정으로 로그인하여 교재와 퀴즈를 이용하세요.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn || loading || Boolean(user)}
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingIn || (user && loading)
            ? "로그인 중…"
            : user
              ? "이동 중…"
              : "Google 계정으로 로그인"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
