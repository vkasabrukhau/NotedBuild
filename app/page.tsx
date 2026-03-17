import { auth } from "@clerk/nextjs/server";
import RootHomeShell from "@/components/root-home-shell";

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
}
