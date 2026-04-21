"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { swrFetcher } from "@/lib/swr-fetcher";
import ProfileEditor from "@/components/profile/profile-editor";
import type { ExploreCommentRecord } from "@/lib/explore";
import type {
  ProfileFriendshipState,
  ProfileSchoolOption,
  ProfileViewData,
  ProfileViewerData,
} from "@/lib/profile-data";
import { getPreviewText, formatAuthoredDate } from "@/lib/text-utils";
import { NOTE_VISIBILITY_LABELS } from "@/lib/note-visibility";
import {
  TAMAGOTCHI_SPECIES,
  type ProgressKey,
  type UserProgressData,
} from "@/lib/tamagotchi-config";

type ProfileViewProps = {
  profile: ProfileViewData;
  schools?: ProfileSchoolOption[];
  viewer: ProfileViewerData;
  onOpenSchool?: (schoolId: string) => void;
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

type ProfileContentSection = "notes" | "posts" | "friends" | "folders";

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

function SchoolTag({
  className = "",
  profile,
  onOpenSchool,
}: {
  className?: string;
  profile: ProfileViewData;
  onOpenSchool?: (schoolId: string) => void;
}) {
  if (!profile.schoolName) return null;

  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 shadow-sm ${className}`}
    >
      {profile.schoolLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.schoolLogoUrl}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <span className="text-[10px] font-bold text-black/55">
          {getInitials(profile.schoolName).slice(0, 2)}
        </span>
      )}
      <span className="max-w-[160px] truncate text-[11px] font-medium text-black/65">
        {profile.schoolName}
      </span>
    </span>
  );

  if (profile.schoolId && onOpenSchool) {
    return (
      <button
        type="button"
        className="transition hover:opacity-75"
        onClick={(event) => {
          event.stopPropagation();
          onOpenSchool(profile.schoolId!);
        }}
      >
        {inner}
      </button>
    );
  }

  return inner;
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

function ProfilePostCard({
  note,
  onOpen,
  owner,
  isFocused = false,
}: {
  note: ProfileViewData["notes"][number];
  onOpen: () => void;
  owner: Pick<
    ProfileViewData,
    "fullName" | "profilePhotoUrl" | "schoolId" | "schoolLogoUrl" | "schoolName"
  >;
  isFocused?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-[28px] border border-black/10 bg-[var(--app-card)] p-6 text-left text-black transition ${
        isFocused ? "ring-2 ring-black ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
        <span className="rounded-full border border-black/10 bg-black/10 px-3 py-1 text-black/78">
          {NOTE_VISIBILITY_LABELS[note.visibility]}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <UserAvatar
          fullName={owner.fullName}
          profilePhotoUrl={owner.profilePhotoUrl}
          size={32}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-black">
            {owner.fullName}
          </p>
          <div className="mt-1">
            <SchoolTag
              className="align-middle"
              profile={{
                ...owner,
                age: null,
                bio: null,
                email: "",
                friends: [],
                folderCount: 0,
                friendCount: 0,
                id: "",
                joinedAt: "",
                noteCount: 0,
                notes: [],
                schoolAccentColor: null,
                schoolLocation: null,
                schoolPrimaryColor: null,
              }}
            />
          </div>
        </div>
      </div>

      <p className="mt-2 text-[12px] text-black/45">
        {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
      </p>

      <h4 className="mt-5 text-[30px] font-bold leading-[1.05]">{note.name}</h4>
      <p className="mt-5 text-[18px] leading-[1.6] text-black/72">
        {getPreviewText(note.content, 120) || "No preview available yet."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-[15px] font-medium text-black/70">
          Likes · {note.likeCount}
        </span>
        <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-[15px] font-medium text-black/70">
          Comments · {note.commentCount}
        </span>
      </div>
    </button>
  );
}

function getProfilePostLayoutClass(index: number) {
  const pattern = index % 6;

  if (pattern === 0) {
    return "lg:col-span-7";
  }

  if (pattern === 1) {
    return "lg:col-span-5";
  }

  if (pattern === 2 || pattern === 3 || pattern === 4) {
    return "lg:col-span-4";
  }

  return "lg:col-span-6";
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
  "posts",
  "folders",
  "friends",
];

export default function ProfileView({
  profile,
  schools = [],
  viewer,
  onOpenSchool,
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
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [postCommentDraft, setPostCommentDraft] = useState("");
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [pendingSearchTargetId, setPendingSearchTargetId] = useState<
    string | null
  >(null);
  const [pendingNotificationActionKey, setPendingNotificationActionKey] =
    useState<string | null>(null);
  const postCommentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const noteItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const postItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const folderItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const friendItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // ── Typing animation ─────────────────────────────────────────────────────
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [isTitleDone, setIsTitleDone] = useState(false);
  const [displayedName, setDisplayedName] = useState("");
  const [isNameDone, setIsNameDone] = useState(false);

  // ── SWR data fetching ────────────────────────────────────────────────────
  const swrKey = viewer.isOwnProfile;
  const {
    data: notesData,
    isLoading: isLoadingProfileNotes,
    mutate: mutateProfileNotes,
  } = useSWR<{ notes: typeof profile.notes }>(
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
  const profilePosts = profileNotes.filter(
    (note) => note.visibility !== "PRIVATE" && note.publishedAt !== null,
  );
  const visibleProfilePosts = viewer.isOwnProfile ? profilePosts : profile.notes;
  const visibleFriends = viewer.isOwnProfile ? friends : profile.friends;
  const openedPost =
    visibleProfilePosts.find((note) => note.id === openedPostId) ?? null;
  const {
    data: postCommentsData,
    isLoading: isLoadingPostComments,
    mutate: mutatePostComments,
  } = useSWR<{ comments: ExploreCommentRecord[] }>(
    openedPostId ? `/api/notes/${openedPostId}/comments` : null,
    swrFetcher,
  );
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

  const findNextItemIndex = useCallback(
    (
      currentIndex: number,
      key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
    ) => {
      const refs =
        activeSection === "notes"
          ? noteItemRefs.current
          : activeSection === "posts"
            ? postItemRefs.current
            : activeSection === "folders"
              ? folderItemRefs.current
              : friendItemRefs.current;
      const currentItem = refs[currentIndex];

      if (!currentItem) {
        return null;
      }

      const currentRect = currentItem.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;
      const currentHeight = currentRect.height;
      const currentWidth = currentRect.width;

      let nextIndex: number | null = null;
      let bestPrimaryDistance = Number.POSITIVE_INFINITY;
      let bestSecondaryDistance = Number.POSITIVE_INFINITY;

      refs.forEach((candidateItem, index) => {
        if (!candidateItem || index === currentIndex) {
          return;
        }

        const candidateRect = candidateItem.getBoundingClientRect();
        const candidateCenterX = candidateRect.left + candidateRect.width / 2;
        const candidateCenterY = candidateRect.top + candidateRect.height / 2;
        const deltaX = candidateCenterX - currentCenterX;
        const deltaY = candidateCenterY - currentCenterY;

        let primaryDistance = Number.POSITIVE_INFINITY;
        let secondaryDistance = Number.POSITIVE_INFINITY;

        if (key === "ArrowLeft" && deltaX < -8) {
          primaryDistance = Math.abs(deltaX);
          secondaryDistance = Math.abs(deltaY);
        }

        if (key === "ArrowRight" && deltaX > 8) {
          primaryDistance = Math.abs(deltaX);
          secondaryDistance = Math.abs(deltaY);
        }

        if (key === "ArrowUp" && deltaY < -8) {
          primaryDistance = Math.abs(deltaY);
          secondaryDistance = Math.abs(deltaX);
        }

        if (key === "ArrowDown" && deltaY > 8) {
          primaryDistance = Math.abs(deltaY);
          secondaryDistance = Math.abs(deltaX);
        }

        if (!Number.isFinite(primaryDistance)) {
          return;
        }

        const isHorizontalMove = key === "ArrowLeft" || key === "ArrowRight";
        const alignmentLimit = isHorizontalMove
          ? Math.max(72, currentHeight * 0.7)
          : Math.max(96, currentWidth * 0.8);
        const penalizedPrimary =
          secondaryDistance > alignmentLimit
            ? primaryDistance + alignmentLimit * 4
            : primaryDistance;

        if (
          penalizedPrimary < bestPrimaryDistance ||
          (penalizedPrimary === bestPrimaryDistance &&
            secondaryDistance < bestSecondaryDistance)
        ) {
          nextIndex = index;
          bestPrimaryDistance = penalizedPrimary;
          bestSecondaryDistance = secondaryDistance;
        }
      });

      return nextIndex;
    },
    [activeSection],
  );

  useEffect(() => {
    if (!viewer.isOwnProfile || focusLevel !== "items") {
      return;
    }

    const refs =
      activeSection === "notes"
        ? noteItemRefs.current
        : activeSection === "posts"
          ? postItemRefs.current
          : activeSection === "folders"
            ? folderItemRefs.current
            : friendItemRefs.current;
    const activeItem = refs[focusedItemIndex];

    if (!activeItem) {
      return;
    }

    activeItem.focus({ preventScroll: true });
    activeItem.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [activeSection, focusLevel, focusedItemIndex, viewer.isOwnProfile]);

  useEffect(() => {
    setFriendshipState(viewer.friendshipState);
  }, [viewer.friendshipState]);

  useEffect(() => {
    if (!viewer.isOwnProfile) {
      setActiveSection("notes");
    }
  }, [viewer.isOwnProfile]);

  // Title typing animation
  useEffect(() => {
    let i = 0;
    setDisplayedTitle("");
    setIsTitleDone(false);
    const timer = setInterval(() => {
      i++;
      setDisplayedTitle("Profile".slice(0, i));
      if (i >= "Profile".length) {
        clearInterval(timer);
        setIsTitleDone(true);
      }
    }, 55);
    return () => clearInterval(timer);
  }, []);

  // Name typing animation (starts after a short delay)
  useEffect(() => {
    const target = profile.fullName;
    let i = 0;
    setDisplayedName("");
    setIsNameDone(false);
    let innerTimer: ReturnType<typeof setInterval> | null = null;
    const delay = setTimeout(() => {
      innerTimer = setInterval(() => {
        i++;
        setDisplayedName(target.slice(0, i));
        if (i >= target.length) {
          if (innerTimer) clearInterval(innerTimer);
          setIsNameDone(true);
        }
      }, 40);
    }, 250);
    return () => {
      clearTimeout(delay);
      if (innerTimer) clearInterval(innerTimer);
    };
  }, [profile.fullName]);


  useEffect(() => {
    setPostCommentDraft("");
    setPostActionError(null);
  }, [openedPostId]);

  useEffect(() => {
    if (!viewer.isOwnProfile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (openedPostId) {
        return;
      }

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
          : activeSection === "posts"
            ? profilePosts
          : activeSection === "folders"
            ? folders
            : friends;
      const itemCount = currentItems.length;

      if (focusLevel === "tabs") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setKeyboardFocusIndex((i) => (i + 1) % PROFILE_SECTIONS.length);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setKeyboardFocusIndex(
            (i) => (i + PROFILE_SECTIONS.length - 1) % PROFILE_SECTIONS.length,
          );
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
        if (
          e.key === "ArrowRight" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown"
        ) {
          const nextIndex = findNextItemIndex(focusedItemIndex, e.key);

          if (nextIndex !== null) {
            e.preventDefault();
            setFocusedItemIndex(nextIndex);
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusLevel("tabs");
          }
        } else if (e.key === "Enter" && itemCount > 0) {
          e.preventDefault();
          if (activeSection === "notes") {
            const note = profileNotes[focusedItemIndex];
            if (note) router.push(getNoteHref(note.ownerEmail, note.name));
          } else if (activeSection === "posts") {
            const note = profilePosts[focusedItemIndex];
            if (note) router.push(getNoteHref(note.ownerEmail, note.name));
          } else if (activeSection === "folders") {
            const folder = folders[focusedItemIndex];
            if (folder)
              router.push(getFolderHref(folder.ownerEmail, folder.name));
          } else if (activeSection === "friends") {
            const friend = friends[focusedItemIndex];
            if (friend) router.push(`/${friend.email}`);
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
    profilePosts,
    folders,
    friends,
    router,
    changeSection,
    findNextItemIndex,
    openedPostId,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !openedPostId) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      setOpenedPostId(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [openedPostId]);

  const handleReplyToComment = useCallback((fullName: string) => {
    setPostCommentDraft((currentDraft) => {
      const nextDraft = currentDraft.trim().length === 0
        ? `@${fullName} `
        : `${currentDraft}\n@${fullName} `;
      return nextDraft;
    });

    window.setTimeout(() => {
      postCommentTextareaRef.current?.focus();
      const nextLength = postCommentTextareaRef.current?.value.length ?? 0;
      postCommentTextareaRef.current?.setSelectionRange(nextLength, nextLength);
    }, 0);
  }, []);

  async function handleTogglePostLike(noteId: string) {
    const target = profileNotes.find((note) => note.id === noteId);

    if (!target) {
      return;
    }

    setPostActionError(null);

    try {
      const response = await fetch(`/api/notes/${noteId}/likes`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            likeCount?: number;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update like.");
      }

      await mutateProfileNotes(
        (current) =>
          current
            ? {
                notes: current.notes.map((note) =>
                  note.id === noteId
                    ? {
                        ...note,
                        likeCount: payload?.likeCount ?? note.likeCount,
                      }
                    : note,
                ),
              }
            : current,
        { revalidate: false },
      );
    } catch (error) {
      setPostActionError(
        error instanceof Error ? error.message : "Failed to update like.",
      );
    }
  }

  async function handleSubmitPostComment(noteId: string) {
    const trimmed = postCommentDraft.trim();

    if (!trimmed) {
      return;
    }

    setPostActionError(null);

    try {
      const response = await fetch(`/api/notes/${noteId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: trimmed,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            comment?: ExploreCommentRecord;
            commentCount?: number;
          }
        | null;

      if (!response.ok || !payload?.comment) {
        throw new Error(payload?.error || "Failed to save comment.");
      }

      setPostCommentDraft("");

      await mutatePostComments(
        (current) => ({
          comments: [...(current?.comments ?? []), payload.comment!],
        }),
        { revalidate: false },
      );

      await mutateProfileNotes(
        (current) =>
          current
            ? {
                notes: current.notes.map((note) =>
                  note.id === noteId
                    ? {
                        ...note,
                        commentCount:
                          payload.commentCount ?? note.commentCount + 1,
                      }
                    : note,
                ),
              }
            : current,
        { revalidate: false },
      );
    } catch (error) {
      setPostActionError(
        error instanceof Error ? error.message : "Failed to save comment.",
      );
    }
  }


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

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.05em] text-black">
            {displayedTitle}
            {!isTitleDone && <span className="typing-cursor">|</span>}
          </h1>
        </div>

        <div className="flex items-start gap-3">
          {viewer.isOwnProfile ? (
            <>
              <div className="relative hidden">
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
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/${result.email}`)}
                                    className="rounded-full border border-black/12 px-3 py-2 text-xs font-semibold text-black/75 transition hover:border-black/20 hover:text-black"
                                  >
                                    View profile
                                  </button>

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

              <div className="relative hidden">
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
                                          <button
                                            type="button"
                                            onClick={() => router.push(`/${notification.user.email}`)}
                                            className="rounded-full border border-black/12 px-3 py-2 text-xs font-semibold text-black/70 transition hover:border-black/20 hover:text-black"
                                          >
                                            View profile
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
                                        <button
                                          type="button"
                                          onClick={() => router.push(`/${notification.user.email}`)}
                                          className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                                        >
                                          Open profile
                                        </button>
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
              <EditButton onClick={() => setIsEditorOpen(true)} />
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
              <div className="flex items-start gap-5">
              <div className="flex flex-col items-center gap-2.5">
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
              </div>

              <div className="pt-2">
                <h2 className="text-[36px] font-bold leading-none tracking-[-0.04em] text-black">
                  {displayedName}
                  {!isNameDone && <span className="typing-cursor">|</span>}
                </h2>
                {profile.schoolName && (
                  <div className="mt-2">
                  <SchoolTag profile={profile} onOpenSchool={onOpenSchool} />
                  </div>
                )}
                {profile.bio && (
                  <p className="mt-2 max-w-120 text-[15px] leading-relaxed text-black/65">
                    {profile.bio}
                  </p>
                )}
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
          <div className="grid max-w-5xl gap-x-0 gap-y-6 md:grid-cols-4">
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
                  onClick={() => changeSection("posts", 1)}
                  className={`folder-grid-card border px-6 py-6 text-left ${
                    activeSection === "posts"
                      ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                      : focusLevel === "tabs" && keyboardFocusIndex === 1
                        ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                        : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                      activeSection === "posts" ||
                      (focusLevel === "tabs" && keyboardFocusIndex === 1)
                        ? "text-black/55"
                        : "text-black/95"
                    }`}
                  >
                    Posts
                  </div>
                  <div
                    className={`mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] ${
                      activeSection === "posts" ? "text-black" : "text-black"
                    }`}
                  >
                    {profilePosts.length}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => changeSection("folders", 2)}
                  className={`folder-grid-card border px-6 py-6 text-left ${
                    activeSection === "folders"
                      ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                      : focusLevel === "tabs" && keyboardFocusIndex === 2
                        ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                        : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                      activeSection === "folders" ||
                      (focusLevel === "tabs" && keyboardFocusIndex === 2)
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
                  onClick={() => changeSection("friends", 3)}
                  className={`folder-grid-card border px-6 py-6 text-left ${
                    activeSection === "friends"
                      ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                      : focusLevel === "tabs" && keyboardFocusIndex === 3
                        ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                        : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                      activeSection === "friends" ||
                      (focusLevel === "tabs" && keyboardFocusIndex === 3)
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
                  : activeSection === "posts"
                    ? "Posts"
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
                          <div
                            key={note.id}
                            ref={(element) => {
                              noteItemRefs.current[idx] = element;
                            }}
                            className="outline-none"
                            tabIndex={-1}
                          >
                            <ProfileNoteCard
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
                          </div>
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

                {activeSection === "posts" ? (
                  <>
                    {isLoadingProfileNotes && profilePosts.length === 0 ? (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          Loading posts...
                        </div>
                      </div>
                    ) : profilePosts.length > 0 ? (
                      <div className="mt-8 grid gap-5 lg:grid-cols-12">
                        {profilePosts.map((note, idx) => (
                          <div
                            key={note.id}
                            ref={(element) => {
                              postItemRefs.current[idx] = element;
                            }}
                            className={`${getProfilePostLayoutClass(idx)} outline-none`}
                            tabIndex={-1}
                          >
                            <ProfilePostCard
                              note={note}
                              onOpen={() => setOpenedPostId(note.id)}
                              owner={profile}
                              isFocused={
                                focusLevel === "items" &&
                                activeSection === "posts" &&
                                focusedItemIndex === idx
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                        <div className="text-[22px] font-medium text-black/52">
                          No posts yet.
                        </div>
                      </div>
                    )}
                    {postActionError ? (
                      <p className="mt-4 text-sm text-[#a11d1d]">
                        {postActionError}
                      </p>
                    ) : null}
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
                            <button
                              key={friend.id}
                              ref={(element) => {
                                friendItemRefs.current[idx] = element;
                              }}
                              type="button"
                              onClick={() => router.push(`/${friend.email}`)}
                              className={`folder-grid-card ${friendActiveClass} rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] p-4 text-left text-black`}
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
                            </button>
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
                          <div
                            key={folder.id}
                            ref={(element) => {
                              folderItemRefs.current[idx] = element;
                            }}
                            className="outline-none"
                            tabIndex={-1}
                          >
                            <ProfileFolderCard
                              folder={folder}
                              isFocused={
                                focusLevel === "items" &&
                                activeSection === "folders" &&
                                focusedItemIndex === idx
                              }
                            />
                          </div>
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
          ) : (
            <div>
              <h3 className="text-[30px] font-bold leading-none tracking-[-0.04em] text-black">
                Posts
              </h3>

              {visibleProfilePosts.length > 0 ? (
                <div className="mt-8 grid gap-5 lg:grid-cols-12">
                  {visibleProfilePosts.map((note, idx) => (
                    <div key={note.id} className={getProfilePostLayoutClass(idx)}>
                      <ProfilePostCard
                        note={note}
                        onOpen={() => setOpenedPostId(note.id)}
                        owner={profile}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                  <div className="text-[22px] font-medium text-black/52">
                    No posts yet.
                  </div>
                </div>
              )}

              <div className="mt-14">
                <h3 className="text-[30px] font-bold leading-none tracking-[-0.04em] text-black">
                  Friends
                </h3>

                {visibleFriends.length > 0 ? (
                  <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleFriends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => router.push(`/${friend.email}`)}
                        className="folder-grid-card rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] p-4 text-left text-black"
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
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-[28px] border border-black/10 bg-[var(--app-card-alt)] px-6 py-8">
                    <div className="text-[22px] font-medium text-black/52">
                      No accepted friends yet.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {openedPost ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-6 py-8">
          <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                <span className="rounded-full border border-black/10 bg-black/10 px-3 py-1 text-black/78">
                  {NOTE_VISIBILITY_LABELS[openedPost.visibility]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {viewer.isOwnProfile ? (
                  <button
                    type="button"
                    className="rounded-full border border-black bg-black px-4 py-2 text-[14px] font-medium text-white"
                    onClick={() =>
                      router.push(
                        getNoteHref(openedPost.ownerEmail, openedPost.name),
                      )
                    }
                  >
                    Edit note
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-[14px] font-medium text-black/70"
                  onClick={() => setOpenedPostId(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <UserAvatar
                fullName={profile.fullName}
                profilePhotoUrl={profile.profilePhotoUrl}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-black">
                  {profile.fullName}
                </p>
                <div className="mt-1">
                  <SchoolTag
                    className="align-middle"
                    profile={profile}
                    onOpenSchool={onOpenSchool}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-black/45">
              {formatAuthoredDate(openedPost.publishedAt ?? openedPost.createdAt)}
            </p>

            <h2 className="mt-6 max-w-4xl text-[38px] font-bold leading-[1.02] text-black">
              {openedPost.name}
            </h2>

            <div
              className="prose prose-lg mt-8 max-w-none text-black"
              dangerouslySetInnerHTML={{ __html: openedPost.content }}
            />

            <div className="mt-10 border-t border-black/10 pt-8">
              {postActionError ? (
                <p className="mb-4 text-sm text-[#a11d1d]">{postActionError}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-[15px] font-medium text-black/70 transition-transform duration-150 hover:-translate-y-0.5"
                  onClick={() => void handleTogglePostLike(openedPost.id)}
                >
                  Like · {openedPost.likeCount}
                </button>
                <span className="text-[15px] text-black/55">
                  Comments · {postCommentsData?.comments?.length ?? openedPost.commentCount}
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {(postCommentsData?.comments ?? []).map((comment) => (
                  <div
                    key={comment.id}
                    className="border-b border-black/6 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-semibold text-black">
                          {comment.author.fullName}
                        </div>
                        <div className="mt-1 text-[13px] text-black/40">
                          {formatAuthoredDate(comment.createdAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/60"
                        onClick={() => handleReplyToComment(comment.author.fullName)}
                      >
                        Reply
                      </button>
                    </div>
                    <p className="mt-2 text-[15px] leading-[1.5] text-black/72">
                      {comment.body}
                    </p>
                  </div>
                ))}
                {isLoadingPostComments ? (
                  <p className="text-[15px] text-black/45">Loading comments...</p>
                ) : null}
                {!isLoadingPostComments &&
                (postCommentsData?.comments?.length ?? 0) === 0 ? (
                  <p className="text-[15px] text-black/45">No comments yet.</p>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <textarea
                  ref={postCommentTextareaRef}
                  value={postCommentDraft}
                  onChange={(event) => setPostCommentDraft(event.target.value)}
                  rows={3}
                  maxLength={600}
                  className="w-full rounded-[20px] border border-black/10 bg-[var(--app-card)] px-4 py-3 text-[15px] text-black outline-none"
                  placeholder="Add a comment..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-black/35">
                    {postCommentDraft.trim().length}/600
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-black bg-black px-4 py-2 text-[14px] font-medium text-white"
                    onClick={() => void handleSubmitPostComment(openedPost.id)}
                  >
                    Post comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
