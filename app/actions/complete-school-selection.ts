"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function completeSchoolSelection(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const schoolId = String(formData.get("schoolId") ?? "").trim();

  if (!schoolId) {
    throw new Error("Please choose a school.");
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });

  if (!school) {
    throw new Error("That school could not be found.");
  }

  await prisma.user.update({
    where: { clerkId: userId },
    data: {
      schoolId,
    },
  });

  redirect("/");
}
