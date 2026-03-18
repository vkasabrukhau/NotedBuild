import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateDbUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Signed-in user is missing an email address.");
  }

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email;

  return prisma.user.upsert({
    where: {
      clerkId: clerkUser.id,
    },
    update: {
      email,
      fullName,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      fullName,
      notesOwnedCount: 0,
      foldersOwnedCount: 0,
    },
  });
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
        id: note.id,
        name: note.name,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        ownerEmail: note.owner.email,
        folderId: note.folderId,
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

        const noteUsageCount = await tx.note.count({
          where: {
            ownerId: dbUser.id,
            deletedAt: null,
          },
        });

        return { note, noteUsageCount };
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

        const noteUsageCount = await tx.note.count({
          where: {
            ownerId: dbUser.id,
            deletedAt: null,
          },
        });

        return { note, noteUsageCount };
      }

      const createdNote = await tx.note.create({
        data: {
          name: trimmedTitle,
          content: body.content ?? "<p></p>",
          ownerId: dbUser.id,
          likeCount: 0,
          commentCount: 0,
        },
        include: {
          owner: {
            select: {
              email: true,
            },
          },
        },
      });

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

      return { note: createdNote, noteUsageCount };
    });

    return NextResponse.json({
      note: {
        id: result.note.id,
        name: result.note.name,
        content: result.note.content,
        ownerEmail: result.note.owner.email,
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
