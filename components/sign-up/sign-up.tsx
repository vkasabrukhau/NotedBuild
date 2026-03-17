"use client";

import { useState } from "react";
import { Quicksand } from "next/font/google";

type SchoolOption = {
  id: string;
  name: string;
  location?: string | null;
};

type SignUpViewProps = {
  age?: number | null;
  email?: string;
  fullName?: string;
  schools?: SchoolOption[];
};

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const usageReasons = [
  "Journaling",
  "School notes",
  "Task management",
  "Creative writing",
];

export default function SignUpView({
  age = null,
  email = "",
  fullName = "there",
  schools = [],
}: SignUpViewProps) {
  const [openPanel, setOpenPanel] = useState<"reason" | "school" | null>(
    "reason",
  );
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const selectedSchool =
    schools.find((school) => school.id === selectedSchoolId) ?? null;
  const filteredSchools = schools
    .filter((school) => {
      const haystack = `${school.name} ${school.location ?? ""}`.toLowerCase();
      return haystack.includes(schoolQuery.toLowerCase());
    });
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function handleReasonSelect(reason: string) {
    setSelectedReason(reason);
    setOpenPanel("school");
  }

  function handleSchoolSelect(schoolId: string) {
    setSelectedSchoolId(schoolId);
    setOpenPanel(null);
  }

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] bg-white px-6 py-12 text-[#2f2b28] ${quicksand.className}`}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.2fr)_22rem] lg:items-start">
        <section>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-black/15 text-xl font-semibold">
              {initials || "N"}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-black/35">
                Step 2
              </p>
              <h1 className="mt-2 text-[2.4rem] leading-none tracking-[-0.04em] sm:text-[3.2rem]">
                Nice, {fullName}. What are you using Noted for?
              </h1>
            </div>
          </div>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-black/55">
            Choose your reason, then pick your school. The details card updates
            as you move through onboarding.
          </p>

          <div className="mt-12 space-y-10">
            <div>
              <button
                type="button"
                onClick={() =>
                  setOpenPanel((current) =>
                    current === "reason" ? null : "reason",
                  )
                }
                className="flex w-full items-center justify-between border-b border-black/15 pb-3 text-left"
              >
                <span className="text-sm uppercase tracking-[0.24em] text-black/40">
                  Why are you here?
                </span>
                <span className="text-sm text-black/35">
                  {selectedReason || "Open"}
                </span>
              </button>

              {openPanel === "reason" ? (
                <div className="mt-4 space-y-1">
                  {usageReasons.map((reason, index) => {
                    const isSelected = selectedReason === reason;

                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => handleReasonSelect(reason)}
                        className="flex w-full items-center gap-5 border-b border-black/10 py-4 text-left transition hover:border-black/25"
                      >
                        <span className="w-8 text-sm text-black/25">
                          0{index + 1}
                        </span>
                        <span
                          className={`text-[1.6rem] leading-none tracking-[-0.03em] ${
                            isSelected ? "font-semibold text-black" : "text-black/55"
                          }`}
                        >
                          {reason}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : selectedReason ? (
                <div className="mt-4 text-lg text-black/65">{selectedReason}</div>
              ) : null}
            </div>

            <div className={`${selectedReason ? "opacity-100" : "opacity-45"}`}>
              <button
                type="button"
                disabled={!selectedReason}
                onClick={() =>
                  selectedReason
                    ? setOpenPanel((current) =>
                        current === "school" ? null : "school",
                      )
                    : undefined
                }
                className="flex w-full items-center justify-between border-b border-black/15 pb-3 text-left disabled:cursor-not-allowed"
              >
                <span className="text-sm uppercase tracking-[0.24em] text-black/40">
                  What school do you go to?
                </span>
                <span className="text-sm text-black/35">
                  {selectedSchool?.name || (selectedReason ? "Open" : "Choose reason first")}
                </span>
              </button>

              {openPanel === "school" && selectedReason ? (
                <div className="mt-5">
                  <input
                    value={schoolQuery}
                    onChange={(event) => setSchoolQuery(event.target.value)}
                    placeholder="Look for your school"
                    className="w-full border-b border-black/15 pb-3 text-[1.2rem] outline-none placeholder:text-black/25"
                  />

                  <div className="mt-4 max-h-[24rem] overflow-y-auto pr-2">
                    {filteredSchools.map((school, index) => {
                      const isSelected = selectedSchoolId === school.id;

                      return (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => handleSchoolSelect(school.id)}
                          className="flex w-full items-start gap-5 border-b border-black/10 py-4 text-left transition hover:border-black/25"
                        >
                          <span className="w-8 pt-1 text-sm text-black/25">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>
                            <span
                              className={`block text-[1.35rem] leading-none tracking-[-0.03em] ${
                                isSelected
                                  ? "font-semibold text-black"
                                  : "text-black/65"
                              }`}
                            >
                              {school.name}
                            </span>
                            {school.location ? (
                              <span className="mt-2 block text-sm text-black/35">
                                {school.location}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}

                    {filteredSchools.length === 0 ? (
                      <p className="py-6 text-sm text-black/40">
                        No schools matched that search.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : selectedSchool ? (
                <div className="mt-4">
                  <p className="text-lg text-black/65">{selectedSchool.name}</p>
                  {selectedSchool.location ? (
                    <p className="mt-1 text-sm text-black/35">
                      {selectedSchool.location}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-black/10 bg-[linear-gradient(180deg,#fff_0%,#f7f4ef_100%)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <p className="text-sm uppercase tracking-[0.24em] text-black/35">
              Personal card
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-semibold text-white">
                {initials || "N"}
              </div>
              <div>
                <p className="text-2xl leading-none tracking-[-0.03em]">
                  {fullName}
                </p>
                <p className="mt-2 text-sm text-black/45">{email || "No email"}</p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="border-b border-black/10 pb-4">
                <p className="text-xs uppercase tracking-[0.22em] text-black/35">
                  Age
                </p>
                <p className="mt-2 text-lg text-black/70">
                  {age ?? "Still missing"}
                </p>
              </div>

              <div className="border-b border-black/10 pb-4">
                <p className="text-xs uppercase tracking-[0.22em] text-black/35">
                  Using Noted for
                </p>
                <p className="mt-2 text-lg text-black/70">
                  {selectedReason || "Not chosen yet"}
                </p>
              </div>

              <div className="border-b border-black/10 pb-4">
                <p className="text-xs uppercase tracking-[0.22em] text-black/35">
                  School
                </p>
                <p className="mt-2 text-lg text-black/70">
                  {selectedSchool?.name || "Not chosen yet"}
                </p>
                {selectedSchool?.location ? (
                  <p className="mt-1 text-sm text-black/35">
                    {selectedSchool.location}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-black/35">
                  Onboarding
                </p>
                <p className="mt-2 text-lg text-black/70">
                  {selectedReason && selectedSchool
                    ? "Ready for the next step"
                    : "Still in progress"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
