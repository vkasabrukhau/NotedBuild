import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SignInView from "@/components/sing-in/sign-in";
import SignUpView from "@/components/sign-up/sign-up";
import { Sign } from "crypto";
import { SignIn } from "@clerk/nextjs";
import PersonalInfoView from "@/components/personal-info/personal-info";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

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

  if (!userId){
    return <SignInView />;
  }

  const [dbStatus, clerkUser] = await Promise.all([
    getDbStatus(userId),
    currentUser(),
  ]);

  if (!dbStatus.ok) {
    return <main>{dbStatus.error}</main>;
  }

  
  if (!dbStatus.matchedUser) {
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
      "";

    const fullName =
      clerkUser?.fullName ??
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ");

    return (
      <PersonalInfoView
        clerkId={userId}
        email={email}
        fullName={fullName}
      />
    );
  }

  return <main> APPp</main>;
}
