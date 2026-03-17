"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      age,
      email,
      fullName,
    },
    create: {
      age,
      clerkId: userId,
      email,
      fullName,
    },
  });

  redirect("/?step=school");
}
