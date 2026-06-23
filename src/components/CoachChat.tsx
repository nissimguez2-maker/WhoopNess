"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Textarea, Chip } from "@heroui/react";
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
    if (!window.confirm("Clear this conversation? This can't be undone.")) return;
    await clearChatHistory();
    setMessages([]);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom)-5rem)] flex-col gap-3">
      <PageHeader
        title="Coach"
        subtitle="Ask about today's session, your knee, or food"
        action={
          !empty && (
            <Button isIconOnly size="md" variant="light" aria-label="Clear conversation" onPress={clear} className="text-foreground-500">
              <Trash2 size={16} />
            </Button>
          )
        }
      />

      <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto pr-1">
        {empty && (
          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center gap-3 text-center">
            <MessageCircle size={28} className="text-foreground-500" />
            <p className="text-sm text-foreground-600">
              Ask me about today&apos;s session, how you&apos;re recovering, or what to eat. I&apos;ll always keep things safe for your
              knee and back.
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

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[88%] rounded-2xl bg-content2 px-3.5 py-2 text-sm text-foreground-700">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="border-l-2 border-primary/60 pl-3.5">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{m.content}</p>
            </div>
          ),
        )}
        {busy && (
          <div className="border-l-2 border-primary/30 pl-3.5 text-sm text-foreground-500" role="status">
            <span className="animate-pulse">one sec…</span>
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
          placeholder="Ask me anything…"
          variant="bordered"
          radius="lg"
          aria-label="Message"
          classNames={{ inputWrapper: "bg-content1" }}
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
        <ShieldCheck size={12} /> General guidance, not medical advice. Anything sharp → see a doctor.
      </p>
    </div>
  );
}
