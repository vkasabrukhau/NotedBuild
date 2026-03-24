import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProfileFriendshipState } from "@/lib/profile-data";

type CreateFriendshipBody = {
  targetUserId?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return jsonError("Unauthorized.", 401);
    }

    const body = (await request.json()) as CreateFriendshipBody;
    const targetUserId = body.targetUserId?.trim();

    if (!targetUserId) {
      return jsonError("A target user is required.", 422);
    }

    const viewer = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!viewer) {
      return jsonError("Your user record could not be found.", 404);
    }

    if (viewer.id === targetUserId) {
      return jsonError("You cannot send a friend request to yourself.", 422);
    }

    const target = await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
      },
    });

    if (!target) {
      return jsonError("That user could not be found.", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      const direct = await tx.friendship.findUnique({
        where: {
          requesterId_addresseeId: {
            addresseeId: targetUserId,
            requesterId: viewer.id,
          },
        },
      });

      const reverse = await tx.friendship.findUnique({
        where: {
          requesterId_addresseeId: {
            addresseeId: viewer.id,
            requesterId: targetUserId,
          },
        },
      });

      if (direct?.status === "ACCEPTED" || reverse?.status === "ACCEPTED") {
        return {
          friendshipState: "accepted" as ProfileFriendshipState,
          message: "You are already friends.",
        };
      }

      if (reverse?.status === "PENDING") {
        await tx.friendship.update({
          where: {
            requesterId_addresseeId: {
              addresseeId: viewer.id,
              requesterId: targetUserId,
            },
          },
          data: {
            status: "ACCEPTED",
          },
        });

        return {
          friendshipState: "accepted" as ProfileFriendshipState,
          message: "Friend request accepted.",
        };
      }

      if (direct?.status === "PENDING") {
        return {
          friendshipState: "pending_outgoing" as ProfileFriendshipState,
          message: "Friend request already sent.",
        };
      }

      if (direct?.status === "REJECTED") {
        await tx.friendship.update({
          where: {
            requesterId_addresseeId: {
              addresseeId: targetUserId,
              requesterId: viewer.id,
            },
          },
          data: {
            status: "PENDING",
          },
        });

        return {
          friendshipState: "pending_outgoing" as ProfileFriendshipState,
          message: "Friend request sent.",
        };
      }

      if (reverse?.status === "REJECTED") {
        await tx.friendship.delete({
          where: {
            requesterId_addresseeId: {
              addresseeId: viewer.id,
              requesterId: targetUserId,
            },
          },
        });
      }

      await tx.friendship.create({
        data: {
          addresseeId: targetUserId,
          requesterId: viewer.id,
          status: "PENDING",
        },
      });

      return {
        friendshipState: "pending_outgoing" as ProfileFriendshipState,
        message: "Friend request sent.",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send friend request.";

    return jsonError(message, 500);
  }
}
