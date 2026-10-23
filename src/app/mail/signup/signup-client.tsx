"use client";

import { useRouter } from "next/navigation";
import { SignupFlow } from "@/components/mail/MailAuth";
import "../mail.css";

export function SignupPage() {
  const router = useRouter();
  return (
    <SignupFlow
      onDone={() => {
        router.push("/mail");
        router.refresh();
      }}
      onBack={() => router.push("/")}
    />
  );
}
