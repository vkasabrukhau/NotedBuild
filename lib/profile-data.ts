import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getFriendshipStateFromRecords,
  type ProfileFriendshipState,
} from "@/lib/friendship-state";
import type { NoteVisibilityId } from "@/lib/note-visibility";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";

export type ProfileViewData = {
  id: string;
  age: number | null;
  bio: string | null;
  email: string;
  friends: ProfileFriendSummary[];
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
  notes: ProfileNoteSummary[];
};

export type ProfileNoteSummary = {
  commentCount: number;
  content: string;
  createdAt: string;
  id: string;
  likeCount: number;
  name: string;
  ownerEmail: string;
  publishedAt: string | null;
  visibility: NoteVisibilityId;
};

export type ProfileFriendSummary = {
  email: string;
  fullName: string;
  id: string;
  profilePhotoUrl: string | null;
};

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
  bio: true,
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
  notes: ProfileNoteSummary[] = [],
  friends: ProfileFriendSummary[] = [],
): ProfileViewData {
  return {
    id: user.id,
    age: user.age,
    bio: user.bio,
    email: user.email,
    friends,
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
    notes,
  };
}

export async function getProfileNotes(
  userId: string,
  ownerEmail: string,
  limit = 6,
  options?: {
    onlyPublished?: boolean;
  },
): Promise<ProfileNoteSummary[]> {
  const notes = await prisma.note.findMany({
    where: {
      deletedAt: null,
      ownerId: userId,
      ...(options?.onlyPublished
        ? {
            publishedAt: {
              not: null,
            },
            visibility: {
              not: "PRIVATE",
            },
          }
        : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
    select: {
      commentCount: true,
      content: true,
      createdAt: true,
      id: true,
      likeCount: true,
      name: true,
      publishedAt: true,
      visibility: true,
    },
  });

  return notes.map((note) => ({
    commentCount: note.commentCount,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    id: note.id,
    likeCount: note.likeCount,
    name: note.name,
    ownerEmail,
    publishedAt: note.publishedAt?.toISOString() ?? null,
    visibility: note.visibility,
  }));
}

export async function getProfileFriends(
  userId: string,
): Promise<ProfileFriendSummary[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      addressee: {
        select: {
          email: true,
          fullName: true,
          id: true,
          profilePhotoUrl: true,
        },
      },
      addresseeId: true,
      requester: {
        select: {
          email: true,
          fullName: true,
          id: true,
          profilePhotoUrl: true,
        },
      },
      requesterId: true,
    },
  });

  return friendships.map((friendship) =>
    friendship.requesterId === userId
      ? friendship.addressee
      : friendship.requester,
  );
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

  return {
    friendshipState: getFriendshipStateFromRecords(
      viewerUserId,
      profileUserId,
      friendships,
    ),
    isOwnProfile: false,
  };
}

export type { ProfileFriendshipState };
