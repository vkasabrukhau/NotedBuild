import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";

export type ProfileViewData = {
  id: string;
  age: number | null;
  email: string;
  friendCount: number;
  folderCount: number;
  fullName: string;
  joinedAt: string;
  noteCount: number;
  profilePhotoUrl: string | null;
  schoolAccentColor: string | null;
  schoolId: string | null;
  schoolLogoUrl: string | null;
  schoolLocation: string | null;
  schoolName: string | null;
  schoolPrimaryColor: string | null;
};

export type ProfileFriendshipState =
  | "self"
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted";

export type ProfileViewerData = {
  friendshipState: ProfileFriendshipState;
  isOwnProfile: boolean;
};

export type ProfileSchoolOption = {
  id: string;
  location: string | null;
  name: string;
};

export const profileUserSelect = {
  id: true,
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
  _count: {
    select: {
      notes: {
        where: {
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type ProfileUserRecord = Prisma.UserGetPayload<{
  select: typeof profileUserSelect;
}>;

export async function getAcceptedFriendCount(userId: string) {
  return prisma.friendship.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

export function toProfileViewData(
  user: ProfileUserRecord,
  friendCount: number,
): ProfileViewData {
  return {
    id: user.id,
    age: user.age,
    email: user.email,
    friendCount,
    folderCount: user.foldersOwnedCount,
    fullName: user.fullName,
    joinedAt: user.joinedAt.toISOString(),
    noteCount: user._count.notes,
    profilePhotoUrl: user.profilePhotoUrl,
    schoolAccentColor: user.school?.accentColor ?? null,
    schoolId: user.schoolId,
    schoolLogoUrl: getMatchedSchoolLogoUrl(user.school?.name ?? null),
    schoolLocation: user.school?.location ?? null,
    schoolName: user.school?.name ?? null,
    schoolPrimaryColor: user.school?.primaryColor ?? null,
  };
}

export async function getSchoolOptions(): Promise<ProfileSchoolOption[]> {
  return prisma.school.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      location: true,
      name: true,
    },
  });
}

export async function getProfileViewerData(
  viewerUserId: string | null,
  profileUserId: string,
): Promise<ProfileViewerData> {
  if (!viewerUserId) {
    return {
      friendshipState: "none",
      isOwnProfile: false,
    };
  }

  if (viewerUserId === profileUserId) {
    return {
      friendshipState: "self",
      isOwnProfile: true,
    };
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        {
          requesterId: viewerUserId,
          addresseeId: profileUserId,
        },
        {
          requesterId: profileUserId,
          addresseeId: viewerUserId,
        },
      ],
    },
    select: {
      addresseeId: true,
      requesterId: true,
      status: true,
    },
  });

  if (friendships.some((friendship) => friendship.status === "ACCEPTED")) {
    return {
      friendshipState: "accepted",
      isOwnProfile: false,
    };
  }

  const directFriendship = friendships.find(
    (friendship) =>
      friendship.requesterId === viewerUserId &&
      friendship.addresseeId === profileUserId,
  );

  if (directFriendship?.status === "PENDING") {
    return {
      friendshipState: "pending_outgoing",
      isOwnProfile: false,
    };
  }

  const reverseFriendship = friendships.find(
    (friendship) =>
      friendship.requesterId === profileUserId &&
      friendship.addresseeId === viewerUserId,
  );

  if (reverseFriendship?.status === "PENDING") {
    return {
      friendshipState: "pending_incoming",
      isOwnProfile: false,
    };
  }

  return {
    friendshipState: "none",
    isOwnProfile: false,
  };
}
