import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SignInView from "@/components/sing-in/sign-in";
import SignUpView from "@/components/sign-up/sign-up";
import PersonalInfoView from "@/components/personal-info/personal-info";
import RootHomeShell from "@/components/root-home-shell";

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
import PersonalInfoView from "@/components/personal-info/personal-info";
import RootHomeShell from "@/components/root-home-shell";
import SignInView from "@/components/sing-in/sign-in";
import { prisma } from "@/lib/prisma";

async function getMatchedUser(clerkId: string) {
  return prisma.user.findUnique({
    where: {
      clerkId,
    },
    select: {
      id: true,
      _count: {
        select: {
          notes: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
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
export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return <SignInView />;
  }

  const [matchedUser, clerkUser] = await Promise.all([
    getMatchedUser(userId),
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
  if (!matchedUser) {
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
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
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        location: true,
        name: true,
      },
    });

    return (
      <SignUpView
        fullName={fullName}
        schools={schools}
      />
    );
  }

  return <RootHomeShell />;
  return <RootHomeShell initialNoteUsageCount={matchedUser._count.notes} />;
}
