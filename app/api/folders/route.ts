import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncClerkUserToDb } from "@/lib/sync-clerk-user";

async function getOrCreateDbUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  return syncClerkUserToDb(clerkUser);
}

export async function GET(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    if (searchParams.get("view") === "folders") {
      const folders = await prisma.folder.findMany({
        where: {
          ownerId: dbUser.id,
          deletedAt: null,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          name: true,
          owner: {
            select: {
              email: true,
            },
          },
          updatedAt: true,
          _count: {
            select: {
              notes: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        folders: folders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          noteCount: folder._count.notes,
          ownerEmail: folder.owner.email,
          updatedAt: folder.updatedAt.toISOString(),
        })),
      });
    }

    const notes = await prisma.note.findMany({
      where: {
        ownerId: dbUser.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        content: true,
        createdAt: true,
        folderId: true,
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
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
      folderId?: string;
      title?: string;
      selectedNoteIds?: string[];
    };

    const trimmedTitle = body.title?.trim();
    if (!trimmedTitle) {
      return NextResponse.json(
        { error: "A folder title is required before saving." },
        { status: 422 },
      );
    }

    const selectedNoteIds = Array.from(new Set(body.selectedNoteIds ?? []));

    const folder = await prisma.$transaction(async (tx) => {
      if (selectedNoteIds.length > 0) {
        const ownedNotesCount = await tx.note.count({
          where: {
            ownerId: dbUser.id,
            deletedAt: null,
            id: {
              in: selectedNoteIds,
            },
          },
        });

        if (ownedNotesCount !== selectedNoteIds.length) {
          throw new Error("One or more selected notes are unavailable.");
        }
      }

      let targetFolder;

      if (body.folderId) {
        const existingFolder = await tx.folder.findFirst({
          where: {
            id: body.folderId,
            ownerId: dbUser.id,
            deletedAt: null,
          },
        });

        if (!existingFolder) {
          throw new Error("Folder not found.");
        }

        const conflictingFolder = await tx.folder.findFirst({
          where: {
            ownerId: dbUser.id,
            name: trimmedTitle,
            deletedAt: null,
            NOT: {
              id: body.folderId,
            },
          },
        });

        if (conflictingFolder) {
          throw new Error("A folder with that title already exists.");
        }

        targetFolder = await tx.folder.update({
          where: {
            id: body.folderId,
          },
          data: {
            name: trimmedTitle,
          },
          include: {
            owner: {
              select: {
                email: true,
              },
            },
          },
        });
      } else {
        const existingFolder = await tx.folder.findFirst({
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

        if (existingFolder) {
          targetFolder = existingFolder;
        } else {
          targetFolder = await tx.folder.create({
            data: {
              name: trimmedTitle,
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

          await tx.user.update({
            where: {
              id: dbUser.id,
            },
            data: {
              foldersOwnedCount: {
                increment: 1,
              },
            },
          });
        }
      }

      await tx.note.updateMany({
        where: {
          ownerId: dbUser.id,
          deletedAt: null,
          folderId: targetFolder.id,
          id: {
            notIn: selectedNoteIds,
          },
        },
        data: {
          folderId: null,
        },
      });

      if (selectedNoteIds.length > 0) {
        await tx.note.updateMany({
          where: {
            ownerId: dbUser.id,
            deletedAt: null,
            id: {
              in: selectedNoteIds,
            },
          },
          data: {
            folderId: targetFolder.id,
          },
        });
      }

      return {
        id: targetFolder.id,
        name: targetFolder.name,
        ownerEmail: targetFolder.owner.email,
        selectedNoteIds,
      };
    });

    return NextResponse.json({ folder });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save folder.";

    const status =
      message === "Unauthorized."
        ? 401
        : message === "Folder not found."
          ? 404
          : message === "A folder with that title already exists."
            ? 409
            : message === "One or more selected notes are unavailable."
              ? 422
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
