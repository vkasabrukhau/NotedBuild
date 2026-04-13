import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NoteVisibilityId } from "@/lib/note-visibility";

export const EXPLORE_FEEDS = ["friends", "school", "public"] as const;

export type ExploreFeedId = (typeof EXPLORE_FEEDS)[number];

export type ExploreViewer = {
  id: string;
  schoolId: string | null;
};

export type ExploreNoteCard = {
  id: string;
  name: string;
  content: string;
  visibility: NoteVisibilityId;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  owner: {
    id: string;
    email: string;
    fullName: string;
    profilePhotoUrl: string | null;
    schoolName: string | null;
  };
};

export type ExploreCommentRecord = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    fullName: string;
    profilePhotoUrl: string | null;
  };
};

export function isExploreFeedId(value: unknown): value is ExploreFeedId {
  return typeof value === "string" && EXPLORE_FEEDS.includes(value as ExploreFeedId);
}

export async function getAcceptedFriendIds(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: {
      requesterId: true,
      addresseeId: true,
    },
  });

  return friendships.map((friendship) =>
    friendship.requesterId === userId
      ? friendship.addresseeId
      : friendship.requesterId,
  );
}

export function getFeedWhere(
  feed: ExploreFeedId,
  viewer: ExploreViewer,
  friendIds: string[] = [],
): Prisma.NoteWhereInput | null {
  if (feed === "friends" && friendIds.length === 0) {
    return null;
  }

  const sameSchoolVisibility: Prisma.NoteWhereInput | null = viewer.schoolId
    ? {
        visibility: "SCHOOL",
        owner: {
          schoolId: viewer.schoolId,
        },
      }
    : null;

  if (feed === "friends") {
    return {
      deletedAt: null,
      ownerId: {
        in: friendIds,
      },
      OR: [
        {
          visibility: "PUBLIC",
        },
        ...(sameSchoolVisibility ? [sameSchoolVisibility] : []),
      ],
    };
  }

  if (feed === "school") {
    if (!viewer.schoolId) {
      return null;
    }

    return {
      deletedAt: null,
      ownerId: {
        not: viewer.id,
      },
      owner: {
        schoolId: viewer.schoolId,
      },
      visibility: {
        in: ["SCHOOL", "PUBLIC"],
      },
    };
  }

  return {
    deletedAt: null,
    ownerId: {
      not: viewer.id,
    },
    visibility: "PUBLIC",
  };
}

export async function getExploreFeed(
  feed: ExploreFeedId,
  viewer: ExploreViewer,
  limit = 24,
): Promise<ExploreNoteCard[]> {
  const friendIds = feed === "friends" ? await getAcceptedFriendIds(viewer.id) : [];
  const where = getFeedWhere(feed, viewer, friendIds);

  if (!where) {
    return [];
  }

  const notes = await prisma.note.findMany({
    where,
    take: limit,
    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      id: true,
      name: true,
      content: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      likeCount: true,
      commentCount: true,
      likes: {
        where: {
          userId: viewer.id,
        },
        select: {
          userId: true,
        },
        take: 1,
      },
      owner: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profilePhotoUrl: true,
          school: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return notes.map((note) => ({
    id: note.id,
    name: note.name,
    content: note.content,
    visibility: note.visibility,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    publishedAt: note.publishedAt?.toISOString() ?? null,
    likeCount: note.likeCount,
    commentCount: note.commentCount,
    likedByViewer: note.likes.length > 0,
    owner: {
      id: note.owner.id,
      email: note.owner.email,
      fullName: note.owner.fullName,
      profilePhotoUrl: note.owner.profilePhotoUrl,
      schoolName: note.owner.school?.name ?? null,
    },
  }));
}

export async function getAccessibleNoteForViewer(
  noteId: string,
  viewer: ExploreViewer,
) {
  return prisma.note.findFirst({
    where: {
      id: noteId,
      deletedAt: null,
      OR: [
        {
          ownerId: viewer.id,
        },
        {
          visibility: "PUBLIC",
        },
        ...(viewer.schoolId
          ? [
              {
                visibility: "SCHOOL" as const,
                owner: {
                  schoolId: viewer.schoolId,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      ownerId: true,
      visibility: true,
      owner: {
        select: {
          schoolId: true,
        },
      },
    },
  });
}

export async function getNoteCommentsForViewer(
  noteId: string,
  viewer: ExploreViewer,
  limit = 40,
): Promise<ExploreCommentRecord[] | null> {
  const note = await getAccessibleNoteForViewer(noteId, viewer);

  if (!note || note.visibility === "PRIVATE") {
    return null;
  }

  const comments = await prisma.noteComment.findMany({
    where: {
      noteId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
    select: {
      id: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: {
      id: comment.author.id,
      email: comment.author.email,
      fullName: comment.author.fullName,
      profilePhotoUrl: comment.author.profilePhotoUrl,
    },
  }));
}
