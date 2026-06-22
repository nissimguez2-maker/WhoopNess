"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardBody, Button, Textarea, Chip, Spinner } from "@heroui/react";
import { Send, ShieldCheck } from "lucide-react";
import { askCoach } from "@/app/coach/actions";
import type { CoachTurn } from "@/lib/claude/chat";

const QUICK_PROMPTS = [
  "Should I train today?",
  "Can I do back squats?",
  "What should I eat after lifting?",
  "Why is today a lighter day?",
];

const INTRO: CoachTurn = {
  role: "coach",
  content:
    "I'm your coach — calm and to the point. Ask me about today's session, recovery, or fueling. I'll always check requests against your knee and back guardrails.",
};

export function CoachChat() {
  const [messages, setMessages] = useState<CoachTurn[]>([INTRO]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    const history = messages.filter((m) => m !== INTRO);
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const reply = await askCoach(history, msg);
    setMessages((m) => [...m, { role: "coach", content: reply.text }]);
    setBusy(false);
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-3">
      <header>
        <h1 className="text-xl font-bold">Coach</h1>
        <p className="text-xs text-foreground-500">Calm, clinical — guardrail-checked</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <Card
              shadow="none"
              className={
                m.role === "user"
                  ? "max-w-[85%] border border-primary/20 bg-primary/10"
                  : "ws-surface-highlight max-w-[90%] border border-white/10 bg-content1"
              }
            >
              <CardBody className="px-3 py-2 text-sm text-foreground-600">{m.content}</CardBody>
            </Card>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-foreground-500">
            <Spinner size="sm" color="primary" /> thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <Chip key={p} variant="flat" className="cursor-pointer" onClick={() => send(p)}>
              {p}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          minRows={1}
          maxRows={4}
          value={input}
          onValueChange={setInput}
          placeholder="Ask your coach…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Button isIconOnly color="primary" aria-label="Send" onPress={() => void send(input)} isDisabled={busy}>
          <Send size={18} />
        </Button>
      </div>
      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-foreground-500">
        <ShieldCheck size={12} /> General guidance, not medical advice. Red flags → see a clinician.
      </p>
    </div>
  );
}
