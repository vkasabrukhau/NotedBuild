import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ClerkSignUpView from "@/components/auth/clerk-sign-up";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/?step=school");
  }

  return <ClerkSignUpView />;
}
