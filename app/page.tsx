import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SignInView from "@/components/sing-in/sign-in";
import SignUpView from "@/components/sign-up/sign-up";
import { Sign } from "crypto";

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

  if (!dbStatus.matchedUser) {
    return SignInView();

  }

  if (!dbStatus.ok) {
    return SignUpView();

  }
}
