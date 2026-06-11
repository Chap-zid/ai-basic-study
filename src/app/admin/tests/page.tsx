"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Question, QuestionType, Test } from "@/lib/types";

const EMPTY_OPTIONS = ["", ""];

// Example pasted into the JSON box by the "예시 채우기" button.
const SAMPLE_JSON = `[
  {
    "questionText": "머신러닝은 데이터에서 패턴을 학습한다.",
    "type": "true-false",
    "correctAnswer": "참",
    "points": 2
  },
  {
    "questionText": "다음 중 지도학습(supervised learning) 예시는?",
    "type": "multiple-choice",
    "options": ["군집화", "분류", "차원 축소", "연관 규칙"],
    "correctAnswer": "분류",
    "points": 3
  }
]`;

// Maps loose true/false values onto the app's stored "참"/"거짓".
function normalizeBool(value: unknown): string | null {
  if (typeof value === "boolean") return value ? "참" : "거짓";
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["참", "true", "t", "o", "yes", "y", "1"].includes(v)) return "참";
    if (["거짓", "false", "f", "x", "no", "n", "0"].includes(v)) return "거짓";
  }
  return null;
}

type ParseResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string };

// Parses pasted JSON into validated Question objects. Accepts either a bare
// array of questions or an object with a "questions" array.
function parseQuestionsJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다. 문법을 확인해 주세요." };
  }

  let rawList: unknown[] | null = null;
  if (Array.isArray(data)) {
    rawList = data;
  } else if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { questions?: unknown }).questions)
  ) {
    rawList = (data as { questions: unknown[] }).questions;
  }

  if (!rawList) {
    return {
      ok: false,
      error: "최상위는 문제 배열 또는 questions 필드를 가진 객체여야 합니다.",
    };
  }
  if (rawList.length === 0) {
    return { ok: false, error: "문제가 하나도 없습니다." };
  }

  const questions: Question[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
    const label = `${i + 1}번 문제`;
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `${label}: 객체 형식이 아닙니다.` };
    }
    const item = raw as Record<string, unknown>;

    const questionText =
      typeof item.questionText === "string" ? item.questionText.trim() : "";
    if (!questionText) {
      return { ok: false, error: `${label}: questionText(문제 내용)가 필요합니다.` };
    }

    let points = 1;
    if (item.points !== undefined) {
      const p = Number(item.points);
      if (!Number.isFinite(p) || p <= 0) {
        return {
          ok: false,
          error: `${label}: points(배점)는 1 이상의 숫자여야 합니다.`,
        };
      }
      points = p;
    }

    const hasOptions = Array.isArray(item.options) && item.options.length > 0;
    const type: QuestionType =
      item.type === "true-false"
        ? "true-false"
        : item.type === "multiple-choice"
          ? "multiple-choice"
          : hasOptions
            ? "multiple-choice"
            : "true-false";

    if (type === "multiple-choice") {
      if (!Array.isArray(item.options)) {
        return {
          ok: false,
          error: `${label}: 객관식은 options(선택지) 배열이 필요합니다.`,
        };
      }
      const options = item.options
        .map((o) => (typeof o === "string" ? o.trim() : ""))
        .filter(Boolean);
      if (options.length < 2) {
        return { ok: false, error: `${label}: 선택지는 2개 이상이어야 합니다.` };
      }
      const correctAnswer =
        typeof item.correctAnswer === "string" ? item.correctAnswer.trim() : "";
      if (!correctAnswer || !options.includes(correctAnswer)) {
        return {
          ok: false,
          error: `${label}: correctAnswer(정답)가 options 중 하나와 정확히 일치해야 합니다.`,
        };
      }
      questions.push({ questionText, type, options, correctAnswer, points });
    } else {
      const correctAnswer = normalizeBool(item.correctAnswer);
      if (!correctAnswer) {
        return {
          ok: false,
          error: `${label}: 참/거짓 문제의 correctAnswer는 "참" 또는 "거짓"이어야 합니다.`,
        };
      }
      questions.push({
        questionText,
        type,
        options: ["참", "거짓"],
        correctAnswer,
        points,
      });
    }
  }

  return { ok: true, questions };
}

