"use client";

import { completeOnboarding } from "@/app/actions/complete-onboarding";

type PersonalInfoViewProps = {
  clerkId: string;
  email: string;
  fullName: string;
};

export default function PersonalInfoView({
  clerkId,
  email,
  fullName,
}: PersonalInfoViewProps) {
  return (
    <main className="min-h-[calc(100vh-4rem)] grid place-items-center px-6">
        
        <form action={completeOnboarding} className="flex flex-col gap-4">
      <input type="hidden" name="clerkId" value={clerkId} />

      <input name="fullName" value={fullName} readOnly />
      <input name="email" value={email} readOnly />

      <label htmlFor="age">Age</label>
      <input
        id="age"
        name="age"
        type="number"
        min={1}
        max={120}
        placeholder="Enter your age"
        required
      />

      <button type="submit">Let&apos;s Go</button>
        </form>
    </main>
  );
}
