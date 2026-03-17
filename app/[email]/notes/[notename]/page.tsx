import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import RootHomeShell from "@/components/root-home-shell";
import { prisma } from "@/lib/prisma";

export default async function NotePage({
  params,
}: {
  params: Promise<{
    email: string;
    notename: string;
  }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { email, notename } = await params;
  const decodedEmail = decodeURIComponent(email);
  const decodedNoteName = decodeURIComponent(notename);

  const note = await prisma.note.findFirst({
    where: {
      name: decodedNoteName,
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
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!note) {
    notFound();
  }

  return (
    <RootHomeShell
      initialView="note"
      initialNote={{
        id: note.id,
        name: note.name,
        content: note.content,
        ownerEmail: note.owner.email,
      }}
    />
  );
}
