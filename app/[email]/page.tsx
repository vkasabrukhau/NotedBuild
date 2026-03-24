import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import ProfileView from "@/components/profile/profile-view";
import {
  getAcceptedFriendCount,
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

  const [friendCount, viewerData, schools] = await Promise.all([
    getAcceptedFriendCount(targetUser.id),
    getProfileViewerData(viewer?.id ?? null, targetUser.id),
    viewer?.id === targetUser.id ? getSchoolOptions() : Promise.resolve([]),
  ]);

  return (
    <ProfileView
      profile={toProfileViewData(targetUser, friendCount)}
      schools={schools}
      viewer={viewerData}
    />
  );
}
