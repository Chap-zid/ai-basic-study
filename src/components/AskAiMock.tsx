"use client";

import { useState } from "react";

interface ChatMessage {
  from: "user" | "ai";
  text: string;
}

// MOCKUP: no real AI is called and nothing is saved. Replace the canned reply
// with an API call (and log usage timing/purpose) when the experiment goes live.
const MOCK_REPLY =
  "(목업) 아직 실제 AI가 연결되지 않았습니다. 실험에서는 여기에 AI 답변이 표시되고, 사용 시점과 질문 내용이 기록됩니다.";

export default function AskAiMock({
  enabled,
  questionKey,
}: {
  // false in 1차(독립 수행): the button is shown but locked.
  enabled: boolean;
  // Changes per question so each question keeps its own chat.
  questionKey: number;
}) {
  const [openFor, setOpenFor] = useState<number | null>(null);
  const [chats, setChats] = useState<Record<number, ChatMessage[]>>({});
  const [draft, setDraft] = useState("");

  const open = openFor === questionKey;
  const messages = chats[questionKey] ?? [];

  function send() {
    const text = draft.trim();
    if (!text) return;
    setChats((prev) => ({
      ...prev,
      [questionKey]: [
        ...(prev[questionKey] ?? []),
        { from: "user", text },
        { from: "ai", text: MOCK_REPLY },
      ],
    }));
    setDraft("");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenFor(open ? null : questionKey)}
        disabled={!enabled}
        title={enabled ? undefined : "1차 문항은 AI 없이 풀어야 합니다."}
        className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
      >
        ✨ AI 물어보기
        {!enabled && <span className="text-xs">(사용 불가)</span>}
      </button>

      {enabled && open && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-white p-3">
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-xs text-slate-500">
                막히는 부분을 AI에게 물어보세요. (목업)
              </p>
            )}
            {messages.map((m, i) => (
              <p
                key={i}
                className={`rounded-md px-3 py-2 text-sm ${
                  m.from === "user"
                    ? "ml-6 bg-slate-900 text-white"
                    : "mr-6 bg-indigo-50 text-slate-800"
                }`}
              >
                {m.text}
              </p>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
              }}
              placeholder="질문을 입력하세요"
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              보내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
