"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncClerkUserToDb } from "@/lib/sync-clerk-user";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "";
  const fullName = String(formData.get("fullName") ?? "").trim();
  const age = Number.parseInt(String(formData.get("age") ?? ""), 10);

  if (!email) {
    throw new Error("We could not read your email from Clerk.");
  }

  if (!fullName) {
    throw new Error("Please enter your full name.");
  }

  if (!Number.isInteger(age) || age < 1 || age > 120) {
    throw new Error("Please enter a valid age.");
  }

  if (!clerkUser || clerkUser.id !== userId) {
    throw new Error("We could not load your Clerk account.");
  }

  await syncClerkUserToDb(clerkUser, {
    age,
    fullName,
  });

  redirect("/?step=school");
}
