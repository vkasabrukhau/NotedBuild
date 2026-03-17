import { auth, currentUser } from "@clerk/nextjs/server";
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
    },
  });
}

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return <SignInView />;
  }

  const [matchedUser, clerkUser] = await Promise.all([
    getMatchedUser(userId),
    currentUser(),
  ]);

  if (!matchedUser) {
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

  return <RootHomeShell />;
}
