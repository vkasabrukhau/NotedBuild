import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { ProfileViewData } from "@/components/profile/profile-view";
import RootHomeShell from "@/components/root-home-shell";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";

export default async function NotePage({
  params,
}: {
  params: Promise<{
    email: string;
    notename: string;
  }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { email, notename } = await params;
  const decodedEmail = decodeURIComponent(email);
  const decodedNoteName = decodeURIComponent(notename);

  const note = await prisma.note.findFirst({
    where: {
      name: decodedNoteName,
      deletedAt: null,
      owner: {
        email: decodedEmail,
        clerkId: userId,
      },
    },
    include: {
      owner: {
        select: {
          age: true,
          email: true,
          foldersOwnedCount: true,
          fullName: true,
          joinedAt: true,
          profilePhotoUrl: true,
          school: {
            select: {
              accentColor: true,
              location: true,
              name: true,
              primaryColor: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!note) {
    notFound();
  }

  const [noteUsageCount, folderCount] = await Promise.all([
    prisma.note.count({
      where: {
        ownerId: note.ownerId,
        deletedAt: null,
      },
    }),
    prisma.folder.count({
      where: {
        ownerId: note.ownerId,
        deletedAt: null,
      },
    }),
  ]);

  const profile: ProfileViewData = {
    age: note.owner.age,
    email: note.owner.email,
    folderCount,
    fullName: note.owner.fullName,
    joinedAt: note.owner.joinedAt.toISOString(),
    noteCount: noteUsageCount,
    profilePhotoUrl: note.owner.profilePhotoUrl,
    schoolAccentColor: note.owner.school?.accentColor ?? null,
    schoolLogoUrl: getMatchedSchoolLogoUrl(note.owner.school?.name ?? null),
    schoolLocation: note.owner.school?.location ?? null,
    schoolName: note.owner.school?.name ?? null,
    schoolPrimaryColor: note.owner.school?.primaryColor ?? null,
  };

  return (
    <RootHomeShell
      initialView="note"
      initialNoteUsageCount={noteUsageCount}
      initialNote={{
        id: note.id,
        name: note.name,
        content: note.content,
        ownerEmail: note.owner.email,
      }}
      profile={profile}
    />
  );
}
