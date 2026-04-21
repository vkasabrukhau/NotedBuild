import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import RootHomeShell from "@/components/root-home-shell";
import {
  getAcceptedFriendCount,
  getProfileFriends,
  getProfileNotes,
  getProfileViewerData,
  getSchoolOptions,
  profileUserSelect,
  toProfileViewData,
} from "@/lib/profile-data";
import { prisma } from "@/lib/prisma";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{
    email: string;
  }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  const viewer = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: {
      id: true,
    },
  });

  const targetUser = await prisma.user.findUnique({
    where: {
      email: decodedEmail,
    },
    select: profileUserSelect,
  });

  if (!targetUser) {
    notFound();
  }

  const [friendCount, viewerData, schools, profileFriends] = await Promise.all([
    getAcceptedFriendCount(targetUser.id),
    getProfileViewerData(viewer?.id ?? null, targetUser.id),
    viewer?.id === targetUser.id ? getSchoolOptions() : Promise.resolve([]),
    getProfileFriends(targetUser.id),
  ]);

  const notes = await getProfileNotes(
    targetUser.id,
    targetUser.email,
    6,
    viewerData.isOwnProfile ? undefined : { onlyPublished: true },
  );

  return (
    <RootHomeShell
      initialView="profile"
      initialNoteUsageCount={targetUser._count.notes}
      profile={toProfileViewData(targetUser, friendCount, notes, profileFriends)}
      schools={schools}
      viewer={viewerData}
    />
  );
}
