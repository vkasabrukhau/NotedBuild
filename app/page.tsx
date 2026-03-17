import { auth } from "@clerk/nextjs/server";
import RootHomeShell from "@/components/root-home-shell";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SignInView from "@/components/sing-in/sign-in";
import SignUpView from "@/components/sign-up/sign-up";
import { Sign } from "crypto";
import { SignIn } from "@clerk/nextjs";
import PersonalInfoView from "@/components/personal-info/personal-info";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    return <RootHomeShell />;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-[40px] font-bold leading-none">
          Sign in to start noting.
        </h1>
        <p className="max-w-2xl text-[24px] leading-[1.4] text-gray-500">
          Your signed-in home view now lives on root. Use the controls in the
          header to sign in or create an account.
        </p>
      </div>
    </main>
  );
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
