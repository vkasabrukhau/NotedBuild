import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import RootHomeShell from "@/components/root-home-shell";
import { prisma } from "@/lib/prisma";

export default async function FolderPage({
  params,
}: {
  params: Promise<{
    email: string;
    foldername: string;
  }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { email, foldername } = await params;
  const decodedEmail = decodeURIComponent(email);
  const decodedFolderName = decodeURIComponent(foldername);

  const folder = await prisma.folder.findFirst({
    where: {
      name: decodedFolderName,
      deletedAt: null,
      owner: {
        email: decodedEmail,
        clerkId: userId,
      },
    },
    include: {
      owner: {
        select: {
          email: true,
        },
      },
      notes: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!folder) {
    notFound();
  }

  return (
    <RootHomeShell
      initialView="folder"
      initialFolder={{
        id: folder.id,
        name: folder.name,
        ownerEmail: folder.owner.email,
        selectedNoteIds: folder.notes.map((note) => note.id),
      }}
    />
  );
}
