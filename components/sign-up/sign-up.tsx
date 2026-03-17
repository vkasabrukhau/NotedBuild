"use client";

import { useState } from "react";

type SchoolOption = {
  id: string;
  name: string;
  location?: string | null;
};

type SignUpViewProps = {
  fullName?: string;
  schools?: SchoolOption[];
};

const usageReasons = [
  "Journaling",
  "School notes",
  "Task management",
  "Creative writing",
];

export default function SignUpView({
  fullName = "there",
  schools = [],
}: SignUpViewProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f7f4ff_0%,#eef2ff_50%,#f8fafc_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
            Step 2
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Nice, {fullName}. What is Notely for?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Choose a reason for using Notely and pick your school.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Why are you using Notely?
            </p>
            <div className="mt-4 grid gap-3">
              {usageReasons.map((reason) => {
                const isSelected = selectedReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <label
              htmlFor="schoolId"
              className="text-sm font-medium text-slate-500"
            >
              Pick your school
            </label>
            <select
              id="schoolId"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.location
                    ? `${school.name} - ${school.location}`
                    : school.name}
                </option>
              ))}
            </select>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
              <p>
                <strong>Selected reason:</strong>{" "}
                {selectedReason || "Nothing chosen yet"}
              </p>
              <p className="mt-2">
                <strong>Selected school:</strong>{" "}
                {schools.find((school) => school.id === selectedSchoolId)?.name ??
                  "No school chosen yet"}
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
