"use client";

import { useEffect, useState } from "react";
import { Quicksand } from "next/font/google";
import { completeOnboarding } from "@/app/actions/complete-onboarding";

type PersonalInfoViewProps = {
  clerkId: string;
  email: string;
  fullName: string;
};

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function PersonalInfoView({
  clerkId,
  email,
  fullName,
}: PersonalInfoViewProps) {
  const [age, setAge] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPanelVisible(true);
    }, 40);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] bg-white px-6 py-8 text-[#2b2725] ${quicksand.className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <div
          className={`mx-auto min-h-[34rem] w-full max-w-5xl px-2 pt-16 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[38rem] sm:pt-24 ${
            panelVisible
              ? "translate-y-0 scale-100 opacity-100 blur-0"
              : "translate-y-3 scale-[0.992] opacity-0 blur-sm"
          }`}
        >
            <h1 className="max-w-4xl text-center text-[2.4rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]">
              Tell us your age.
            </h1>

            <p className="mt-5 text-center text-base text-black/40 sm:text-lg">
              We&apos;ll use this to personalize your experience for{" "}
              {fullName || email}.
            </p>

            <form
              action={completeOnboarding}
              className="mx-auto mt-14 flex w-full max-w-3xl flex-col"
            >
              <input type="hidden" name="clerkId" value={clerkId} />
              <input type="hidden" name="fullName" value={fullName} />
              <input type="hidden" name="email" value={email} />

              <label
                htmlFor="age"
                className="text-sm uppercase tracking-[0.22em] text-black/35"
              >
                Age
              </label>

              <input
                id="age"
                name="age"
                type="number"
                min={1}
                max={120}
                inputMode="numeric"
                placeholder="Enter your age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="mt-5 w-full border-b border-black/20 pb-4 text-[2rem] leading-none outline-none placeholder:text-black/20 sm:text-[2.6rem]"
                required
              />

              <button
                type="submit"
                disabled={age.trim() === ""}
                className="mt-10 w-fit self-end rounded-full border border-black px-6 py-3 text-sm uppercase tracking-[0.22em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/10 disabled:text-black/25 disabled:hover:bg-transparent"
              >
                Continue
              </button>
            </form>
        </div>
      </div>
    </main>
  );
}
