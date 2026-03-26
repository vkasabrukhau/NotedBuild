import type { FriendshipStatus } from "@prisma/client";

export type ProfileFriendshipState =
  | "self"
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted";

export type FriendshipStateRecord = {
  addresseeId: string;
  requesterId: string;
  status: FriendshipStatus;
};

export function getFriendshipStateFromRecords(
  viewerUserId: string,
  profileUserId: string,
  friendships: FriendshipStateRecord[],
): ProfileFriendshipState {
  if (viewerUserId === profileUserId) {
    return "self";
  }

  if (friendships.some((friendship) => friendship.status === "ACCEPTED")) {
    return "accepted";
  }

  const directFriendship = friendships.find(
    (friendship) =>
      friendship.requesterId === viewerUserId &&
      friendship.addresseeId === profileUserId,
  );

  if (directFriendship?.status === "PENDING") {
    return "pending_outgoing";
  }

  const reverseFriendship = friendships.find(
    (friendship) =>
      friendship.requesterId === profileUserId &&
      friendship.addresseeId === viewerUserId,
  );

  if (reverseFriendship?.status === "PENDING") {
    return "pending_incoming";
  }

  return "none";
}
