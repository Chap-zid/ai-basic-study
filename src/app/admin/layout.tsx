"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AppHeader from "@/components/AppHeader";

const ADMIN_LINKS = [
  { href: "/admin/textbooks", label: "교재" },
  { href: "/admin/tests", label: "시험" },
  { href: "/admin/results", label: "응시 결과" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
    } else if (role !== "admin") {
      // Non-admins are sent to their own area.
      router.replace("/user");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        불러오는 중…
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="관리자" links={ADMIN_LINKS} />
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