export default function AdminTestsPage() {
  const { user } = useAuth();

  // Test-level fields.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Current question builder fields.
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>(
    "multiple-choice",
  );
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctBool, setCorrectBool] = useState("참");
  const [points, setPoints] = useState("1");
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Bulk JSON import.
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonMessage, setJsonMessage] = useState<string | null>(null);

  const [tests, setTests] = useState<Test[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTests() {
    const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setTests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Test));
  }

  useEffect(() => {
    void loadTests();
  }, []);

  function resetQuestionBuilder() {
    setQuestionText("");
    setQuestionType("multiple-choice");
    setOptions([...EMPTY_OPTIONS]);
    setCorrectIndex(0);
    setCorrectBool("참");
    setPoints("1");
    setQuestionError(null);
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOptionField() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOptionField(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectIndex((prev) => (prev >= index && prev > 0 ? prev - 1 : prev));
  }

  function addQuestion() {
    setQuestionError(null);
    if (!questionText.trim()) {
      setQuestionError("문제 내용을 입력해 주세요.");
      return;
    }

    const pointsValue = Number(points);
    if (!Number.isFinite(pointsValue) || pointsValue <= 0) {
      setQuestionError("배점은 1 이상의 숫자여야 합니다.");
      return;
    }

    if (questionType === "multiple-choice") {
      const trimmed = options.map((o) => o.trim());
      const cleaned = trimmed.filter(Boolean);
      if (cleaned.length < 2) {
        setQuestionError("비어 있지 않은 선택지를 두 개 이상 입력해 주세요.");
        return;
      }
      const correctAnswer = trimmed[correctIndex];
      if (!correctAnswer) {
        setQuestionError("정답인 선택지를 선택해 주세요.");
        return;
      }
      setQuestions((prev) => [
        ...prev,
        {
          questionText: questionText.trim(),
          type: "multiple-choice",
          options: cleaned,
          correctAnswer,
          points: pointsValue,
        },
      ]);
    } else {
      setQuestions((prev) => [
        ...prev,
        {
          questionText: questionText.trim(),
          type: "true-false",
          options: ["참", "거짓"],
          correctAnswer: correctBool,
          points: pointsValue,
        },
      ]);
    }

    resetQuestionBuilder();
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function importQuestionsFromJson() {
    setJsonError(null);
    setJsonMessage(null);
    if (!jsonText.trim()) {
      setJsonError("JSON을 붙여넣어 주세요.");
      return;
    }
    const result = parseQuestionsJson(jsonText);
    if (!result.ok) {
      setJsonError(result.error);
      return;
    }
    setQuestions((prev) => [...prev, ...result.questions]);
    setJsonText("");
    setJsonMessage(`${result.questions.length}개 문제를 추가했습니다.`);
  }

  async function handleSaveTest(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);

    if (!user) return;
    if (!title.trim()) {
      setFormError("시험 제목을 입력해 주세요.");
      return;
    }
    if (questions.length === 0) {
      setFormError("저장하기 전에 문제를 하나 이상 추가해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "tests"), {
        title: title.trim(),
        description: description.trim(),
        published,
        questions,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setTitle("");
      setDescription("");
      setPublished(false);
      setQuestions([]);
      resetQuestionBuilder();
      setMessage("시험이 저장되었습니다.");
      await loadTests();
    } catch {
      setFormError("시험 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(test: Test) {
    await updateDoc(doc(db, "tests", test.id), { published: !test.published });
    await loadTests();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">시험 만들기</h1>

      <form
        onSubmit={handleSaveTest}
        className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="test-title"
            className="block text-sm font-medium text-slate-700"
          >
            제목
          </label>
          <input
            id="test-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="test-description"
            className="block text-sm font-medium text-slate-700"
          >
            설명 (선택)
          </label>
          <textarea
            id="test-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {/* Question builder */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">문제 추가</h2>

          <div className="mt-3">
            <label
              htmlFor="question-text"
              className="block text-sm font-medium text-slate-700"
            >
              문제
            </label>
            <input
              id="question-text"
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="mt-3">
            <label
              htmlFor="question-type"
              className="block text-sm font-medium text-slate-700"
            >
              유형
            </label>
            <select
              id="question-type"
              value={questionType}
              onChange={(e) => {
                setQuestionType(e.target.value as QuestionType);
                setQuestionError(null);
              }}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="multiple-choice">객관식</option>
              <option value="true-false">참 / 거짓</option>
            </select>
          </div>

          {questionType === "multiple-choice" ? (
            <div className="mt-3 space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                선택지 (정답을 선택하세요)
              </span>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={correctIndex === index}
                    onChange={() => setCorrectIndex(index)}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`선택지 ${index + 1}`}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOptionField(index)}
                      className="text-sm text-slate-500 hover:text-red-600"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOptionField}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                + 선택지 추가
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <span className="block text-sm font-medium text-slate-700">
                정답
              </span>
              <div className="mt-1 flex gap-4 text-sm">
                {["참", "거짓"].map((value) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-bool"
                      checked={correctBool === value}
                      onChange={() => setCorrectBool(value)}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <label
              htmlFor="question-points"
              className="block text-sm font-medium text-slate-700"
            >
              배점
            </label>
            <input
              id="question-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <span className="ml-2 text-sm text-slate-500">점</span>
          </div>

          {questionError && (
            <p className="mt-2 text-sm text-red-600">{questionError}</p>
          )}

          <button
            type="button"
            onClick={addQuestion}
            className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            문제 추가
          </button>
        </div>

        {/* Bulk import via JSON */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              JSON으로 문제 가져오기
            </h2>
            <button
              type="button"
              onClick={() => {
                setJsonText(SAMPLE_JSON);
                setJsonError(null);
                setJsonMessage(null);
              }}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              예시 채우기
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            문제 배열 또는{" "}
            <code className="rounded bg-slate-200 px-1">{"{ \"questions\": [...] }"}</code>{" "}
            형식을 붙여넣으세요. 각 문제: questionText(필수), type(생략 시 자동),
            options(객관식), correctAnswer(필수), points(생략 시 1).
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder='[{"questionText": "...", "type": "multiple-choice", "options": ["A","B"], "correctAnswer": "A", "points": 1}]'
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
          />

          {jsonError && <p className="mt-2 text-sm text-red-600">{jsonError}</p>}
          {jsonMessage && (
            <p className="mt-2 text-sm text-green-600">{jsonMessage}</p>
          )}

          <button
            type="button"
            onClick={importQuestionsFromJson}
            className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            JSON 불러오기
          </button>
        </div>

        {/* Added questions */}
        {questions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              문제 ({questions.length}) · 총점{" "}
              {questions.reduce((sum, q) => sum + q.points, 0)}점
            </h2>
            <ol className="mt-2 space-y-2">
              {questions.map((question, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {index + 1}. {question.questionText}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {question.type === "multiple-choice"
                        ? "객관식"
                        : "참 / 거짓"}{" "}
                      · 정답: {question.correctAnswer} · 배점 {question.points}점
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-sm text-slate-500 hover:text-red-600"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          게시 (사용자에게 공개)
        </label>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "시험 저장"}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">
        기존 시험
      </h2>
      {tests.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">아직 시험이 없습니다.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {tests.map((test) => (
            <li
              key={test.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {test.title}
                </p>
                <p className="text-xs text-slate-500">
                  {test.questions.length}문항 ·{" "}
                  {test.published ? "게시됨" : "임시 저장"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePublished(test)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {test.published ? "게시 취소" : "게시"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
