import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-slate-600">
        사용자를 위한 학습 콘텐츠를 관리하세요.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/textbooks"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-lg font-semibold text-slate-900">교재</h2>
          <p className="mt-1 text-sm text-slate-600">
            사용자가 다운로드할 수 있도록 PDF 교재를 업로드하세요.
          </p>
        </Link>
        <Link
          href="/admin/tests"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-lg font-semibold text-slate-900">시험</h2>
          <p className="mt-1 text-sm text-slate-600">
            객관식과 참/거짓 문제로 퀴즈를 만들고 게시하세요.
          </p>
        </Link>
      </div>
    </div>
  );
}
