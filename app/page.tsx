import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SignInView from "@/components/sing-in/sign-in";
import SignUpView from "@/components/sign-up/sign-up";
import PersonalInfoView from "@/components/personal-info/personal-info";

type DbStatus = {
  ok: boolean;
  totalUsers: number;
  matchedUser: {
    id: string;
    age: number | null;
    email: string;
    fullName: string;
    schoolId: string | null;
  } | null;
  error: string | null;
};

async function getDbStatus(clerkId: string | null): Promise<DbStatus> {
  try {
    const [totalUsers, matchedUser] = await Promise.all([
      prisma.user.count(),
      clerkId
        ? prisma.user.findUnique({
            where: { clerkId },
            select: {
              age: true,
              id: true,
              email: true,
              fullName: true,
              schoolId: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      ok: true,
      totalUsers,
      matchedUser,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      totalUsers: 0,
      matchedUser: null,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "bad" | "neutral";
}) {
  const tones = {
    good: "border-emerald-200 bg-emerald-100 text-emerald-700",
    bad: "border-rose-200 bg-rose-100 text-rose-700",
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

type HomeProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="min-h-[calc(100vh-4rem)] grid place-items-center px-6">
        <SignInView />
      </main>
    );
  }

  const [dbStatus, clerkUser] = await Promise.all([
    getDbStatus(userId),
    currentUser(),
  ]);

  if (!dbStatus.ok) {
    return <main>{dbStatus.error}</main>;
  }

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    dbStatus.matchedUser?.email ??
    "";

  const fullName =
    clerkUser?.fullName ??
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ??
    dbStatus.matchedUser?.fullName ??
    "";

  if (!dbStatus.matchedUser || dbStatus.matchedUser.age === null) {
    return (
      <PersonalInfoView
        clerkId={userId}
        email={email}
        fullName={fullName}
      />
    );
  }

  if (
    resolvedSearchParams.step === "school" ||
    dbStatus.matchedUser.schoolId === null
  ) {
    const schools = await prisma.school.findMany({
      orderBy: [{ noteRanking: "asc" }, { name: "asc" }],
      select: {
        id: true,
        location: true,
        name: true,
      },
      take: 50,
    });

    return <SignUpView fullName={fullName} schools={schools} />;
  }

  return <main>APPp</main>;
}
