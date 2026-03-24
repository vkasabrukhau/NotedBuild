"use client";

import { useEffect, useState } from "react";
import { completeOnboarding } from "@/app/actions/complete-onboarding";
import SignUpStyles from "@/components/sign-up/sign-up-styles";
import TypewriterText from "@/components/ui/typewriter-text";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder";

const AGE_PLACEHOLDERS = ["How old are you?", "18", "21", "34"];

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
  const [age, setAge] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const isAgeComplete = age.trim() !== "";
  const agePlaceholder = useTypewriterPlaceholder({
    enabled: age.trim() === "",
    phrases: AGE_PLACEHOLDERS,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPanelVisible(true);
    }, 40);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white px-6 py-8 text-[#2b2725]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
        <div
          className={`mx-auto w-full max-w-5xl px-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            panelVisible
              ? "translate-y-0 scale-100 opacity-100 blur-0"
              : "translate-y-3 scale-[0.992] opacity-0 blur-sm"
          }`}
        >
          <TypewriterText
            as="h1"
            className="mx-auto max-w-4xl text-center text-[2.4rem] font-semibold leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]"
            text="Let's get to know you"
          />

          <form
            action={completeOnboarding}
            className="mx-auto mt-14 flex w-full max-w-3xl flex-col"
          >
            <input type="hidden" name="clerkId" value={clerkId} />
            <input type="hidden" name="fullName" value={fullName} />
            <input type="hidden" name="email" value={email} />

            <input
              id="age"
              name="age"
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              placeholder={agePlaceholder}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="auth-entry auth-input-surface w-full rounded-[2rem] border border-black/10 bg-black/[0.03] px-6 py-5 text-[2rem] leading-none text-black outline-none placeholder:text-black/20 sm:text-[2.4rem]"
              style={{ animationDelay: "90ms" }}
              required
            />

            <div
              className={`auth-entry auth-guidance mt-10 w-full ${
                isAgeComplete ? "auth-guidance--ready text-black" : "text-black/55"
              }`}
              style={{ animationDelay: "160ms" }}
            >
              <div className="flex items-center justify-between gap-6">
                <span className="auth-guidance-line" />
                <span className="auth-guidance-dot" />
                <p
                  className="auth-guidance-text flex-1 text-center text-sm uppercase tracking-[0.22em]"
                >
                  {isAgeComplete
                    ? (
                      <>
                        Press <span className="font-bold text-base">Enter</span>{" "}
                        to continue
                      </>
                    )
                    : "Finish entering your age before moving on"}
                </p>
                <span className="auth-guidance-dot" />
                <span className="auth-guidance-line" />
              </div>
            </div>
            <button
              aria-hidden="true"
              tabIndex={-1}
              type="submit"
              className="sr-only"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
      <SignUpStyles />
    </main>
  );
}
