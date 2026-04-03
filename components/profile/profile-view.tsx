"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { swrFetcher } from "@/lib/swr-fetcher";
import ProfileEditor from "@/components/profile/profile-editor";
import PixelatedSchoolLogo from "@/components/profile/pixelated-school-logo";
import type {
  ProfileFriendshipState,
  ProfileSchoolOption,
  ProfileViewData,
  ProfileViewerData,
} from "@/lib/profile-data";
import { stripHtml, getPreviewText, formatAuthoredDate } from "@/lib/text-utils";
import {
  TAMAGOTCHI_SPECIES,
  type ProgressKey,
  type UserProgressData,
} from "@/lib/tamagotchi-config";

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

type ProfileFolderSummary = {
  id: string;
  name: string;
  noteCount: number;
  ownerEmail: string;
  updatedAt: string;
};

type ProfileContentSection = "notes" | "friends" | "folders";

const DISMISSED_ACCEPTED_NOTIFICATION_STORAGE_KEY =
  "noted-dismissed-accepted-friend-notifications";


function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const PROGRESS_KEY_LABELS: Record<ProgressKey, string> = {
  hasSavedFirstNote: "Save your first note",
  hasSavedFirstFolder: "Save your first folder",
  hasAddedFirstFriend: "Add your first friend",
  hasAddedFirstCommunity: "Join a community",
  hasAddedAnotherSchoolCommunity: "Explore another school",
  hasMadeFirstStyleChange: "Change your theme",
  hasMadeFirstFontChange: "Change your font",
};

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

function getFolderHref(ownerEmail: string, folderName: string) {
  return `/${encodeURIComponent(ownerEmail)}/folders/${encodeURIComponent(folderName)}`;
}

function getNoteHref(ownerEmail: string, noteName: string) {
  return `/${encodeURIComponent(ownerEmail)}/notes/${encodeURIComponent(noteName)}`;
}

function getAcceptedNotificationKey(notification: FriendshipNotification) {
  return `${notification.user.id}:${notification.createdAt}`;
}

function getDismissedAcceptedNotificationKeys() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const rawValue = window.localStorage.getItem(
      DISMISSED_ACCEPTED_NOTIFICATION_STORAGE_KEY,
    );

    if (!rawValue) {
      return new Set<string>();
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return new Set<string>();
  }
}

function persistDismissedAcceptedNotificationKeys(keys: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DISMISSED_ACCEPTED_NOTIFICATION_STORAGE_KEY,
    JSON.stringify(Array.from(keys)),
  );
}

