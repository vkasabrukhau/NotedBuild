"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CompletionOverlay from "@/components/sign-up/completion-overlay";
import ReasonView from "@/components/sign-up/reason-view";
import SchoolView from "@/components/sign-up/school-view";
import SignUpStyles from "@/components/sign-up/sign-up-styles";
import type {
  CompletionPhase,
  SignUpPanelPhase,
  SignUpViewProps,
  SuggestionDirection,
} from "@/components/sign-up/types";

export default function SignUpView({
  fullName = "there",
  schools = [],
}: SignUpViewProps) {
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectingSchoolId, setSelectingSchoolId] = useState<string | null>(null);
  const [selectionFlashTick, setSelectionFlashTick] = useState(0);
  const [completionPhase, setCompletionPhase] =
    useState<CompletionPhase>("hidden");
  const [completionReady, setCompletionReady] = useState(false);
  const [activeSchoolIndex, setActiveSchoolIndex] = useState<number | null>(null);
  const [view, setView] = useState<"reason" | "school">("reason");
  const [panelPhase, setPanelPhase] = useState<SignUpPanelPhase>("enter");
  const [suggestionDirection, setSuggestionDirection] =
    useState<SuggestionDirection>("down");
  const previousFirstSuggestionIdRef = useRef<string | null>(null);
  const schoolFormRef = useRef<HTMLFormElement | null>(null);
  const schoolIdInputRef = useRef<HTMLInputElement | null>(null);
  const schoolInputRef = useRef<HTMLInputElement | null>(null);
  const activeSchoolRowRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();

  const normalizedQuery = schoolQuery.trim().toLowerCase();
  const matchingSchools =
    normalizedQuery === ""
      ? []
      : schools.filter((school) => {
          const haystack = `${school.name} ${school.location ?? ""}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });
  const filteredSchools = matchingSchools.slice(0, 8);
  const topSchool =
    normalizedQuery === ""
      ? null
      : schools.find((school) =>
          school.name.toLowerCase().startsWith(normalizedQuery),
        ) ??
        matchingSchools[0] ??
        null;
  const autocompleteSuffix =
    normalizedQuery !== "" &&
    topSchool?.name.toLowerCase().startsWith(schoolQuery.trim().toLowerCase())
      ? topSchool.name.slice(schoolQuery.trim().length)
      : "";
  const visibleActiveSchoolIndex =
    activeSchoolIndex === null || filteredSchools.length === 0
      ? null
      : Math.min(activeSchoolIndex, filteredSchools.length - 1);

  useEffect(() => {
    router.prefetch("/");
  }, [router]);
  useEffect(() => {
    if (panelPhase !== "enter") {
      return;
    }

    const timer = window.setTimeout(() => {
      setPanelPhase("idle");
    }, 520);

    return () => {
      window.clearTimeout(timer);
    };
  }, [panelPhase]);
  useEffect(() => {
    if (view !== "school") {
      return;
    }

    const timer = window.setTimeout(() => {
      schoolInputRef.current?.focus();
    }, panelPhase === "enter" ? 260 : 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [panelPhase, view]);
  useEffect(() => {
    if (!selectingSchoolId) {
      return;
    }

    const flashDurations = [240, 170, 120, 80, 55];
    const completionVisibleDelay = 50;
    let cancelled = false;
    const timeoutIds: number[] = [];

    const runFlash = (index: number) => {
      if (cancelled) {
        return;
      }

      setSelectionFlashTick(index);

      if (index >= flashDurations.length - 1) {
        setCompletionPhase("enter");
        timeoutIds.push(
          window.setTimeout(() => {
            if (!cancelled) {
              setCompletionPhase("visible");
            }
          }, completionVisibleDelay),
        );
        return;
      }

      timeoutIds.push(window.setTimeout(() => {
        runFlash(index + 1);
      }, flashDurations[index]));
    };

    runFlash(0);

    return () => {
      cancelled = true;
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [selectingSchoolId]);
  useEffect(() => {
    if (completionPhase !== "visible" || !completionReady) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      setCompletionPhase("exit");

      window.setTimeout(() => {
        if (schoolIdInputRef.current && schoolFormRef.current && selectingSchoolId) {
          schoolIdInputRef.current.value = selectingSchoolId;
          schoolFormRef.current.requestSubmit();
        }
      }, 60);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [completionPhase, completionReady, selectingSchoolId]);
  useEffect(() => {
    if (
      view !== "school" ||
      filteredSchools.length === 0 ||
      visibleActiveSchoolIndex === null
    ) {
      return;
    }

    activeSchoolRowRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [filteredSchools.length, view, visibleActiveSchoolIndex]);

  const firstName = fullName.split(" ").filter(Boolean)[0] ?? "there";

  function handleSchoolQueryChange(value: string) {
    const nextQuery = value.trim().toLowerCase();
    const previousFirstId = previousFirstSuggestionIdRef.current;
    const nextFirstId =
      nextQuery === ""
        ? null
        : schools.find((school) => school.name.toLowerCase().startsWith(nextQuery))
            ?.id ??
          schools.find((school) => {
            const haystack = `${school.name} ${school.location ?? ""}`.toLowerCase();
            return haystack.includes(nextQuery);
          })?.id ??
          null;

    if (previousFirstId && nextFirstId && previousFirstId !== nextFirstId) {
      const previousSchool = schools.find((school) => school.id === previousFirstId);
      const nextSchool = schools.find((school) => school.id === nextFirstId);

      if (previousSchool && nextSchool) {
        setSuggestionDirection(
          previousSchool.name.localeCompare(nextSchool.name) < 0 ? "up" : "down",
        );
      }
    }

    previousFirstSuggestionIdRef.current = nextFirstId;
    setActiveSchoolIndex(null);
    setSchoolQuery(value);
  }

  function handleSchoolSelect(schoolId: string) {
    if (selectingSchoolId) {
      return;
    }

    setCompletionReady(false);
    setSelectionFlashTick(0);
    setSelectingSchoolId(schoolId);
  }

  function switchView(nextView: "reason" | "school") {
    setPanelPhase("exit");
    window.setTimeout(() => {
      setView(nextView);
      setPanelPhase("enter");
    }, 260);
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white px-6 py-8 text-[#2b2725]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
        <div className="mx-auto w-full max-w-5xl px-2">
          <section
            className={`sign-up-panel mx-auto flex w-full max-w-5xl flex-col ${
              completionPhase !== "hidden"
                ? "pointer-events-none opacity-0 blur-sm"
                : panelPhase === "enter"
                ? "opacity-0 blur-sm"
                : panelPhase === "exit"
                  ? "opacity-0 blur-sm"
                  : "opacity-100 blur-0"
            }`}
          >
            {view === "reason" ? (
              <ReasonView
                onSelectReason={(reason) => {
                  setSelectedReason(reason);
                  switchView("school");
                }}
              />
            ) : (
              <SchoolView
                activeSchoolIndex={visibleActiveSchoolIndex}
                activeSchoolRowRef={activeSchoolRowRef}
                autocompleteSuffix={autocompleteSuffix}
                filteredSchools={filteredSchools}
                firstName={firstName}
                onHoverSchool={(index) => {
                  if (!selectingSchoolId) {
                    setActiveSchoolIndex(index);
                  }
                }}
                onKeyDown={(event) => {
                  if (selectingSchoolId) {
                    return;
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveSchoolIndex((current) => {
                      if (filteredSchools.length === 0) {
                        return null;
                      }

                      if (current === null) {
                        return 0;
                      }

                      return Math.min(current + 1, filteredSchools.length - 1);
                    });
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveSchoolIndex((current) => {
                      if (filteredSchools.length === 0) {
                        return null;
                      }

                      if (current === null) {
                        return filteredSchools.length - 1;
                      }

                      return Math.max(current - 1, 0);
                    });
                    return;
                  }

                  if (event.key !== "Enter") {
                    return;
                  }

                  const activeSchool =
                    (visibleActiveSchoolIndex === null
                      ? null
                      : filteredSchools[visibleActiveSchoolIndex]) ?? topSchool;

                  if (!activeSchool) {
                    return;
                  }

                  event.preventDefault();
                  handleSchoolSelect(activeSchool.id);
                }}
                onSchoolQueryChange={handleSchoolQueryChange}
                onSelectSchool={handleSchoolSelect}
                schoolFormRef={schoolFormRef}
                schoolIdInputRef={schoolIdInputRef}
                schoolInputRef={schoolInputRef}
                schoolQuery={schoolQuery}
                schoolsCount={schools.length}
                selectedReason={selectedReason}
                selectingSchoolId={selectingSchoolId}
                selectionFlashTick={selectionFlashTick}
                suggestionDirection={suggestionDirection}
              />
            )}
          </section>
        </div>
      </div>
      <CompletionOverlay
        onTypingComplete={() => setCompletionReady(true)}
        phase={completionPhase}
      />
      <SignUpStyles />
    </main>
  );
}
