"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInView() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <SignIn routing="hash" />
    </main>
  );
}
