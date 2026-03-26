import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getFriendshipStateFromRecords,
  type ProfileFriendshipState,
} from "@/lib/profile-data";

type CreateFriendshipBody = {
  targetUserId?: string;
};

type UpdateFriendshipBody = {
  action?: "accept" | "reject" | "dismiss_accepted_notification";
  targetUserId?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getViewerUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: {
      id: true,
    },
  });
}

export async function GET(request: Request) {
  try {
    const viewer = await getViewerUser();

    if (!viewer) {
      return jsonError("Unauthorized.", 401);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const view = searchParams.get("view");

    if (query) {
      if (query.length < 2) {
        return NextResponse.json({ results: [] });
      }

      const users = await prisma.user.findMany({
        where: {
          id: {
            not: viewer.id,
          },
          OR: [
            {
              fullName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: [{ fullName: "asc" }, { email: "asc" }],
        take: 8,
        select: {
          email: true,
          fullName: true,
          id: true,
          profilePhotoUrl: true,
        },
      });

      const friendshipRecords =
        users.length === 0
          ? []
          : await prisma.friendship.findMany({
              where: {
                OR: users.flatMap((user) => [
                  {
                    requesterId: viewer.id,
                    addresseeId: user.id,
                  },
                  {
                    requesterId: user.id,
                    addresseeId: viewer.id,
                  },
                ]),
              },
              select: {
                addresseeId: true,
                requesterId: true,
                status: true,
              },
            });

      return NextResponse.json({
        results: users.map((user) => ({
          email: user.email,
          fullName: user.fullName,
          friendshipState: getFriendshipStateFromRecords(
            viewer.id,
            user.id,
            friendshipRecords.filter(
              (friendship) =>
                friendship.requesterId === user.id ||
                friendship.addresseeId === user.id,
            ),
          ),
          id: user.id,
          profilePhotoUrl: user.profilePhotoUrl,
        })),
      });
    }

    if (view === "notifications") {
      const [incomingRequests, acceptedRequests] = await Promise.all([
        prisma.friendship.findMany({
          where: {
            addresseeId: viewer.id,
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
            requester: {
              select: {
                email: true,
                fullName: true,
                id: true,
                profilePhotoUrl: true,
              },
            },
          },
        }),
        prisma.friendship.findMany({
          where: {
            requesterAcceptedNotificationSeenAt: null,
            requesterId: viewer.id,
            status: "ACCEPTED",
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            addressee: {
              select: {
                email: true,
                fullName: true,
                id: true,
                profilePhotoUrl: true,
              },
            },
            updatedAt: true,
          },
        }),
      ]);

      return NextResponse.json({
        acceptedRequests: acceptedRequests.map((friendship) => ({
          createdAt: friendship.updatedAt.toISOString(),
          user: friendship.addressee,
        })),
        incomingRequests: incomingRequests.map((friendship) => ({
          createdAt: friendship.createdAt.toISOString(),
          user: friendship.requester,
        })),
        unreadCount: incomingRequests.length + acceptedRequests.length,
      });
    }

    if (view === "friends") {
      const friendships = await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: viewer.id }, { addresseeId: viewer.id }],
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          addressee: {
            select: {
              email: true,
              fullName: true,
              id: true,
              profilePhotoUrl: true,
            },
          },
          addresseeId: true,
          requester: {
            select: {
              email: true,
              fullName: true,
              id: true,
              profilePhotoUrl: true,
            },
          },
          requesterId: true,
        },
      });

      return NextResponse.json({
        friends: friendships.map((friendship) =>
          friendship.requesterId === viewer.id
            ? friendship.addressee
            : friendship.requester,
        ),
      });
    }

    return jsonError("Unknown friendship query.", 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load friendships.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerUser();

    if (!viewer) {
      return jsonError("Unauthorized.", 401);
    }

    const body = (await request.json()) as CreateFriendshipBody;
    const targetUserId = body.targetUserId?.trim();

    if (!targetUserId) {
      return jsonError("A target user is required.", 422);
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
            requesterAcceptedNotificationSeenAt: null,
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
            requesterAcceptedNotificationSeenAt: null,
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
          requesterAcceptedNotificationSeenAt: null,
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

export async function PATCH(request: Request) {
  try {
    const viewer = await getViewerUser();

    if (!viewer) {
      return jsonError("Unauthorized.", 401);
    }

    const body = (await request.json()) as UpdateFriendshipBody;
    const action = body.action;
    const targetUserId = body.targetUserId?.trim();

    if (!action) {
      return jsonError("A friendship action is required.", 422);
    }

    if (!targetUserId) {
      return jsonError("A target user is required.", 422);
    }

    if (targetUserId === viewer.id) {
      return jsonError("You cannot update a friendship with yourself.", 422);
    }

    if (action === "accept") {
      const friendship = await prisma.friendship.findUnique({
        where: {
          requesterId_addresseeId: {
            addresseeId: viewer.id,
            requesterId: targetUserId,
          },
        },
      });

      if (!friendship || friendship.status !== "PENDING") {
        return jsonError("That friend request is no longer pending.", 404);
      }

      await prisma.friendship.update({
        where: {
          requesterId_addresseeId: {
            addresseeId: viewer.id,
            requesterId: targetUserId,
          },
        },
        data: {
          requesterAcceptedNotificationSeenAt: null,
          status: "ACCEPTED",
        },
      });

      return NextResponse.json({
        friendshipState: "accepted" as ProfileFriendshipState,
      });
    }

    if (action === "reject") {
      const friendship = await prisma.friendship.findUnique({
        where: {
          requesterId_addresseeId: {
            addresseeId: viewer.id,
            requesterId: targetUserId,
          },
        },
      });

      if (!friendship || friendship.status !== "PENDING") {
        return jsonError("That friend request is no longer pending.", 404);
      }

      await prisma.friendship.update({
        where: {
          requesterId_addresseeId: {
            addresseeId: viewer.id,
            requesterId: targetUserId,
          },
        },
        data: {
          requesterAcceptedNotificationSeenAt: null,
          status: "REJECTED",
        },
      });

      return NextResponse.json({
        friendshipState: "none" as ProfileFriendshipState,
      });
    }

    const friendship = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: {
          addresseeId: targetUserId,
          requesterId: viewer.id,
        },
      },
    });

    if (!friendship || friendship.status !== "ACCEPTED") {
      return jsonError("That acceptance notification could not be found.", 404);
    }

    await prisma.friendship.update({
      where: {
        requesterId_addresseeId: {
          addresseeId: targetUserId,
          requesterId: viewer.id,
        },
      },
      data: {
        requesterAcceptedNotificationSeenAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update friendship notification.";

    return jsonError(message, 500);
  }
}
