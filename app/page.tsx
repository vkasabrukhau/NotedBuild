import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
  const dbStatus = await getDbStatus(userId);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <StatusPill
            label={dbStatus.ok ? "Database Reachable" : "Database Error"}
            tone={dbStatus.ok ? "good" : "bad"}
          />
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Clerk and Prisma test view
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This page checks whether Clerk can identify the current user and
            whether Prisma can query your `User` table with that Clerk ID.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Clerk session</p>
            <div className="mt-4">
              <StatusPill
                label={userId ? "Signed In" : "Signed Out"}
                tone={userId ? "good" : "neutral"}
              />
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-slate-400">
              Current Clerk ID
            </p>
            <p className="mt-2 break-all rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100">
              {userId ?? "No Clerk session found"}
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              The value you store as `clerkId` in Prisma is the signed-in
              user&apos;s `auth().userId`. Clerk user IDs usually look like
              `user_...`.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Prisma query</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusPill
                label={dbStatus.ok ? "Query Worked" : "Query Failed"}
                tone={dbStatus.ok ? "good" : "bad"}
              />
              {dbStatus.ok ? (
                <StatusPill label={`${dbStatus.totalUsers} Users`} tone="neutral" />
              ) : null}
            </div>

            {dbStatus.ok ? (
              <>
                <p className="mt-6 text-xs uppercase tracking-[0.18em] text-slate-400">
                  Matching user row
                </p>
                {dbStatus.matchedUser ? (
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
                ) : (
                  <div className="mt-2 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-950">
                    No `User` row matches the current Clerk ID yet.
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-6 text-xs uppercase tracking-[0.18em] text-slate-400">
                  Error
                </p>
                <div className="mt-2 rounded-2xl bg-rose-50 p-4 font-mono text-sm leading-7 text-rose-950">
                  {dbStatus.error}
                </div>
              </>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
