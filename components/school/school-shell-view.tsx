"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/swr-fetcher";
import type { ExploreNoteCard } from "@/lib/explore";
import SchoolProfileView from "@/components/school/school-profile-view";

type SchoolData = {
  id: string;
  name: string;
  location: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
};

type StudentData = {
  id: string;
  email: string;
  fullName: string;
  profilePhotoUrl: string | null;
  schoolId: string | null;
};

type SchoolPayload = {
  school: SchoolData;
  students: StudentData[];
  notes: ExploreNoteCard[];
  error?: string;
};

export default function SchoolShellView({
  schoolId,
}: {
  schoolId: string | null;
}) {
  const { data, error, isLoading } = useSWR<SchoolPayload>(
    schoolId ? `/api/schools/${schoolId}` : null,
    swrFetcher,
  );

  if (!schoolId) {
    return (
      <div className="view-enter px-6 py-12 text-[18px] text-black/55">
        No school selected.
      </div>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-black sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="h-[100px] w-[100px] rounded-[28px] border border-black/10 bg-black/5" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-10 w-72 rounded bg-black/6" />
            <div className="h-5 w-40 rounded bg-black/6" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-sm">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`school-shell-tab-${index}`}
              className="h-[118px] rounded-[28px] border border-black/10 bg-black/5"
            />
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`school-shell-card-${index}`}
              className="h-[160px] rounded-[28px] border border-black/10 bg-black/5"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error || !data?.school) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-black sm:px-6 lg:px-8 xl:px-10">
        <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-8 text-[17px] text-red-700">
          {error instanceof Error
            ? error.message
            : data?.error || "Failed to load school."}
        </div>
      </main>
    );
  }

  return (
    <SchoolProfileView
      school={data.school}
      students={data.students}
      notes={data.notes}
    />
  );
}
