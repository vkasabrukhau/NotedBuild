import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getOrCreateProgress, checkAndUnlockTamagotchis, awardXpAndCheckUnlocks } from "@/lib/progress-utils";
import { isNoteVisibilityId, type NoteVisibilityId } from "@/lib/note-visibility";

type NotePublicationState = {
  publishedAt: Date | null;
  visibility: NoteVisibilityId;
};

type PublicationStateClient = {
  $executeRaw: typeof prisma.$executeRaw;
  $queryRaw: typeof prisma.$queryRaw;
};

async function readNotePublicationState(
  tx: PublicationStateClient,
  noteId: string,
): Promise<NotePublicationState> {
  const rows = await tx.$queryRaw<
    Array<{ publishedAt: Date | null; visibility: NoteVisibilityId }>
  >`SELECT "publishedAt", "visibility" FROM "Note" WHERE "id" = ${noteId} LIMIT 1`;

  return rows[0] ?? { visibility: "PRIVATE", publishedAt: null };
}

async function writeNotePublicationState(
  tx: PublicationStateClient,
  noteId: string,
  visibility: NoteVisibilityId,
  publishedAt: Date | null,
) {
  await tx.$executeRaw`
    UPDATE "Note"
    SET "visibility" = ${visibility}::"NoteVisibility",
        "publishedAt" = ${publishedAt}
    WHERE "id" = ${noteId}
  `;
}

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: {
        ownerId: dbUser.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        owner: {
          select: {
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        commentCount: note.commentCount,
        id: note.id,
        likeCount: note.likeCount,
        name: note.name,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        ownerEmail: note.owner.email,
        folderId: note.folderId,
        visibility: note.visibility,
        publishedAt: note.publishedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load notes.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      noteId?: string;
      title?: string;
      content?: string;
      visibility?: string;
    };

    const trimmedTitle = body.title?.trim();
    if (!trimmedTitle) {
      return NextResponse.json(
        { error: "A note title is required before saving." },
        { status: 422 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (body.noteId) {
        const existingNote = await tx.note.findFirst({
          where: {
            id: body.noteId,
            ownerId: dbUser.id,
            deletedAt: null,
          },
        });

        if (!existingNote) {
          throw new Error("Note not found.");
        }

        const conflictingNote = await tx.note.findFirst({
          where: {
            ownerId: dbUser.id,
            name: trimmedTitle,
            deletedAt: null,
            NOT: {
              id: body.noteId,
            },
          },
        });

        if (conflictingNote) {
          throw new Error("A note with that title already exists.");
        }

        const currentPublicationState = await readNotePublicationState(
          tx,
          existingNote.id,
        );
        const nextVisibility = isNoteVisibilityId(body.visibility)
          ? body.visibility
          : currentPublicationState.visibility;
        const nextPublishedAt =
          nextVisibility === "PRIVATE"
            ? null
            : currentPublicationState.publishedAt ?? new Date();

        const note = await tx.note.update({
          where: {
            id: body.noteId,
          },
          data: {
            name: trimmedTitle,
            content: body.content ?? "<p></p>",
          },
          include: {
            owner: {
              select: {
                email: true,
              },
            },
          },
        });
        await writeNotePublicationState(
          tx,
          note.id,
          nextVisibility,
          nextPublishedAt,
        );

        const noteUsageCount = await tx.note.count({
          where: {
            ownerId: dbUser.id,
            deletedAt: null,
          },
        });

        return {
          note: {
            content: note.content,
            id: note.id,
            name: note.name,
            ownerEmail: note.owner.email,
            publishedAt: nextPublishedAt,
            visibility: nextVisibility,
          },
          noteUsageCount,
        };
      }

      const existingNote = await tx.note.findFirst({
        where: {
          ownerId: dbUser.id,
          name: trimmedTitle,
          deletedAt: null,
        },
        include: {
          owner: {
            select: {
              email: true,
            },
          },
        },
      });

      if (existingNote) {
        const currentPublicationState = await readNotePublicationState(
          tx,
          existingNote.id,
        );
        const nextVisibility = isNoteVisibilityId(body.visibility)
          ? body.visibility
          : currentPublicationState.visibility;
        const nextPublishedAt =
          nextVisibility === "PRIVATE"
            ? null
            : currentPublicationState.publishedAt ?? new Date();

        const note = await tx.note.update({
          where: {
            id: existingNote.id,
          },
          data: {
            content: body.content ?? "<p></p>",
          },
          include: {
            owner: {
              select: {
                email: true,
              },
            },
          },
        });
        await writeNotePublicationState(
          tx,
          note.id,
          nextVisibility,
          nextPublishedAt,
        );

        const noteUsageCount = await tx.note.count({
          where: {
            ownerId: dbUser.id,
            deletedAt: null,
          },
        });

        return {
          note: {
            content: note.content,
            id: note.id,
            name: note.name,
            ownerEmail: note.owner.email,
            publishedAt: nextPublishedAt,
            visibility: nextVisibility,
          },
          noteUsageCount,
        };
      }

      const nextVisibility = isNoteVisibilityId(body.visibility)
        ? body.visibility
        : "PRIVATE";

      const createdNote = await tx.note.create({
        data: {
          name: trimmedTitle,
          content: body.content ?? "<p></p>",
          ownerId: dbUser.id,
        },
        include: {
          owner: {
            select: {
              email: true,
            },
          },
        },
      });
      const nextPublishedAt =
        nextVisibility === "PRIVATE" ? null : new Date();
      await writeNotePublicationState(
        tx,
        createdNote.id,
        nextVisibility,
        nextPublishedAt,
      );

      await tx.user.update({
        where: {
          id: dbUser.id,
        },
        data: {
          notesOwnedCount: {
            increment: 1,
          },
        },
      });

      const noteUsageCount = await tx.note.count({
        where: {
          ownerId: dbUser.id,
          deletedAt: null,
        },
      });

      return {
        note: {
          content: createdNote.content,
          id: createdNote.id,
          name: createdNote.name,
          ownerEmail: createdNote.owner.email,
          publishedAt: nextPublishedAt,
          visibility: nextVisibility,
        },
        noteUsageCount,
      };
    });

    // Track first-note milestone + award XP for characters written (fire-and-forget)
    void (async () => {
      const progress = await getOrCreateProgress(dbUser.id);
      let currentProgress = progress;

      if (!progress.hasSavedFirstNote) {
        const updated = await prisma.userProgress.upsert({
          where: { userId: dbUser.id },
          update: { hasSavedFirstNote: true },
          create: { userId: dbUser.id, hasSavedFirstNote: true },
        });
        await checkAndUnlockTamagotchis(dbUser.id, updated);
        currentProgress = updated;
      }

      // Award 1 XP per 100 characters of content saved
      const charCount = (body.content ?? "").replace(/<[^>]*>/g, "").length;
      const xpEarned = Math.floor(charCount / 100);
      if (xpEarned > 0) {
        await awardXpAndCheckUnlocks(dbUser.id, xpEarned);
      }

      if (
        isNoteVisibilityId(body.visibility) &&
        body.visibility !== "PRIVATE" &&
        !currentProgress.hasAddedFirstCommunity
      ) {
        const updated = await prisma.userProgress.upsert({
          where: { userId: dbUser.id },
          update: { hasAddedFirstCommunity: true },
          create: { userId: dbUser.id, hasAddedFirstCommunity: true },
        });
        await checkAndUnlockTamagotchis(dbUser.id, updated);
      }

      void currentProgress; // suppress unused warning
    })();

    return NextResponse.json({
      note: {
        id: result.note.id,
        name: result.note.name,
        content: result.note.content,
        ownerEmail: result.note.ownerEmail,
        visibility: result.note.visibility,
        publishedAt: result.note.publishedAt?.toISOString() ?? null,
      },
      noteUsageCount: result.noteUsageCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save note.";

    const status =
      message === "Unauthorized."
        ? 401
        : message === "Note not found."
          ? 404
          : message === "A note with that title already exists."
            ? 409
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
