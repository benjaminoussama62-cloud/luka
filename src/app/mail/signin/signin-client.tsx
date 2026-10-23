"use client";

import { useRouter } from "next/navigation";
import { SigninFlow } from "@/components/mail/MailAuth";
import "../mail.css";

export function SigninPage() {
  const router = useRouter();
  return (
    <SigninFlow
      onDone={() => {
        router.push("/mail");
        router.refresh();
      }}
      onBack={() => router.push("/")}
    />
  );
}
