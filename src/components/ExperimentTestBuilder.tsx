"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import type { Difficulty, ExperimentPhase, Question, Test } from "@/lib/types";

// Mini version of the AI-usage experiment: 1차(독립 수행) and 2차(AI 자유 선택)
// each get one 하/중/상 question, drawn from the same source per difficulty so
// both phases share the same thinking type and a similar difficulty.
// Full design is 20문항 (하3·중4·상3 per phase); this is the short pilot.
interface SourceRule {
  difficulty: Difficulty;
  label: string;
  matches: (title: string) => boolean;
}

// Normalizes titles so "계산 문제-1" and "계산 문제 - 1" match the same rule.
function norm(title: string): string {
  return title.replace(/\s+/g, "").toLowerCase();
}

const SOURCE_RULES: SourceRule[] = [
  {
    difficulty: "하",
    label: "기초 학습세트 개념 문제 (여러 세트)",
    matches: (t) => norm(t).includes("기초학습세트"),
  },
  {
    difficulty: "중",
    label: "퍼셉트론 활성화 함수 문제 - 1",
    matches: (t) => norm(t) === norm("퍼셉트론 활성화 함수 문제 - 1"),
  },
  {
    difficulty: "상",
    label: "계산 문제 - 1",
    matches: (t) => norm(t) === norm("계산 문제 - 1"),
  },
];

const PHASES: ExperimentPhase[] = [1, 2];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type BuildResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string };

// Picks two distinct questions per difficulty (one for each phase) from the
// matching source tests. Experiment tests themselves are never used as sources.
function buildExperimentQuestions(tests: Test[]): BuildResult {
  const byPhase: Record<ExperimentPhase, Question[]> = { 1: [], 2: [] };

  for (const rule of SOURCE_RULES) {
    const pool = tests
      .filter((t) => !t.experiment && rule.matches(t.title))
      .flatMap((t) =>
        t.questions.map((q) => ({ ...q, sourceTestTitle: t.title })),
      );
    if (pool.length < PHASES.length) {
      return {
        ok: false,
        error: `"${rule.label}"에서 문제를 ${PHASES.length}개 이상 찾지 못했습니다 (현재 ${pool.length}개). 시험 제목을 확인해 주세요.`,
      };
    }
    const picked = shuffle(pool).slice(0, PHASES.length);
    PHASES.forEach((phase, i) => {
      byPhase[phase].push({ ...picked[i], phase, difficulty: rule.difficulty });
    });
  }

  return { ok: true, questions: [...byPhase[1], ...byPhase[2]] };
}

export default function ExperimentTestBuilder({
  tests,
  createdBy,
  onSaved,
}: {
  tests: Test[];
  createdBy: string;
  onSaved: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function generate() {
    setError(null);
    setMessage(null);
    const result = buildExperimentQuestions(tests);
    if (!result.ok) {
      setPreview(null);
      setError(result.error);
      return;
    }
    setPreview(result.questions);
  }

  async function save() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "tests"), {
        title: "AI 활용 실험 (미니)",
        description:
          "1차: AI 없이 혼자 풀기 · 2차: 필요하면 AI 물어보기를 자유롭게 사용",
        published: false,
        experiment: true,
        questions: preview,
        createdAt: serverTimestamp(),
        createdBy,
      });
      setPreview(null);
      setMessage("실험용 시험이 임시 저장되었습니다. 아래 목록에서 게시하세요.");
      await onSaved();
    } catch {
      setError("실험용 시험 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">
        AI 활용 실험용 시험 만들기 (미니)
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        1차(독립 수행)와 2차(AI 자유 선택)에 하·중·상 문제를 하나씩 넣어 총
        6문항을 만듭니다. 두 단계는 같은 출처에서 뽑으므로 사고 유형과 난이도가
        비슷합니다.
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
        {SOURCE_RULES.map((rule) => (
          <li key={rule.difficulty}>
            <span className="font-medium">{rule.difficulty}</span> ← {rule.label}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={generate}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {preview ? "다시 뽑기" : "문제 뽑기"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "저장 중…" : "실험용 시험 저장"}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}

      {preview && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {PHASES.map((phase) => (
            <div key={phase} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-700">
                {phase === 1 ? "1차 · 독립 수행 (AI 사용 불가)" : "2차 · AI 자유 선택"}
              </p>
              <ol className="mt-2 space-y-2">
                {preview
                  .filter((q) => q.phase === phase)
                  .map((q, i) => (
                    <li key={i} className="text-sm text-slate-800">
                      <span className="mr-1 rounded bg-slate-100 px-1.5 text-xs text-slate-600">
                        {q.difficulty}
                      </span>
                      {q.questionText}
                      <p className="text-xs text-slate-500">출처: {q.sourceTestTitle}</p>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
