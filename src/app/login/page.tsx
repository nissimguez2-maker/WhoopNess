"use client";

import { useState } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Mail, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const allowed = process.env.NEXT_PUBLIC_ALLOWED_EMAIL ?? "";
  const [email, setEmail] = useState(allowed);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${location.origin}/auth/confirm` },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="ws-surface-highlight w-full max-w-sm border border-white/10 bg-content1" shadow="sm">
        <CardBody className="gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold">
              Whoop<span className="text-primary-400">Ness</span>
            </h1>
            <p className="text-sm text-foreground-500">Your private training coach. Sign in with a magic link.</p>
          </div>

          {sent ? (
            <div className="flex items-start gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-400">
              <CheckCircle2 size={18} className="mt-0.5" />
              <p>Check your email — tap the link to sign in. You can close this tab.</p>
            </div>
          ) : (
            <>
              <Input
                type="email"
                label="Email"
                value={email}
                onValueChange={setEmail}
                startContent={<Mail size={16} className="text-foreground-500" />}
                variant="bordered"
              />
              {error && <p className="text-sm text-danger-400">{error}</p>}
              <Button color="primary" onPress={sendLink} isLoading={busy} isDisabled={!email.includes("@")}>
                Send magic link
              </Button>
            </>
          )}
          <p className="text-center text-[11px] text-foreground-500">Access is limited to the owner&apos;s email.</p>
        </CardBody>
      </Card>
    </div>
  );
}
