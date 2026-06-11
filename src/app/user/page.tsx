import Link from "next/link";

export default function UserHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">환영합니다</h1>
      <p className="mt-2 text-sm text-slate-600">
        교재를 다운로드하고 퀴즈를 풀며 실력을 점검해 보세요.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/user/textbooks"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-lg font-semibold text-slate-900">교재</h2>
          <p className="mt-1 text-sm text-slate-600">
            PDF 교재를 둘러보고 다운로드하세요.
          </p>
        </Link>
        <Link
          href="/user/tests"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-lg font-semibold text-slate-900">시험</h2>
          <p className="mt-1 text-sm text-slate-600">
            게시된 퀴즈를 풀고 즉시 점수를 확인하세요.
          </p>
        </Link>
      </div>
    </div>
  );
}
