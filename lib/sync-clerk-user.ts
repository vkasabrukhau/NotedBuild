import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

type SyncClerkUserOptions = {
  age?: number | null;
  fullName?: string;
};

export function getClerkUserEmail(clerkUser: ClerkUser): string | null {
  return (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null
  );
}

export function getClerkUserFullName(
  clerkUser: ClerkUser,
  emailFallback: string,
  fullName?: string,
): string {
  const trimmedFullName = fullName?.trim();

  if (trimmedFullName) {
    return trimmedFullName;
  }

  return (
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.fullName?.trim() ||
    clerkUser.username ||
    emailFallback
  );
}

export async function syncClerkUserToDb(
  clerkUser: ClerkUser,
  options: SyncClerkUserOptions = {},
) {
  const email = getClerkUserEmail(clerkUser);

  if (!email) {
    throw new Error("Signed-in user is missing an email address.");
  }

  const fullName = getClerkUserFullName(clerkUser, email, options.fullName);

  return prisma.$transaction(async (tx) => {
    const existingByClerkId = await tx.user.findUnique({
      where: {
        clerkId: clerkUser.id,
      },
    });

    const targetUser =
      existingByClerkId ??
      (await tx.user.findUnique({
        where: {
          email,
        },
      }));

    const data = {
      clerkId: clerkUser.id,
      email,
      fullName,
      ...(options.age !== undefined ? { age: options.age } : {}),
    };

    if (targetUser) {
      return tx.user.update({
        where: {
          id: targetUser.id,
        },
        data,
      });
    }

    return tx.user.create({
      data: {
        ...data,
        notesOwnedCount: 0,
        foldersOwnedCount: 0,
      },
    });
  });
}
