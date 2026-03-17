"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type OnboardingState = {
  error: string | null;
};

function getAgeFromBirthday(rawBirthday: string) {
  const birthday = new Date(rawBirthday);

  if (Number.isNaN(birthday.getTime())) {
    return null;
  }

  const today = new Date();

  if (birthday > today) {
    return null;
  }

  let age = today.getFullYear() - birthday.getFullYear();
  const monthDelta = today.getMonth() - birthday.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }

  if (age < 1 || age > 120) {
    return null;
  }

  return age;
}

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: "Sign in again before finishing your profile.",
    };
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "";
  const fullName = String(formData.get("fullName") ?? "").trim();
  const rawBirthday = String(formData.get("birthday") ?? "").trim();
  const age = getAgeFromBirthday(rawBirthday);

  if (!email) {
    return {
      error: "We could not read your email from Clerk.",
    };
  }

  if (!fullName) {
    return {
      error: "Please enter your full name.",
    };
  }

  if (age === null) {
    return {
      error: "Please enter a valid birthday.",
    };
  }

  try {
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
  } catch {
    return {
      error: "Something went wrong while saving your profile.",
    };
  }

  redirect("/");
}
