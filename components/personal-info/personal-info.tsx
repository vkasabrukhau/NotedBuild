"use client";

import { useState } from "react";
import { Quicksand } from "next/font/google";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/complete-onboarding";

type PersonalInfoViewProps = {
  clerkId: string;
  email: string;
  fullName: string;
  testMode?: boolean;
};

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function PersonalInfoView({
  clerkId,
  email,
  fullName,
  testMode = false,
}: PersonalInfoViewProps) {
  const [age, setAge] = useState("");
  const router = useRouter();
  const firstName = fullName.split(" ").filter(Boolean)[0] ?? "there";

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] bg-white px-6 py-8 text-[#2b2725] ${quicksand.className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <div className="relative min-h-[34rem] sm:min-h-[38rem]">
          <section
            className="personal-info-intro pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center"
          >
            <h1 className="max-w-4xl text-[2.35rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]">
              Hi <span className="font-semibold">{firstName}</span>, let&apos;s
              set up the rest.
            </h1>
          </section>

          <section
            className="personal-info-panel absolute inset-0 mx-auto flex w-full max-w-5xl flex-col px-2 pt-16 sm:pt-24"
          >
            <h1 className="max-w-4xl text-center text-[2.4rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]">
              Tell us your age.
            </h1>

            <p className="mt-5 text-center text-base text-black/40 sm:text-lg">
              We&apos;ll use this to personalize your experience for{" "}
              {fullName || email}.
            </p>

            <form
              action={testMode ? undefined : completeOnboarding}
              className="mx-auto mt-14 flex w-full max-w-3xl flex-col"
              onSubmit={(event) => {
                if (!testMode) {
                  return;
                }

                event.preventDefault();
                if (!age.trim()) {
                  return;
                }

                router.push("/?step=school");
              }}
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
          </section>
        </div>
      </div>
      <style jsx>{`
        @keyframes onboardingIntroFade {
          0% {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(18px) scale(0.99);
          }
          18% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
          62% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(-28px) scale(0.975);
          }
        }

        @keyframes onboardingPanelRise {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(24px) scale(0.99);
          }
          38% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(24px) scale(0.99);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1);
          }
        }

        .personal-info-intro {
          animation: onboardingIntroFade 1800ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .personal-info-panel {
          animation: onboardingPanelRise 1800ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }
      `}</style>
    </main>
  );
}
