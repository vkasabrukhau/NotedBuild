"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInView() {
  return (
    <div className="flex w-full items-center justify-center px-6 py-10">
      <SignIn routing="hash" signUpUrl="/sign-up" />
    </div>
  );
}
