import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import RootHomeShell from "@/components/root-home-shell";
import type { ProfileViewData } from "@/lib/profile-data";
import { getSchoolOptions } from "@/lib/profile-data";
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
          schoolId: true,
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

  const [noteUsageCount, folderCount, friendCount] = await Promise.all([
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
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: note.ownerId }, { addresseeId: note.ownerId }],
      },
    }),
  ]);

  const profile: ProfileViewData = {
    id: note.ownerId,
    age: note.owner.age,
    bio: null,
    email: note.owner.email,
    friendCount,
    folderCount,
    fullName: note.owner.fullName,
    joinedAt: note.owner.joinedAt.toISOString(),
    noteCount: noteUsageCount,
    profilePhotoUrl: note.owner.profilePhotoUrl,
    schoolAccentColor: note.owner.school?.accentColor ?? null,
    schoolId: note.owner.schoolId,
    schoolLogoUrl: getMatchedSchoolLogoUrl(note.owner.school?.name ?? null),
    schoolLocation: note.owner.school?.location ?? null,
    schoolName: note.owner.school?.name ?? null,
    schoolPrimaryColor: note.owner.school?.primaryColor ?? null,
    notes: [],
  };

  const schools = await getSchoolOptions();

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
      schools={schools}
      viewer={{
        friendshipState: "self",
        isOwnProfile: true,
      }}
    />
  );
}
