"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Textarea, Chip, Spinner } from "@heroui/react";
import { Send, ShieldCheck, MessageCircle, Trash2 } from "lucide-react";
import { askCoach, clearChatHistory } from "@/app/coach/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import type { CoachTurn } from "@/lib/claude/chat";

const QUICK_PROMPTS = [
  "Should I train today?",
  "Can I do back squats?",
  "What should I eat after lifting?",
  "Why is today a swim day?",
];

export function CoachChat({ initialMessages }: { initialMessages: CoachTurn[] }) {
  const [messages, setMessages] = useState<CoachTurn[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: firstRender.current ? "auto" : "smooth" });
    firstRender.current = false;
  }, [messages, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    const reply = await askCoach(msg);
    setMessages((m) => [...m, { role: "coach", content: reply.text }]);
    setBusy(false);
  }

  async function clear() {
    if (!window.confirm("Clear chat history? This can't be undone.")) return;
    await clearChatHistory();
    setMessages([]);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-3">
      <PageHeader
        title="Coach"
        subtitle="Calm, clinical — guardrail-checked"
        action={
          !empty && (
            <Button isIconOnly size="sm" variant="light" aria-label="Clear history" onPress={clear} className="text-foreground-500">
              <Trash2 size={16} />
            </Button>
          )
        }
      />

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {empty && (
          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center gap-3 text-center">
            <MessageCircle size={28} className="text-foreground-500" />
            <p className="text-sm text-foreground-600">
              I&apos;m your coach — calm and to the point. Ask about today&apos;s session, recovery, or fueling. I always check
              requests against your knee and back guardrails.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((p) => (
                <Chip key={p} variant="flat" className="cursor-pointer hover:bg-content3" onClick={() => send(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-sm text-foreground"
                  : "ws-surface-highlight max-w-[90%] rounded-2xl rounded-bl-md bg-content2 px-3.5 py-2.5 text-sm text-foreground"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-foreground-500">
            <Spinner size="sm" color="secondary" /> thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          minRows={1}
          maxRows={4}
          value={input}
          onValueChange={setInput}
          placeholder="Ask your coach…"
          variant="bordered"
          radius="lg"
          aria-label="Message"
          classNames={{ inputWrapper: "bg-content2" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Button isIconOnly size="lg" color="primary" aria-label="Send" onPress={() => void send(input)} isDisabled={busy || !input.trim()}>
          <Send size={18} />
        </Button>
      </div>
      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-foreground-500">
        <ShieldCheck size={12} /> General guidance, not medical advice. Red flags → see a clinician.
      </p>
    </div>
  );
}
