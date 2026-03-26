"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ProfileEditor from "@/components/profile/profile-editor";
import PixelatedSchoolLogo from "@/components/profile/pixelated-school-logo";
import type {
  ProfileFriendshipState,
  ProfileSchoolOption,
  ProfileViewData,
  ProfileViewerData,
} from "@/lib/profile-data";

type ProfileViewProps = {
  profile: ProfileViewData;
  schools?: ProfileSchoolOption[];
  viewer: ProfileViewerData;
};

type FriendshipPerson = {
  email: string;
  fullName: string;
  id: string;
  profilePhotoUrl: string | null;
};

type FriendshipSearchResult = FriendshipPerson & {
  friendshipState: ProfileFriendshipState;
};

type FriendshipNotification = {
  createdAt: string;
  user: FriendshipPerson;
};

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPreviewText(content: string, maxWords = 26) {
  return stripHtml(content)
    .split(" ")
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function formatAuthoredDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(fullName: string) {
  const tokens = fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "?";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

function getProfileHref(email: string) {
  return `/${encodeURIComponent(email)}`;
}

function InlineSchoolMark({ profile }: { profile: ProfileViewData }) {
  const schoolLabel = profile.schoolName ?? "School";
  const badgeText = getInitials(schoolLabel).slice(0, 2);

  return (
    <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden">
      {profile.schoolLogoUrl ? (
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:5px_5px] opacity-30" />
      ) : null}
      {profile.schoolLogoUrl ? (
        <PixelatedSchoolLogo
          src={profile.schoolLogoUrl}
          alt={schoolLabel}
          size={56}
          className="absolute inset-0 h-full w-full object-contain p-1"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[14px] border border-black/10 bg-white text-[18px] font-bold uppercase tracking-[-0.06em] text-black/70">
          {badgeText}
        </div>
      )}
    </div>
  );
}

function UserAvatar({
  fullName,
  profilePhotoUrl,
  size = 52,
}: {
  fullName: string;
  profilePhotoUrl: string | null;
  size?: number;
}) {
  const avatarSizeClass = size >= 56 ? "rounded-[18px]" : "rounded-[16px]";

  if (profilePhotoUrl) {
    return (
      <img
        src={profilePhotoUrl}
        alt={fullName}
        width={size}
        height={size}
        className={`${avatarSizeClass} border border-black/8 object-cover shadow-[0_10px_24px_rgba(20,18,17,0.08)]`}
        style={{ height: size, width: size }}
      />
    );
  }

  return (
    <div
      className={`flex ${avatarSizeClass} items-center justify-center border border-black/8 bg-black text-white shadow-[0_10px_24px_rgba(20,18,17,0.08)]`}
      style={{ height: size, width: size }}
    >
      <span className="text-sm font-bold uppercase tracking-[0.08em]">
        {getInitials(fullName)}
      </span>
    </div>
  );
}

function PaperNotificationButton({
  isOpen,
  onToggle,
  unreadCount,
}: {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative h-[52px] w-[52px] shrink-0 rounded-[16px] border border-black/12 bg-[#fcfbf7] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"
      aria-label="Notifications"
      aria-pressed={isOpen}
    >
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-black px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
          {Math.min(unreadCount, 9)}
        </span>
      ) : null}
      <div className="absolute inset-[10px] rounded-[8px] border border-black/14 bg-white">
        <div className="absolute right-0 top-0 h-3 w-3 border-b border-l border-black/14 bg-[#f0ede6]" />
        <div className="absolute left-[7px] right-[7px] top-[9px] h-[2px] bg-black/65" />
        <div className="absolute left-[7px] right-[11px] top-[15px] h-[2px] bg-black/45" />
        <div className="absolute left-[7px] right-[9px] top-[21px] h-[2px] bg-black/45" />
      </div>
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center text-black/70 transition hover:opacity-70 hover:text-black"
      aria-label="Edit profile"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    </button>
  );
}

function getFriendButtonLabel(friendshipState: ProfileFriendshipState) {
  if (friendshipState === "accepted") {
    return "Friends";
  }

  if (friendshipState === "pending_outgoing") {
    return "Request sent";
  }

  if (friendshipState === "pending_incoming") {
    return "Accept request";
  }

  return "Add friend";
}

