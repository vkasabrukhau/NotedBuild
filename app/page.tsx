import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PersonalInfoView from "@/components/personal-info/personal-info";
import SignInView from "@/components/sing-in/sign-in";

type DbStatus = {
  ok: boolean;
  totalUsers: number;
  matchedUser: {
    id: string;
    email: string;
    fullName: string;
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
              id: true,
              email: true,
              fullName: true,
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

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[radial-gradient(circle_at_top,#faf5ff_0%,#eef2ff_45%,#f8fafc_100%)] px-6 py-12">
        <SignInView />
      </main>
    );
  }

  const [dbStatus, clerkUser] = await Promise.all([
    getDbStatus(userId),
    currentUser(),
  ]);

  if (!dbStatus.ok) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#fff7f7_0%,#ffe4e6_100%)] px-6 py-16 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <StatusPill label="Database Error" tone="bad" />
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Notely can&apos;t finish setup right now
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Clerk signed you in, but Prisma could not load your profile data.
          </p>
          <div className="mt-6 rounded-2xl bg-rose-50 p-4 font-mono text-sm leading-7 text-rose-950">
            {dbStatus.error}
          </div>
        </div>
      </main>
    );
  }

  if (!dbStatus.matchedUser) {
    const defaultEmail =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
      "";
    const defaultFullName =
      clerkUser?.fullName ??
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ");

    return (
      <PersonalInfoView
        defaultEmail={defaultEmail}
        defaultFullName={defaultFullName}
      />
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <StatusPill label="Profile Ready" tone="good" />
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome back, {dbStatus.matchedUser.fullName}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Your Clerk account is connected and your Prisma user row is ready.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Account</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusPill label="Signed In" tone="good" />
              <StatusPill label="Onboarded" tone="good" />
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-slate-400">
              Clerk ID
            </p>
            <p className="mt-2 break-all rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100">
              {userId}
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Profile</p>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-slate-400">
              Saved user row
            </p>
            <div className="mt-2 rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
              <p>
                <strong>id:</strong> {dbStatus.matchedUser.id}
              </p>
              <p>
                <strong>email:</strong> {dbStatus.matchedUser.email}
              </p>
              <p>
                <strong>fullName:</strong> {dbStatus.matchedUser.fullName}
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
