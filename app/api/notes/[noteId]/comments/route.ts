import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getAccessibleNoteForViewer, getNoteCommentsForViewer } from "@/lib/explore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { noteId } = await params;
    const comments = await getNoteCommentsForViewer(noteId, {
      id: dbUser.id,
      schoolId: dbUser.schoolId,
    });

    if (!comments) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    return NextResponse.json({ comments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load comments.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
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

    const body = (await request.json()) as { body?: string };
    const trimmedBody = body.body?.trim();

    if (!trimmedBody) {
      return NextResponse.json(
        { error: "A comment body is required." },
        { status: 422 },
      );
    }

    if (trimmedBody.length > 600) {
      return NextResponse.json(
        { error: "Comments must be 600 characters or fewer." },
        { status: 422 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.noteComment.create({
        data: {
          noteId,
          authorId: dbUser.id,
          body: trimmedBody,
        },
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

      const updatedNote = await tx.note.update({
        where: {
          id: noteId,
        },
        data: {
          commentCount: {
            increment: 1,
          },
        },
        select: {
          commentCount: true,
        },
      });

      return {
        comment: {
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
        },
        commentCount: updatedNote.commentCount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save comment.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
