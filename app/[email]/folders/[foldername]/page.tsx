import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import RootHomeShell from "@/components/root-home-shell";
import type { ProfileViewData } from "@/lib/profile-data";
import { getSchoolOptions } from "@/lib/profile-data";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";

export default async function FolderPage({
  params,
}: {
  params: Promise<{
    email: string;
    foldername: string;
  }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { email, foldername } = await params;
  const decodedEmail = decodeURIComponent(email);
  const decodedFolderName = decodeURIComponent(foldername);

  const folder = await prisma.folder.findFirst({
    where: {
      name: decodedFolderName,
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
      notes: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!folder) {
    notFound();
  }

  const [noteUsageCount, folderCount, friendCount] = await Promise.all([
    prisma.note.count({
      where: {
        ownerId: folder.ownerId,
        deletedAt: null,
      },
    }),
    prisma.folder.count({
      where: {
        ownerId: folder.ownerId,
        deletedAt: null,
      },
    }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: folder.ownerId }, { addresseeId: folder.ownerId }],
      },
    }),
  ]);

  const profile: ProfileViewData = {
    id: folder.ownerId,
    age: folder.owner.age,
    email: folder.owner.email,
    friendCount,
    folderCount,
    fullName: folder.owner.fullName,
    joinedAt: folder.owner.joinedAt.toISOString(),
    noteCount: noteUsageCount,
    profilePhotoUrl: folder.owner.profilePhotoUrl,
    schoolAccentColor: folder.owner.school?.accentColor ?? null,
    schoolId: folder.owner.schoolId,
    schoolLogoUrl: getMatchedSchoolLogoUrl(folder.owner.school?.name ?? null),
    schoolLocation: folder.owner.school?.location ?? null,
    schoolName: folder.owner.school?.name ?? null,
    schoolPrimaryColor: folder.owner.school?.primaryColor ?? null,
    notes: [],
  };

  const schools = await getSchoolOptions();

  return (
    <RootHomeShell
      initialView="folder"
      initialNoteUsageCount={noteUsageCount}
      initialFolder={{
        id: folder.id,
        name: folder.name,
        ownerEmail: folder.owner.email,
        selectedNoteIds: folder.notes.map((note) => note.id),
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
