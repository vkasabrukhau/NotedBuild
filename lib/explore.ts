import { prisma } from "@/lib/prisma";
import type { NoteVisibilityId } from "@/lib/note-visibility";

export type ExploreViewer = {
  id: string;
  schoolId: string | null;
};

export type ExploreSourceType =
  | "friends"
  | "school"
  | "trending"
  | "public";

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
  sourceType: ExploreSourceType;
  sourceLabel: string;
  score: number;
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

function getRecencyScore(publishedAt: Date | null, updatedAt: Date) {
  const basis = publishedAt ?? updatedAt;
  const ageHours = Math.max(
    0,
    (Date.now() - basis.getTime()) / (1000 * 60 * 60),
  );

  if (ageHours <= 6) {
    return 30;
  }

  if (ageHours <= 24) {
    return 22;
  }

  if (ageHours <= 72) {
    return 12;
  }

  if (ageHours <= 168) {
    return 4;
  }

  return 0;
}

function getSourceForCandidate({
  commentCount,
  friendIds,
  likeCount,
  ownerId,
  ownerSchoolId,
  viewer,
}: {
  commentCount: number;
  friendIds: Set<string>;
  likeCount: number;
  ownerId: string;
  ownerSchoolId: string | null;
  viewer: ExploreViewer;
}): { sourceLabel: string; sourceType: ExploreSourceType; weight: number } {
  if (friendIds.has(ownerId)) {
    return {
      sourceLabel: "From friends",
      sourceType: "friends",
      weight: 40,
    };
  }

  if (viewer.schoolId && ownerSchoolId === viewer.schoolId) {
    return {
      sourceLabel: "From your school",
      sourceType: "school",
      weight: 28,
    };
  }

  if (commentCount >= 2 || likeCount >= 4) {
    return {
      sourceLabel: "Trending now",
      sourceType: "trending",
      weight: 18,
    };
  }

  return {
    sourceLabel: "Public post",
    sourceType: "public",
    weight: 10,
  };
}

export async function getRecommendedExploreFeed(
  viewer: ExploreViewer,
  limit = 24,
): Promise<ExploreNoteCard[]> {
  const friendIds = new Set(await getAcceptedFriendIds(viewer.id));

  const notes = await prisma.note.findMany({
    where: {
      deletedAt: null,
      ownerId: {
        not: viewer.id,
      },
      OR: [
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
    take: Math.max(limit * 4, 72),
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
          schoolId: true,
          school: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const ranked = notes
    .map((note) => {
      const source = getSourceForCandidate({
        commentCount: note.commentCount,
        friendIds,
        likeCount: note.likeCount,
        ownerId: note.owner.id,
        ownerSchoolId: note.owner.schoolId,
        viewer,
      });
      const score =
        source.weight +
        getRecencyScore(note.publishedAt, note.updatedAt) +
        note.likeCount * 3 +
        note.commentCount * 5;

      return {
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
        sourceLabel: source.sourceLabel,
        sourceType: source.sourceType,
        score,
        owner: {
          id: note.owner.id,
          email: note.owner.email,
          fullName: note.owner.fullName,
          profilePhotoUrl: note.owner.profilePhotoUrl,
          schoolName: note.owner.school?.name ?? null,
        },
      } satisfies ExploreNoteCard;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (
        new Date(right.publishedAt ?? right.updatedAt).getTime() -
        new Date(left.publishedAt ?? left.updatedAt).getTime()
      );
    })
    .slice(0, limit);

  return ranked;
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
