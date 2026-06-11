"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AppHeader from "@/components/AppHeader";

const USER_LINKS = [
  { href: "/user/textbooks", label: "교재" },
  { href: "/user/tests", label: "시험" },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        불러오는 중…
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="인공지능 기초 학습" links={USER_LINKS} />
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
