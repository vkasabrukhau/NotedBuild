"use client";

import { useEffect, useMemo, useState } from "react";
import { Quicksand } from "next/font/google";
import { useRouter } from "next/navigation";
import { completeSchoolSelection } from "@/app/actions/complete-school-selection";

type SchoolOption = {
  id: string;
  name: string;
  location?: string | null;
};

type SignUpViewProps = {
  fullName?: string;
  schools?: SchoolOption[];
  testMode?: boolean;
};

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const reasonOptions = [
  { label: "Work", color: "bg-[#df7b5e]" },
  { label: "School", color: "bg-[#4a4c71]" },
  { label: "Socializing", color: "bg-[#88b49c]" },
  { label: "Other", color: "bg-[#f3cf8b]" },
];

export default function SignUpView({
  fullName = "there",
  schools = [],
  testMode = false,
}: SignUpViewProps) {
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [view, setView] = useState<"reason" | "school">("reason");
  const [panelTransition, setPanelTransition] = useState(false);
  const router = useRouter();

  const filteredSchools = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return schools.filter((school) => {
      const haystack = `${school.name} ${school.location ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [schoolQuery, schools]);

  useEffect(() => {
    if (!panelTransition) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPanelTransition(false);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [panelTransition]);

  const firstName = fullName.split(" ").filter(Boolean)[0] ?? "there";

  function switchView(nextView: "reason" | "school") {
    setPanelTransition(true);
    window.setTimeout(() => {
      setView(nextView);
    }, 220);
  }

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] bg-white px-6 py-8 text-[#2b2725] ${quicksand.className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <div className="relative min-h-[34rem] sm:min-h-[38rem]">
          <section
            className="sign-up-intro pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center"
          >
            <h1 className="max-w-4xl text-[2.35rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]">
              Hi <span className="font-semibold">{firstName}</span>, we&apos;re{" "}
              <span className="font-semibold">thrilled</span> to have you!
            </h1>
          </section>

          <section
            className={`sign-up-reason-panel absolute inset-0 mx-auto flex w-full max-w-5xl flex-col px-2 pt-16 sm:pt-24 ${
              view === "reason"
                ? "opacity-100 blur-0"
                : "pointer-events-none opacity-0 blur-sm"
            } ${
              view === "reason"
                ? "translate-x-0 scale-100"
                : "-translate-x-8 opacity-0"
            } ${
              view === "school" && panelTransition
                ? "-translate-x-8 opacity-0"
                : ""
            }`}
          >
            <h1 className="max-w-4xl text-center text-[2.4rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]">
              Tell us a little bit more about what you will Note
            </h1>

            <div className="mt-14 grid w-full gap-8 sm:grid-cols-2">
              {reasonOptions.map((reason) => (
                <button
                  key={reason.label}
                  type="button"
                  onClick={() => {
                    setSelectedReason(reason.label);
                    switchView("school");
                  }}
                  className={`flex min-h-[10.5rem] items-center justify-center rounded-[1.2rem] px-8 text-[2rem] font-medium tracking-[-0.04em] text-white transition duration-500 ease-out hover:scale-[1.01] ${reason.color}`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </section>

          <section
            className={`sign-up-school-panel absolute inset-0 mx-auto flex w-full max-w-5xl flex-col px-2 pt-16 sm:pt-24 ${
              view === "school"
                ? "opacity-100 blur-0"
                : "pointer-events-none opacity-0 blur-sm"
            } ${
              view === "school"
                ? "translate-x-0 scale-100"
                : "translate-x-8 opacity-0"
            } ${
              view === "reason" && panelTransition
                ? "translate-x-8 opacity-0"
                : ""
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setSchoolQuery("");
                switchView("reason");
              }}
              className="w-fit text-sm uppercase tracking-[0.22em] text-black/40 transition hover:text-black"
            >
              ← Back
            </button>

            <h1 className="mt-6 text-[2.4rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.3rem]">
              Great. Choose your school.
            </h1>

            <form
              action={testMode ? undefined : completeSchoolSelection}
              className="mt-12"
              onSubmit={(event) => {
                if (!testMode) {
                  return;
                }

                event.preventDefault();
              }}
            >
              <input type="hidden" name="reason" value={selectedReason ?? ""} />

              <input
                value={schoolQuery}
                onChange={(event) => setSchoolQuery(event.target.value)}
                placeholder="Search for your school"
                className="w-full border-b border-black/20 pb-4 text-[1.6rem] outline-none placeholder:text-black/25"
              />

              <div className="mt-8 max-h-[28rem] overflow-y-auto">
                {schoolQuery.trim() === "" ? (
                  <p className="text-base text-black/40">
                    Start typing to search across all imported schools.
                  </p>
                ) : null}

                {schoolQuery.trim() !== "" && filteredSchools.length === 0 ? (
                  <p className="text-base text-black/40">
                    No schools matched that search.
                  </p>
                ) : null}

                {filteredSchools.map((school) => (
                  <button
                    key={school.id}
                    type={testMode ? "button" : "submit"}
                    name={testMode ? undefined : "schoolId"}
                    value={testMode ? undefined : school.id}
                    onClick={() => {
                      if (!testMode) {
                        return;
                      }

                      router.push("/?step=home");
                    }}
                    className="flex w-full items-start justify-between gap-6 border-b border-black/10 py-5 text-left transition hover:border-black/25"
                  >
                    <span>
                      <span className="block text-[1.45rem] leading-none tracking-[-0.03em] text-black">
                        {school.name}
                      </span>
                      {school.location ? (
                        <span className="mt-2 block text-sm text-black/40">
                          {school.location}
                        </span>
                      ) : null}
                    </span>
                    <span className="pt-1 text-sm uppercase tracking-[0.22em] text-black/30">
                      Select
                    </span>
                  </button>
                ))}
              </div>
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

        .sign-up-intro {
          animation: onboardingIntroFade 1800ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .sign-up-reason-panel {
          animation: onboardingPanelRise 1800ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
          transition:
            opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .sign-up-school-panel {
          animation: onboardingPanelRise 1800ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
          transition:
            opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </main>
  );
}
