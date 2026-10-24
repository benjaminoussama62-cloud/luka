"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SigninFlow } from "@/components/mail/MailAuth";
import "../mail.css";

export function SigninPage() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next") || "/mail";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/mail";
  return (
    <SigninFlow
      onDone={() => {
        router.push(next);
        router.refresh();
      }}
      onBack={() => router.push("/")}
    />
  );
}