function ProfileNoteCard({
  content,
  createdAt,
  href,
  name,
}: {
  content: string;
  createdAt: string;
  href?: string | null;
  name: string;
}) {
  const cardClassName =
    "group flex aspect-square flex-col justify-between rounded-[28px] border border-black/10 bg-[var(--app-card)] p-5 text-left text-black transition duration-200";
  const sharedChildren = (
    <>
      <div>
        <div className="text-[24px] font-bold leading-tight">{name}</div>
        <div className="mt-4 text-[18px] leading-[1.45] text-black/70">
          {getPreviewText(content, 20) || "Empty note"}
        </div>
      </div>
      <div className="text-[16px] font-medium leading-none text-black/55">
        {formatAuthoredDate(createdAt)}
      </div>
    </>
  );

  if (!href) {
    return <div className={cardClassName}>{sharedChildren}</div>;
  }

  return (
    <Link
      href={href}
      className={`${cardClassName} hover:-translate-y-1 hover:border-black/18 hover:shadow-[0_14px_36px_rgba(0,0,0,0.08)]`}
    >
      {sharedChildren}
    </Link>
  );
}

async function sendFriendRequest(targetUserId: string) {
  const response = await fetch("/api/friendships", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targetUserId }),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    friendshipState?: ProfileFriendshipState;
  } | null;

  if (!response.ok || !data?.friendshipState) {
    throw new Error(data?.error ?? "Failed to update friendship.");
  }

  return data.friendshipState;
}

async function searchFriendships(query: string) {
  const response = await fetch(
    `/api/friendships?query=${encodeURIComponent(query)}`,
  );
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    results?: FriendshipSearchResult[];
  } | null;

  if (!response.ok || !data?.results) {
    throw new Error(data?.error ?? "Failed to search users.");
  }

  return data.results;
}

async function fetchFriendNotifications() {
  const response = await fetch("/api/friendships?view=notifications");
  const data = (await response.json().catch(() => null)) as {
    acceptedRequests?: FriendshipNotification[];
    error?: string;
    incomingRequests?: FriendshipNotification[];
    unreadCount?: number;
  } | null;

  if (
    !response.ok ||
    !data?.incomingRequests ||
    !data.acceptedRequests ||
    typeof data.unreadCount !== "number"
  ) {
    throw new Error(data?.error ?? "Failed to load notifications.");
  }

  return data;
}

async function fetchFriendsDirectory() {
  const response = await fetch("/api/friendships?view=friends");
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    friends?: FriendshipPerson[];
  } | null;

  if (!response.ok || !data?.friends) {
    throw new Error(data?.error ?? "Failed to load friends.");
  }

  return data.friends;
}

async function updateFriendshipAction(
  action: "accept" | "reject" | "dismiss_accepted_notification",
  targetUserId: string,
) {
  const response = await fetch("/api/friendships", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      targetUserId,
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    friendshipState?: ProfileFriendshipState;
    ok?: boolean;
  } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to update friendship.");
  }

  return data;
}

