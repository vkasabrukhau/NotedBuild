import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getAccessibleNoteForViewer } from "@/lib/explore";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { noteId } = await params;
    const note = await getAccessibleNoteForViewer(noteId, {
      id: dbUser.id,
      schoolId: dbUser.schoolId,
    });

    if (!note || note.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    const existingLike = await prisma.noteLike.findUnique({
      where: {
        noteId_userId: {
          noteId,
          userId: dbUser.id,
        },
      },
      select: {
        noteId: true,
      },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.noteLike.delete({
          where: {
            noteId_userId: {
              noteId,
              userId: dbUser.id,
            },
          },
        }),
        prisma.note.update({
          where: {
            id: noteId,
          },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const updated = await prisma.note.findUnique({
        where: {
          id: noteId,
        },
        select: {
          likeCount: true,
        },
      });

      return NextResponse.json({
        liked: false,
        likeCount: Math.max(0, updated?.likeCount ?? 0),
      });
    }

    await prisma.$transaction([
      prisma.noteLike.create({
        data: {
          noteId,
          userId: dbUser.id,
        },
      }),
      prisma.note.update({
        where: {
          id: noteId,
        },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      }),
    ]);

    const updated = await prisma.note.findUnique({
      where: {
        id: noteId,
      },
      select: {
        likeCount: true,
      },
    });

    return NextResponse.json({
      liked: true,
      likeCount: updated?.likeCount ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update like.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