function filterAcceptedNotifications(notifications: FriendshipNotification[]) {
  const dismissedKeys = getDismissedAcceptedNotificationKeys();

  return notifications.filter(
    (notification) =>
      !dismissedKeys.has(getAcceptedNotificationKey(notification)),
  );
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

function FindFriendsButton({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-4 py-3 text-sm font-medium transition ${
        isOpen
          ? "border-black bg-black text-white"
          : "border-black/14 bg-white text-black hover:border-black/24"
      }`}
    >
      Find friends
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
  isFocused = false,
}: {
  content: string;
  createdAt: string;
  href?: string | null;
  name: string;
  isFocused?: boolean;
}) {
  const activeClass = isFocused
    ? "folder-grid-card--active ring-2 ring-black ring-offset-2"
    : "";
  const cardClassName = `folder-grid-card group flex h-[200px] flex-col justify-between overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)] p-5 text-left text-black ${activeClass}`;
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
    <Link href={href} className={cardClassName}>
      {sharedChildren}
    </Link>
  );
}

function ProfileFolderCard({
  folder,
  isFocused = false,
}: {
  folder: ProfileFolderSummary;
  isFocused?: boolean;
}) {
  const activeClass = isFocused
    ? "folder-grid-card--active ring-2 ring-black ring-offset-2"
    : "";
  return (
    <Link
      href={getFolderHref(folder.ownerEmail, folder.name)}
      className={`folder-grid-card group flex h-[200px] flex-col justify-between overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)] p-5 text-left text-black ${activeClass}`}
    >
      <div>
        <div className="text-[24px] font-bold leading-tight">{folder.name}</div>
        <div className="mt-4 text-[18px] leading-[1.45] text-black/70">
          {folder.noteCount} {folder.noteCount === 1 ? "note" : "notes"}
        </div>
      </div>
      <div className="text-[16px] font-medium leading-none text-black/55">
        {formatAuthoredDate(folder.updatedAt)}
      </div>
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
  } | null;

  if (!response.ok || !data?.incomingRequests || !data.acceptedRequests) {
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

async function fetchProfileFolders() {
  const response = await fetch("/api/folders?view=folders");
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    folders?: ProfileFolderSummary[];
  } | null;

  if (!response.ok || !data?.folders) {
    throw new Error(data?.error ?? "Failed to load folders.");
  }

  return data.folders;
}

async function updateFriendshipAction(
  action: "accept" | "reject",
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
  } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to update friendship.");
  }

  return data;
}

const PROFILE_SECTIONS: ProfileContentSection[] = [
  "notes",
  "folders",
  "friends",
];

export default function ProfileView({
  profile,
  schools = [],
  viewer,
}: ProfileViewProps) {
  const router = useRouter();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [keyboardFocusIndex, setKeyboardFocusIndex] = useState(0);
  const [focusLevel, setFocusLevel] = useState<"tabs" | "items">("tabs");
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [sectionAnimKey, setSectionAnimKey] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFriendFinderOpen, setIsFriendFinderOpen] = useState(false);
  const [friendshipState, setFriendshipState] = useState(
    viewer.friendshipState,
  );
  const [friendError, setFriendError] = useState<string | null>(null);
  const [isFriendActionPending, setIsFriendActionPending] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ProfileContentSection>("notes");
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
  const [friends, setFriends] = useState<FriendshipPerson[]>([]);
  const [folders, setFolders] = useState<ProfileFolderSummary[]>([]);
  const [pendingSearchTargetId, setPendingSearchTargetId] = useState<
    string | null
  >(null);
  const [pendingNotificationActionKey, setPendingNotificationActionKey] =
    useState<string | null>(null);

  // ── SWR data fetching ────────────────────────────────────────────────────
  const swrKey = viewer.isOwnProfile;
  const { data: notesData, isLoading: isLoadingProfileNotes } = useSWR<{ notes: typeof profile.notes }>(
    swrKey ? "/api/notes" : null,
    swrFetcher,
  );
  const { data: friendsData, isLoading: isLoadingFriends, error: friendsError } = useSWR<{ friends: FriendshipPerson[] }>(
    swrKey ? "/api/friendships?view=friends" : null,
    swrFetcher,
  );
  const { data: notificationsData, isLoading: isLoadingNotifications, error: notificationsError } = useSWR<{
    incomingRequests: FriendshipNotification[];
    acceptedRequests: FriendshipNotification[];
  }>(
    swrKey ? "/api/friendships?view=notifications" : null,
    swrFetcher,
  );
  const { data: foldersData, isLoading: isLoadingFolders, error: foldersError } = useSWR<{ folders: ProfileFolderSummary[] }>(
    swrKey ? "/api/folders?view=folders" : null,
    swrFetcher,
  );
  const { data: progressData } = useSWR<{ progress: UserProgressData }>(
    swrKey ? "/api/progress" : null,
    swrFetcher,
  );

  const profileNotes = notesData?.notes ?? profile.notes;
  const progress = progressData?.progress ?? null;
  const notificationError = notificationsError instanceof Error ? notificationsError.message : notificationsError ? "Failed to load notifications." : null;
  const friendDirectoryError = friendsError instanceof Error ? friendsError.message : friendsError ? "Failed to load friends." : null;
  const folderError = foldersError instanceof Error ? foldersError.message : foldersError ? "Failed to load folders." : null;

  const changeSection = useCallback(
    (section: ProfileContentSection, tabIdx: number) => {
      setActiveSection(section);
      setKeyboardFocusIndex(tabIdx);
      setSectionAnimKey((k) => k + 1);
      setFocusedItemIndex(0);
      setFocusLevel("tabs");
    },
    [],
  );

  useEffect(() => {
    setFriendshipState(viewer.friendshipState);
  }, [viewer.friendshipState]);

  useEffect(() => {
    if (!viewer.isOwnProfile) {
      setActiveSection("notes");
    }
  }, [viewer.isOwnProfile]);


  useEffect(() => {
    if (!viewer.isOwnProfile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Escape: exit items → tabs; at tabs level let the shell handle it (navigate home)
      if (e.key === "Escape") {
        if (focusLevel === "items") {
          e.stopImmediatePropagation();
          e.preventDefault();
          setFocusLevel("tabs");
        }
        return;
      }

      const currentItems =
        activeSection === "notes"
          ? profileNotes
          : activeSection === "folders"
            ? folders
            : friends;
      const itemCount = currentItems.length;

      if (focusLevel === "tabs") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setKeyboardFocusIndex((i) => (i + 1) % 3);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setKeyboardFocusIndex((i) => (i + 2) % 3);
        } else if (e.key === "Enter") {
          e.preventDefault();
          changeSection(
            PROFILE_SECTIONS[keyboardFocusIndex],
            keyboardFocusIndex,
          );
        } else if (e.key === "ArrowDown" && itemCount > 0) {
          e.preventDefault();
          setFocusLevel("items");
          setFocusedItemIndex(0);
        }
      } else {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setFocusedItemIndex((i) => (i + 1) % Math.max(1, itemCount));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setFocusedItemIndex(
            (i) => (i + Math.max(1, itemCount) - 1) % Math.max(1, itemCount),
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusLevel("tabs");
        } else if (e.key === "Enter" && itemCount > 0) {
          e.preventDefault();
          if (activeSection === "notes") {
            const note = profileNotes[focusedItemIndex];
            if (note) router.push(getNoteHref(note.ownerEmail, note.name));
          } else if (activeSection === "folders") {
            const folder = folders[focusedItemIndex];
            if (folder)
              router.push(getFolderHref(folder.ownerEmail, folder.name));
          } else if (activeSection === "friends") {
            const friend = friends[focusedItemIndex];
            if (friend) router.push(getProfileHref(friend.email));
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    viewer.isOwnProfile,
    keyboardFocusIndex,
    focusLevel,
    focusedItemIndex,
    activeSection,
    profileNotes,
    folders,
    friends,
    router,
    changeSection,
  ]);


  // Seed local friends state from SWR
  useEffect(() => {
    if (friendsData?.friends) setFriends(friendsData.friends);
  }, [friendsData]);

  // Seed local folders state from SWR
  useEffect(() => {
    if (foldersData?.folders) setFolders(foldersData.folders);
  }, [foldersData]);

  // Seed notifications state from SWR (keep local so dismiss works without re-fetch)
  useEffect(() => {
    if (!notificationsData) return;
    const filtered = filterAcceptedNotifications(notificationsData.acceptedRequests ?? []);
    setIncomingRequests(notificationsData.incomingRequests ?? []);
    setAcceptedRequests(filtered);
    setUnreadNotificationCount((notificationsData.incomingRequests?.length ?? 0) + filtered.length);
  }, [notificationsData]);

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
    if (!viewer.isOwnProfile) return;
    await swrMutate("/api/friendships?view=notifications");
  }

  async function reloadFriendsDirectory() {
    if (!viewer.isOwnProfile) return;
    await swrMutate("/api/friendships?view=friends");
  }

  async function reloadFolders() {
    if (!viewer.isOwnProfile) return;
    await swrMutate("/api/folders?view=folders");
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
    action: "accept" | "reject",
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

      if (action === "accept") {
        setActiveSection("friends");
      }

      router.refresh();
    } catch (error) {
      setFriendError(
        error instanceof Error ? error.message : "Failed to update friendship.",
      );
    } finally {
      setPendingNotificationActionKey(null);
    }
  }

  function handleDismissAcceptedNotification(
    notification: FriendshipNotification,
  ) {
    const dismissedKeys = getDismissedAcceptedNotificationKeys();
    dismissedKeys.add(getAcceptedNotificationKey(notification));
    persistDismissedAcceptedNotificationKeys(dismissedKeys);

    setAcceptedRequests((currentNotifications) => {
      const nextNotifications = currentNotifications.filter(
        (currentNotification) =>
          getAcceptedNotificationKey(currentNotification) !==
          getAcceptedNotificationKey(notification),
      );

      setUnreadNotificationCount(
        incomingRequests.length + nextNotifications.length,
      );

      return nextNotifications;
    });
  }

  const canSeeNotes = viewer.isOwnProfile || friendshipState === "accepted";
  const notesSectionTitle = viewer.isOwnProfile
    ? "Notes"
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
            <>
              <div className="relative">
                <FindFriendsButton
                  isOpen={isFriendFinderOpen}
                  onToggle={() => setIsFriendFinderOpen((current) => !current)}
                />
                {isFriendFinderOpen ? (
                  <div className="absolute right-0 top-[64px] z-20 w-[380px] rounded-[22px] border border-black/10 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                      Find Friends
                    </div>
                    <div className="mt-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by name or email"
                        className="w-full rounded-[18px] border border-black/12 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black/25"
                      />
                    </div>

                    {searchError ? (
                      <p className="mt-3 text-sm text-black/55">
                        {searchError}
                      </p>
                    ) : null}

                    {isSearching ? (
                      <div className="mt-4 rounded-[18px] border border-black/8 bg-[var(--app-card-alt)] px-4 py-3 text-sm text-black/62">
                        Searching users...
                      </div>
                    ) : null}

                    {!isSearching && searchQuery.trim().length >= 2 ? (
                      searchResults.length > 0 ? (
                        <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                          {searchResults.map((result) => {
                            const isSearchActionPending =
                              pendingSearchTargetId === result.id;

                            return (
                              <div
                                key={result.id}
                                className="rounded-[20px] border border-black/8 bg-[var(--app-card-alt)] p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    fullName={result.fullName}
                                    profilePhotoUrl={result.profilePhotoUrl}
                                    size={44}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-black">
                                      {result.fullName}
                                    </div>
                                    <div className="truncate text-xs text-black/55">
                                      {result.email}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Link
                                    href={getProfileHref(result.email)}
                                    className="rounded-full border border-black/12 px-3 py-2 text-xs font-semibold text-black/75 transition hover:border-black/20 hover:text-black"
                                  >
                                    View profile
                                  </Link>

                                  {result.friendshipState === "accepted" ? (
                                    <span className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white">
                                      Friends
                                    </span>
                                  ) : result.friendshipState ===
                                    "pending_outgoing" ? (
                                    <span className="rounded-full border border-black/12 bg-white px-3 py-2 text-xs font-semibold text-black/55">
                                      Request sent
                                    </span>
                                  ) : result.friendshipState ===
                                    "pending_incoming" ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsNotificationsOpen(true);
                                        setIsFriendFinderOpen(false);
                                      }}
                                      className="rounded-full border border-black/12 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:border-black/20"
                                    >
                                      Respond in notifications
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleSearchFriendRequest(
                                          result.id,
                                        )
                                      }
                                      disabled={isSearchActionPending}
                                      className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
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
                        <div className="mt-4 rounded-[18px] border border-black/8 bg-[var(--app-card-alt)] px-4 py-3 text-sm text-black/62">
                          No matching users found.
                        </div>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>

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
                              {acceptedRequests.map((notification) => (
                                <div
                                  key={`accepted-${getAcceptedNotificationKey(notification)}`}
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
                                            handleDismissAcceptedNotification(
                                              notification,
                                            )
                                          }
                                          className="rounded-full border border-black/12 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:border-black/20"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
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
                  className="h-[112px] w-[112px] rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[112px] w-[112px] items-center justify-center rounded-full bg-black text-[34px] font-bold text-white">
                  {getInitials(profile.fullName)}
                </div>
              )}

              <div className="pb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[36px] font-bold leading-none tracking-[-0.04em] text-black">
                    {profile.fullName}
                  </h2>
                  <InlineSchoolMark profile={profile} />
                </div>
                <p className="mt-3 text-[12px] uppercase tracking-[0.22em] text-black/48">
                  Joined {formatJoinedDate(profile.joinedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {viewer.isOwnProfile && progress ? (
          <div className="mt-10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/40 mb-4">
              Pet Unlock Progress
            </div>
            <div className="flex flex-wrap gap-3">
              {TAMAGOTCHI_SPECIES.filter((s) => s.unlockRequirements !== null).map((species) => {
                const requirements = species.unlockRequirements!;
                const allDone = requirements.every((k) => progress[k]);
                return (
                  <div key={species.id} className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-black">
                        {species.name}
                      </span>
                      {allDone ? (
                        <span className="text-[11px] font-semibold text-green-600">Unlocked</span>
                      ) : (
                        <span className="text-[11px] text-black/40">
                          {requirements.filter((k) => progress[k]).length}/{requirements.length}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {requirements.map((key) => {
                        const done = progress[key];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                done
                                  ? "bg-black text-white"
                                  : "border border-black/20 text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`text-[12px] ${done ? "text-black/50 line-through" : "text-black/55"}`}
                            >
                              {PROGRESS_KEY_LABELS[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-20">
          <div className="grid max-w-4xl gap-x-0 gap-y-6 md:grid-cols-3">
            {viewer.isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => changeSection("notes", 0)}
                  className={`folder-grid-card border px-6 py-6 text-left ${
                    activeSection === "notes"
                      ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                      : focusLevel === "tabs" && keyboardFocusIndex === 0
                        ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                        : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                      activeSection === "notes" ||
                      (focusLevel === "tabs" && keyboardFocusIndex === 0)
                        ? "text-black/55"
                        : "text-black/95"
                    }`}
                  >
                    Notes
                  </div>
                  <div
                    className={`mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] ${
                      activeSection === "notes" ? "text-black" : "text-black"
                    }`}
                  >
                    {profile.noteCount}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => changeSection("folders", 1)}
                  className={`folder-grid-card border px-6 py-6 text-left ${
                    activeSection === "folders"
                      ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                      : focusLevel === "tabs" && keyboardFocusIndex === 1
                        ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                        : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                      activeSection === "folders" ||
                      (focusLevel === "tabs" && keyboardFocusIndex === 1)
                        ? "text-black/55"
                        : "text-black/95"
                    }`}
                  >
                    Folders
                  </div>
                  <div
                    className={`mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] ${
                      activeSection === "folders" ? "text-black" : "text-black"
                    }`}
                  >
                    {profile.folderCount}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => changeSection("friends", 2)}
                  className={`folder-grid-card border px-6 py-6 text-left ${
                    activeSection === "friends"
                      ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                      : focusLevel === "tabs" && keyboardFocusIndex === 2
                        ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                        : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                      activeSection === "friends" ||
                      (focusLevel === "tabs" && keyboardFocusIndex === 2)
                        ? "text-black/55"
                        : "text-black/95"
                    }`}
                  >
                    Friends
                  </div>
                  <div
                    className={`mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] ${
                      activeSection === "friends" ? "text-black" : "text-black"
                    }`}
                  >
                    {profile.friendCount}
                  </div>
                </button>
              </>
            ) : (
              <>
                <div className="border border-transparent px-6 py-6">
                  <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                    Notes
                  </div>
                  <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                    {profile.noteCount}
                  </div>
                </div>

                <div className="border border-transparent px-6 py-6">
                  <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                    Folders
                  </div>
                  <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                    {profile.folderCount}
                  </div>
                </div>

                <div className="border border-transparent px-6 py-6">
                  <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                    Friends
                  </div>
                  <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                    {profile.friendCount}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {friendError ? (
          <p className="mt-6 text-sm text-[#a11d1d]">{friendError}</p>
        ) : null}

        <div className="mt-8 border-t border-dashed border-black/20 pt-12">
          {viewer.isOwnProfile ? (
            <div>
              <h3 className="text-[30px] font-bold leading-none tracking-[-0.04em] text-black">
                {activeSection === "notes"
                  ? "Notes"
                  : activeSection === "friends"
                    ? "Friends"
                    : "Folders"}
              </h3>

              <div key={sectionAnimKey} className="profile-section-enter">
                {activeSection === "notes" ? (
                  <>
                    {isLoadingProfileNotes && profileNotes.length === 0 ? (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          Loading notes...
                        </div>
                      </div>
                    ) : profileNotes.length > 0 ? (
                      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {profileNotes.map((note, idx) => (
                          <ProfileNoteCard
                            key={note.id}
                            content={note.content}
                            createdAt={note.createdAt}
                            href={getNoteHref(note.ownerEmail, note.name)}
                            name={note.name}
                            isFocused={
                              focusLevel === "items" &&
                              activeSection === "notes" &&
                              focusedItemIndex === idx
                            }
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
                  </>
                ) : null}

                {activeSection === "friends" ? (
                  <>
                    {friendDirectoryError ? (
                      <p className="mt-4 text-sm text-[#a11d1d]">
                        {friendDirectoryError}
                      </p>
                    ) : null}

                    {isLoadingFriends ? (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          Loading friends...
                        </div>
                      </div>
                    ) : friends.length > 0 ? (
                      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {friends.map((friend, idx) => {
                          const isItemFocused =
                            focusLevel === "items" &&
                            activeSection === "friends" &&
                            focusedItemIndex === idx;
                          const friendActiveClass = isItemFocused
                            ? "folder-grid-card--active ring-2 ring-black ring-offset-2"
                            : "";
                          return (
                            <Link
                              key={friend.id}
                              href={getProfileHref(friend.email)}
                              className={`folder-grid-card ${friendActiveClass} rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] p-4 text-black`}
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
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          No accepted friends yet.
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                {activeSection === "folders" ? (
                  <>
                    {folderError ? (
                      <p className="mt-4 text-sm text-[#a11d1d]">
                        {folderError}
                      </p>
                    ) : null}

                    {isLoadingFolders ? (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          Loading folders...
                        </div>
                      </div>
                    ) : folders.length > 0 ? (
                      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {folders.map((folder, idx) => (
                          <ProfileFolderCard
                            key={folder.id}
                            folder={folder}
                            isFocused={
                              focusLevel === "items" &&
                              activeSection === "folders" &&
                              focusedItemIndex === idx
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          No folders yet.
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          ) : canSeeNotes ? (
            <div>
              <h3 className="text-[30px] font-bold leading-none tracking-[-0.04em] text-black">
                {notesSectionTitle}
              </h3>

              {profileNotes.length > 0 ? (
                <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {profileNotes.map((note) => (
                    <ProfileNoteCard
                      key={note.id}
                      content={note.content}
                      createdAt={note.createdAt}
                      href={null}
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
        onSaved={() => {
          void reloadFolders();
          router.refresh();
        }}
        open={viewer.isOwnProfile && isEditorOpen}
        profile={profile}
        schools={schools}
      />
    </div>
  );
}