export default function ProfileView({
  profile,
  schools = [],
  viewer,
}: ProfileViewProps) {
  const router = useRouter();
  const friendsSectionRef = useRef<HTMLElement | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileNotes, setProfileNotes] = useState(profile.notes);
  const [isLoadingProfileNotes, setIsLoadingProfileNotes] = useState(false);
  const [friendshipState, setFriendshipState] = useState(
    viewer.friendshipState,
  );
  const [friendError, setFriendError] = useState<string | null>(null);
  const [isFriendActionPending, setIsFriendActionPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendshipSearchResult[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<
    FriendshipNotification[]
  >([]);
  const [acceptedRequests, setAcceptedRequests] = useState<
    FriendshipNotification[]
  >([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [friends, setFriends] = useState<FriendshipPerson[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendDirectoryError, setFriendDirectoryError] = useState<
    string | null
  >(null);
  const [pendingSearchTargetId, setPendingSearchTargetId] = useState<
    string | null
  >(null);
  const [pendingNotificationActionKey, setPendingNotificationActionKey] =
    useState<string | null>(null);

  useEffect(() => {
    setProfileNotes(profile.notes);
  }, [profile.notes]);

  useEffect(() => {
    setFriendshipState(viewer.friendshipState);
  }, [viewer.friendshipState]);

  useEffect(() => {
    if (!viewer.isOwnProfile) {
      return;
    }

    let cancelled = false;

    const loadProfileNotes = async () => {
      setIsLoadingProfileNotes(true);

      try {
        const response = await fetch("/api/notes");
        const data = (await response.json().catch(() => null)) as {
          notes?: Array<{
            content: string;
            createdAt: string;
            id: string;
            name: string;
            ownerEmail: string;
          }>;
        } | null;

        if (!response.ok || !data?.notes || cancelled) {
          return;
        }

        setProfileNotes(
          data.notes.map((note) => ({
            content: note.content,
            createdAt: note.createdAt,
            id: note.id,
            name: note.name,
            ownerEmail: note.ownerEmail,
          })),
        );
      } catch (error) {
        console.error("failed to load profile notes", error);
      } finally {
        if (!cancelled) {
          setIsLoadingProfileNotes(false);
        }
      }
    };

    void loadProfileNotes();

    return () => {
      cancelled = true;
    };
  }, [viewer.isOwnProfile]);

  useEffect(() => {
    if (!viewer.isOwnProfile) {
      return;
    }

    let cancelled = false;

    const loadFriendData = async () => {
      setIsLoadingNotifications(true);
      setIsLoadingFriends(true);

      try {
        const [notificationsData, friendsData] = await Promise.all([
          fetchFriendNotifications(),
          fetchFriendsDirectory(),
        ]);

        if (cancelled) {
          return;
        }

        setIncomingRequests(notificationsData.incomingRequests ?? []);
        setAcceptedRequests(notificationsData.acceptedRequests ?? []);
        setUnreadNotificationCount(notificationsData.unreadCount ?? 0);
        setNotificationError(null);
        setFriends(friendsData);
        setFriendDirectoryError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load friendship data.";

        setNotificationError(message);
        setFriendDirectoryError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingNotifications(false);
          setIsLoadingFriends(false);
        }
      }
    };

    void loadFriendData();

    return () => {
      cancelled = true;
    };
  }, [viewer.isOwnProfile]);

  useEffect(() => {
    if (!viewer.isOwnProfile) {
      return;
    }

    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchError("Type at least 2 characters to search.");
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchFriendships(trimmedQuery);

        if (cancelled) {
          return;
        }

        setSearchResults(results);
        setSearchError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSearchError(
          error instanceof Error ? error.message : "Failed to search users.",
        );
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, viewer.isOwnProfile]);

  async function reloadFriendNotifications() {
    if (!viewer.isOwnProfile) {
      return;
    }

    try {
      const data = await fetchFriendNotifications();
      setIncomingRequests(data.incomingRequests ?? []);
      setAcceptedRequests(data.acceptedRequests ?? []);
      setUnreadNotificationCount(data.unreadCount ?? 0);
      setNotificationError(null);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Failed to load notifications.",
      );
    }
  }

  async function reloadFriendsDirectory() {
    if (!viewer.isOwnProfile) {
      return;
    }

    try {
      const nextFriends = await fetchFriendsDirectory();
      setFriends(nextFriends);
      setFriendDirectoryError(null);
    } catch (error) {
      setFriendDirectoryError(
        error instanceof Error ? error.message : "Failed to load friends.",
      );
    }
  }

  async function reloadSearchResults() {
    const trimmedQuery = searchQuery.trim();

    if (!viewer.isOwnProfile || trimmedQuery.length < 2) {
      return;
    }

    try {
      const results = await searchFriendships(trimmedQuery);
      setSearchResults(results);
      setSearchError(null);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Failed to search users.",
      );
    }
  }

  async function handleFriendshipAction() {
    if (
      friendshipState === "accepted" ||
      friendshipState === "pending_outgoing"
    ) {
      return;
    }

    setIsFriendActionPending(true);
    setFriendError(null);

    try {
      const nextState = await sendFriendRequest(profile.id);
      setFriendshipState(nextState);
      router.refresh();
    } catch (error) {
      setFriendError(
        error instanceof Error ? error.message : "Failed to update friendship.",
      );
    } finally {
      setIsFriendActionPending(false);
    }
  }

  async function handleSearchFriendRequest(targetUserId: string) {
    setPendingSearchTargetId(targetUserId);
    setFriendError(null);

    try {
      const nextState = await sendFriendRequest(targetUserId);

      setSearchResults((currentResults) =>
        currentResults.map((result) =>
          result.id === targetUserId
            ? {
                ...result,
                friendshipState: nextState,
              }
            : result,
        ),
      );

      await Promise.all([
        reloadFriendNotifications(),
        reloadFriendsDirectory(),
        reloadSearchResults(),
      ]);
      router.refresh();
    } catch (error) {
      setFriendError(
        error instanceof Error ? error.message : "Failed to update friendship.",
      );
    } finally {
      setPendingSearchTargetId(null);
    }
  }

  async function handleNotificationAction(
    action: "accept" | "reject" | "dismiss_accepted_notification",
    targetUserId: string,
  ) {
    const actionKey = `${action}:${targetUserId}`;
    setPendingNotificationActionKey(actionKey);
    setFriendError(null);

    try {
      await updateFriendshipAction(action, targetUserId);
      await Promise.all([
        reloadFriendNotifications(),
        reloadFriendsDirectory(),
        reloadSearchResults(),
      ]);

      if (action !== "dismiss_accepted_notification") {
        router.refresh();
      }
    } catch (error) {
      setFriendError(
        error instanceof Error ? error.message : "Failed to update friendship.",
      );
    } finally {
      setPendingNotificationActionKey(null);
    }
  }

  const canSeeNotes = viewer.isOwnProfile || friendshipState === "accepted";
  const notesSectionTitle = viewer.isOwnProfile
    ? "Recent Notes"
    : `${profile.fullName.split(" ")[0]}'s Notes`;

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.05em] text-black">
            Profile
          </h1>
        </div>

        <div className="flex items-start gap-3">
          {viewer.isOwnProfile ? (
            <div className="relative">
              <PaperNotificationButton
                isOpen={isNotificationsOpen}
                onToggle={() => setIsNotificationsOpen((current) => !current)}
                unreadCount={unreadNotificationCount}
              />
              {isNotificationsOpen ? (
                <div className="absolute right-0 top-[64px] z-20 w-[340px] rounded-[22px] border border-black/10 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                      Notifications
                    </div>
                    <div className="text-xs text-black/45">
                      {unreadNotificationCount} open
                    </div>
                  </div>

                  {isLoadingNotifications ? (
                    <p className="mt-4 text-sm leading-6 text-black/62">
                      Loading friendship activity...
                    </p>
                  ) : notificationError ? (
                    <p className="mt-4 text-sm leading-6 text-[#a11d1d]">
                      {notificationError}
                    </p>
                  ) : incomingRequests.length === 0 &&
                    acceptedRequests.length === 0 ? (
                    <p className="mt-4 text-sm leading-6 text-black/62">
                      No friendship activity right now.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-5">
                      {incomingRequests.length > 0 ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                            Incoming Requests
                          </div>
                          <div className="mt-3 space-y-3">
                            {incomingRequests.map((notification) => {
                              const acceptKey = `accept:${notification.user.id}`;
                              const rejectKey = `reject:${notification.user.id}`;

                              return (
                                <div
                                  key={`incoming-${notification.user.id}`}
                                  className="rounded-[20px] border border-black/8 bg-[var(--app-card-alt)] p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <UserAvatar
                                      fullName={notification.user.fullName}
                                      profilePhotoUrl={
                                        notification.user.profilePhotoUrl
                                      }
                                      size={44}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm leading-5 text-black/75">
                                        <span className="font-semibold text-black">
                                          {notification.user.fullName}
                                        </span>{" "}
                                        sent you a friend request.
                                      </p>
                                      <p className="mt-1 text-xs text-black/45">
                                        {formatAuthoredDate(
                                          notification.createdAt,
                                        )}
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleNotificationAction(
                                              "accept",
                                              notification.user.id,
                                            )
                                          }
                                          disabled={
                                            pendingNotificationActionKey ===
                                              acceptKey ||
                                            pendingNotificationActionKey ===
                                              rejectKey
                                          }
                                          className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleNotificationAction(
                                              "reject",
                                              notification.user.id,
                                            )
                                          }
                                          disabled={
                                            pendingNotificationActionKey ===
                                              acceptKey ||
                                            pendingNotificationActionKey ===
                                              rejectKey
                                          }
                                          className="rounded-full border border-black/12 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          Reject
                                        </button>
                                        <Link
                                          href={getProfileHref(
                                            notification.user.email,
                                          )}
                                          className="rounded-full border border-black/12 px-3 py-2 text-xs font-semibold text-black/70 transition hover:border-black/20 hover:text-black"
                                        >
                                          View profile
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {acceptedRequests.length > 0 ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                            Accepted
                          </div>
                          <div className="mt-3 space-y-3">
                            {acceptedRequests.map((notification) => {
                              const dismissKey = `dismiss_accepted_notification:${notification.user.id}`;

                              return (
                                <div
                                  key={`accepted-${notification.user.id}`}
                                  className="rounded-[20px] border border-black/8 bg-[var(--app-card-alt)] p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <UserAvatar
                                      fullName={notification.user.fullName}
                                      profilePhotoUrl={
                                        notification.user.profilePhotoUrl
                                      }
                                      size={44}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm leading-5 text-black/75">
                                        <span className="font-semibold text-black">
                                          {notification.user.fullName}
                                        </span>{" "}
                                        accepted your friend request.
                                      </p>
                                      <p className="mt-1 text-xs text-black/45">
                                        {formatAuthoredDate(
                                          notification.createdAt,
                                        )}
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <Link
                                          href={getProfileHref(
                                            notification.user.email,
                                          )}
                                          className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                                        >
                                          Open profile
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleNotificationAction(
                                              "dismiss_accepted_notification",
                                              notification.user.id,
                                            )
                                          }
                                          disabled={
                                            pendingNotificationActionKey ===
                                            dismissKey
                                          }
                                          className="rounded-full border border-black/12 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleFriendshipAction()}
              disabled={
                isFriendActionPending ||
                friendshipState === "accepted" ||
                friendshipState === "pending_outgoing"
              }
              className="rounded-full border border-black/14 bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {getFriendButtonLabel(friendshipState)}
            </button>
          )}
        </div>
      </div>

      <section className="mt-10">
        <div className="mt-4">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-5">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt={profile.fullName}
                  width={112}
                  height={112}
                  className="h-[112px] w-[112px] rounded-[30px] border-[5px] border-white object-cover shadow-[0_12px_30px_rgba(20,18,17,0.12)]"
                />
              ) : (
                <div className="flex h-[112px] w-[112px] items-center justify-center rounded-[30px] border-[5px] border-white bg-black text-[34px] font-bold text-white shadow-[0_12px_30px_rgba(20,18,17,0.12)]">
                  {getInitials(profile.fullName)}
                </div>
              )}

              <div className="pb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[36px] font-bold leading-none tracking-[-0.04em] text-black">
                    {profile.fullName}
                  </h2>
                  <InlineSchoolMark profile={profile} />
                  {viewer.isOwnProfile ? (
                    <EditButton onClick={() => setIsEditorOpen(true)} />
                  ) : null}
                </div>
                <p className="mt-3 text-[12px] uppercase tracking-[0.22em] text-black/48">
                  Joined {formatJoinedDate(profile.joinedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <div className="grid max-w-4xl gap-x-8 gap-y-6 pl-8 md:grid-cols-3 md:pl-12">
            <div className="border-l border-black/90 pl-8">
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                Notes
              </div>
              <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                {profile.noteCount}
              </div>
            </div>

            <div className="border-l border-black/90 pl-8">
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                Folders
              </div>
              <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                {profile.folderCount}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                friendsSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              disabled={!viewer.isOwnProfile}
              className="border-l border-black/90 pl-8 text-left disabled:cursor-default"
            >
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                Friends
              </div>
              <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                {profile.friendCount}
              </div>
            </button>
          </div>
        </div>

        {friendError ? (
          <p className="mt-6 text-sm text-[#a11d1d]">{friendError}</p>
        ) : null}

        {viewer.isOwnProfile ? (
          <>
            <section className="mt-10 rounded-[30px] border border-black/10 bg-[var(--app-card-alt)] p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-[28px] font-bold leading-none tracking-[-0.04em] text-black">
                    Find Friends
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/62">
                    Search registered users and send friendship requests from
                    here.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-[20px] border border-black/12 bg-white px-5 py-4 text-base text-black outline-none transition focus:border-black/25"
                />
              </div>

              {searchError ? (
                <p className="mt-4 text-sm text-black/55">{searchError}</p>
              ) : null}

              {isSearching ? (
                <div className="mt-5 rounded-[22px] border border-black/8 bg-white px-5 py-4 text-sm text-black/62">
                  Searching users...
                </div>
              ) : null}

              {!isSearching && searchQuery.trim().length >= 2 ? (
                searchResults.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {searchResults.map((result) => {
                      const isSearchActionPending =
                        pendingSearchTargetId === result.id;

                      return (
                        <div
                          key={result.id}
                          className="flex flex-col gap-4 rounded-[22px] border border-black/8 bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <UserAvatar
                              fullName={result.fullName}
                              profilePhotoUrl={result.profilePhotoUrl}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-base font-semibold text-black">
                                {result.fullName}
                              </div>
                              <div className="truncate text-sm text-black/55">
                                {result.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={getProfileHref(result.email)}
                              className="rounded-full border border-black/12 px-4 py-2 text-sm font-medium text-black/75 transition hover:border-black/20 hover:text-black"
                            >
                              View profile
                            </Link>

                            {result.friendshipState === "accepted" ? (
                              <span className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
                                Friends
                              </span>
                            ) : result.friendshipState ===
                              "pending_outgoing" ? (
                              <span className="rounded-full border border-black/12 bg-[#f5f3ee] px-4 py-2 text-sm font-medium text-black/55">
                                Request sent
                              </span>
                            ) : result.friendshipState ===
                              "pending_incoming" ? (
                              <button
                                type="button"
                                onClick={() => setIsNotificationsOpen(true)}
                                className="rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-medium text-black transition hover:border-black/20"
                              >
                                Respond in notifications
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleSearchFriendRequest(result.id)
                                }
                                disabled={isSearchActionPending}
                                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                Add friend
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-black/8 bg-white px-5 py-4 text-sm text-black/62">
                    No matching users found.
                  </div>
                )
              ) : null}
            </section>

            <section
              ref={friendsSectionRef}
              className="mt-8 rounded-[30px] border border-black/10 bg-white p-6"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-[28px] font-bold leading-none tracking-[-0.04em] text-black">
                    Friends
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/62">
                    Open a friend&apos;s profile to see their public profile
                    details and shared note previews.
                  </p>
                </div>
              </div>

              {friendDirectoryError ? (
                <p className="mt-4 text-sm text-[#a11d1d]">
                  {friendDirectoryError}
                </p>
              ) : null}

              {isLoadingFriends ? (
                <div className="mt-5 rounded-[22px] border border-black/8 bg-[var(--app-card-alt)] px-5 py-4 text-sm text-black/62">
                  Loading friends...
                </div>
              ) : friends.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {friends.map((friend) => (
                    <Link
                      key={friend.id}
                      href={getProfileHref(friend.email)}
                      className="rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] p-4 transition hover:-translate-y-1 hover:border-black/18 hover:shadow-[0_14px_36px_rgba(0,0,0,0.08)]"
                    >
                      <div className="flex items-center gap-4">
                        <UserAvatar
                          fullName={friend.fullName}
                          profilePhotoUrl={friend.profilePhotoUrl}
                          size={56}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-black">
                            {friend.fullName}
                          </div>
                          <div className="truncate text-sm text-black/55">
                            {friend.email}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-black/8 bg-[var(--app-card-alt)] px-5 py-4 text-sm text-black/62">
                  No accepted friends yet.
                </div>
              )}
            </section>
          </>
        ) : null}

        <div className="mt-8 border-t border-dashed border-black/20 pt-12">
          {canSeeNotes ? (
            <div>
              <div className="flex items-end justify-between gap-4">
                <h3 className="text-[30px] font-bold leading-none tracking-[-0.04em] text-black">
                  {notesSectionTitle}
                </h3>

                {viewer.isOwnProfile && profileNotes.length > 0 ? (
                  <Link
                    href="/"
                    className="text-[14px] font-medium uppercase tracking-[0.16em] text-black/55 transition hover:text-black"
                  >
                    Open workspace
                  </Link>
                ) : null}
              </div>

              {isLoadingProfileNotes && profileNotes.length === 0 ? (
                <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                  <div className="text-[22px] font-medium text-black/52">
                    Loading notes...
                  </div>
                </div>
              ) : profileNotes.length > 0 ? (
                <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {profileNotes.map((note) => (
                    <ProfileNoteCard
                      key={note.id}
                      content={note.content}
                      createdAt={note.createdAt}
                      href={
                        viewer.isOwnProfile
                          ? `/${encodeURIComponent(note.ownerEmail)}/notes/${encodeURIComponent(note.name)}`
                          : null
                      }
                      name={note.name}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                  <div className="text-[22px] font-medium text-black/52">
                    No notes yet.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
              <div className="text-[22px] font-medium text-black/52">
                Become friends to view recent notes.
              </div>
            </div>
          )}
        </div>
      </section>

      <ProfileEditor
        onClose={() => setIsEditorOpen(false)}
        onSaved={() => router.refresh()}
        open={viewer.isOwnProfile && isEditorOpen}
        profile={profile}
        schools={schools}
      />
    </div>
  );
}
