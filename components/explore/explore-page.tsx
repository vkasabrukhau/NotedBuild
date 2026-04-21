"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import NoteCardStack from "@/components/notes/note-card-stack";
import PostViewerModal from "@/components/notes/post-viewer-modal";
import {
  type ExploreCommentRecord,
  type ExploreNoteCard,
} from "@/lib/explore";
import { findNextGridItemIndex, focusGridItem } from "@/lib/grid-navigation";
import { swrFetcher } from "@/lib/swr-fetcher";
import { formatAuthoredDate, getPreviewText } from "@/lib/text-utils";
import type { ProfileFriendshipState } from "@/lib/profile-data";
import Link from "next/link";

const EMPTY_NOTES: ExploreNoteCard[] = [];

type SchoolSummary = {
  id: string;
  name: string;
  location: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  studentCount: number;
};

type ActiveView = "feed" | "schools" | "friends" | "inbox";

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getSourceChipClassName(sourceType: ExploreNoteCard["sourceType"]) {
  if (sourceType === "friends") {
    return "border-black bg-black text-white";
  }

  if (sourceType === "school") {
    return "border-black/10 bg-black/10 text-black/78";
  }

  if (sourceType === "trending") {
    return "border-amber-200 bg-amber-100 text-amber-900";
  }

  return "border-black/8 bg-black/[0.06] text-black/60";
}

function ExploreUserAvatar({
  fullName,
  profilePhotoUrl,
  size = 48,
}: {
  fullName: string;
  profilePhotoUrl: string | null;
  size?: number;
}) {
  const radiusClass = size >= 56 ? "rounded-[18px]" : "rounded-[16px]";

  if (profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePhotoUrl}
        alt={fullName}
        width={size}
        height={size}
        className={`${radiusClass} border border-black/8 object-cover shadow-[0_10px_24px_rgba(20,18,17,0.08)]`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex ${radiusClass} items-center justify-center border border-black/8 bg-black text-white shadow-[0_10px_24px_rgba(20,18,17,0.08)]`}
      style={{ width: size, height: size }}
    >
      <span className="text-sm font-bold uppercase tracking-[0.08em]">
        {getInitials(fullName)}
      </span>
    </div>
  );
}

function ExploreSchoolTag({
  compact = false,
  schoolLogoUrl,
  schoolName,
  schoolId,
  onClick,
}: {
  compact?: boolean;
  schoolLogoUrl: string | null;
  schoolName: string | null;
  schoolId?: string | null;
  onClick?: () => void;
}) {
  if (!schoolName) {
    return null;
  }

  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white shadow-sm ${
        compact ? "px-2 py-0.5" : "px-2.5 py-1"
      }`}
    >
      {schoolLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={schoolLogoUrl}
          alt=""
          width={16}
          height={16}
          className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} object-contain`}
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <span className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold text-black/55`}>
          {getInitials(schoolName).slice(0, 2)}
        </span>
      )}
      <span
        className={`truncate font-medium text-black/65 ${
          compact ? "max-w-[126px] text-[10px]" : "max-w-[160px] text-[11px]"
        }`}
      >
        {schoolName}
      </span>
    </span>
  );

  if (schoolId && onClick) {
    return (
      <button type="button" onClick={onClick} className="transition hover:opacity-75">
        {inner}
      </button>
    );
  }

  return inner;
}

const SchoolCard = forwardRef<
  HTMLButtonElement,
  { school: SchoolSummary; onClick: () => void; isActive?: boolean }
>(function SchoolCard({ school, onClick, isActive = false }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      data-school-id={school.id}
      className={`folder-grid-card w-full rounded-[28px] border border-black/10 bg-[var(--app-card)] p-5 text-left text-black outline-none transition-[transform,box-shadow,border-color] duration-200 focus:outline-none focus-visible:outline-none${isActive ? " folder-grid-card--active -translate-y-1 border-black shadow-[0_18px_36px_rgba(20,18,17,0.12)]" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div
          className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[16px] border border-black/10 bg-white"
          style={
            school.primaryColor
              ? { backgroundColor: `${school.primaryColor}18` }
              : undefined
          }
        >
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logoUrl}
              alt={school.name}
              width={56}
              height={56}
              className="h-full w-full object-contain p-1"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[18px] font-bold text-black/30">
                {getInitials(school.name)}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-bold text-black">
            {school.name}
          </div>
          {school.location ? (
            <div className="truncate text-[13px] text-black/55">
              {school.location}
            </div>
          ) : null}
          <div className="mt-1 text-[12px] font-medium text-black/40">
            {school.studentCount} {school.studentCount === 1 ? "student" : "students"}
          </div>
        </div>
      </div>
    </button>
  );
});

function getExploreCardLayout(index: number) {
  const pattern = index % 6;

  if (pattern === 0) {
    return {
      articleClass:
        "lg:col-span-7 lg:min-h-[420px] xl:min-h-[460px]",
      titleClass: "text-[38px] lg:text-[52px]",
      previewLength: 160,
    };
  }

  if (pattern === 1) {
    return {
      articleClass:
        "lg:col-span-5 lg:min-h-[420px] xl:min-h-[460px]",
      titleClass: "text-[30px] lg:text-[42px]",
      previewLength: 124,
    };
  }

  if (pattern === 2) {
    return {
      articleClass:
        "lg:col-span-4 lg:min-h-[320px]",
      titleClass: "text-[28px] lg:text-[34px]",
      previewLength: 96,
    };
  }

  if (pattern === 3) {
    return {
      articleClass:
        "lg:col-span-4 lg:min-h-[360px]",
      titleClass: "text-[28px] lg:text-[36px]",
      previewLength: 104,
    };
  }

  if (pattern === 4) {
    return {
      articleClass:
        "lg:col-span-4 lg:min-h-[300px]",
      titleClass: "text-[26px] lg:text-[32px]",
      previewLength: 88,
    };
  }

  return {
    articleClass:
      "lg:col-span-6 lg:min-h-[340px]",
    titleClass: "text-[30px] lg:text-[40px]",
    previewLength: 110,
  };
}

type FriendshipSearchResult = {
  email: string;
  fullName: string;
  friendshipState: ProfileFriendshipState;
  id: string;
  profilePhotoUrl: string | null;
};

type FriendshipNotificationUser = {
  email: string;
  fullName: string;
  id: string;
  profilePhotoUrl: string | null;
};

type FriendshipNotification = {
  createdAt: string;
  user: FriendshipNotificationUser;
};

export default function ExplorePage({
  isShellOverlayOpen = false,
  onOpenSchool,
}: {
  isShellOverlayOpen?: boolean;
  onOpenSchool?: (schoolId: string) => void;
}) {
  const router = useRouter();
  const cardButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const friendSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("feed");
  const activeViewRef = useRef<ActiveView>("feed");
  activeViewRef.current = activeView;
  const [tabFocusLevel, setTabFocusLevel] = useState<"tabs" | "items">("tabs");
  const tabFocusLevelRef = useRef<"tabs" | "items">("tabs");
  tabFocusLevelRef.current = tabFocusLevel;
  const [tabKeyboardIndex, setTabKeyboardIndex] = useState(0);
  const schoolCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeSchoolIndex, setActiveSchoolIndex] = useState(0);
  const activeSchoolIndexRef = useRef(0);
  activeSchoolIndexRef.current = activeSchoolIndex;
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [hasArrowSelection, setHasArrowSelection] = useState(false);
  const [hasInitializedArrowSelection, setHasInitializedArrowSelection] =
    useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [pendingNotificationActionKey, setPendingNotificationActionKey] =
    useState<string | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState<FriendshipSearchResult[]>(
    [],
  );
  const [friendSearchError, setFriendSearchError] = useState<string | null>(
    null,
  );
  const [isFriendSearching, setIsFriendSearching] = useState(false);
  const [pendingFriendId, setPendingFriendId] = useState<string | null>(null);

  const {
    data,
    error,
    isLoading,
    mutate: mutateFeed,
  } = useSWR<{ notes: ExploreNoteCard[] }>("/api/explore", swrFetcher);
  const { data: notificationsData, mutate: mutateNotifications } = useSWR<{
    acceptedRequests: FriendshipNotification[];
    incomingRequests: FriendshipNotification[];
  }>("/api/friendships?view=notifications", swrFetcher);
  const { data: schoolsData, isLoading: schoolsLoading } = useSWR<{
    schools: SchoolSummary[];
  }>(activeView === "schools" ? "/api/schools" : null, swrFetcher);

  const notes = useMemo(() => data?.notes ?? EMPTY_NOTES, [data]);
  const {
    data: commentsData,
    isLoading: commentsLoading,
    mutate: mutateComments,
  } = useSWR<{ comments: ExploreCommentRecord[] }>(
    openedPostId ?? expandedNoteId
      ? `/api/notes/${openedPostId ?? expandedNoteId}/comments`
      : null,
    swrFetcher,
  );
  const displayNotes = notes;
  const openedPost = useMemo(
    () => displayNotes.find((note) => note.id === openedPostId) ?? null,
    [displayNotes, openedPostId],
  );
  const activeCommentsNoteId = openedPostId ?? expandedNoteId;
  const acceptedRequests = notificationsData?.acceptedRequests ?? [];
  const incomingRequests = notificationsData?.incomingRequests ?? [];
  const unreadFriendshipCount =
    incomingRequests.length + acceptedRequests.length;

  const openSchool = useCallback(
    (schoolId: string) => {
      onOpenSchool?.(schoolId);
    },
    [onOpenSchool],
  );

  useEffect(() => {
    setActiveCardIndex((currentIndex) =>
      Math.max(0, Math.min(displayNotes.length - 1, currentIndex)),
    );
  }, [displayNotes.length]);

  useEffect(() => {
    if (
      hasInitializedArrowSelection ||
      isShellOverlayOpen ||
      displayNotes.length === 0
    ) {
      return;
    }

    setHasArrowSelection(true);
    setHasInitializedArrowSelection(true);
  }, [displayNotes.length, hasInitializedArrowSelection, isShellOverlayOpen]);

  useEffect(() => {
    if (
      isShellOverlayOpen ||
      !hasArrowSelection ||
      openedPostId ||
      displayNotes.length === 0
    ) {
      return;
    }

    focusGridItem(cardButtonRefs.current, activeCardIndex);
  }, [
    activeCardIndex,
    displayNotes.length,
    hasArrowSelection,
    isShellOverlayOpen,
    openedPostId,
  ]);

  useEffect(() => {
    if (isShellOverlayOpen) {
      setHasArrowSelection(false);
    }
  }, [isShellOverlayOpen]);

  useEffect(() => {
    const trimmedQuery = friendQuery.trim();

    if (trimmedQuery.length === 0) {
      setFriendResults([]);
      setFriendSearchError(null);
      setIsFriendSearching(false);
      return;
    }

    if (trimmedQuery.length < 2) {
      setFriendResults([]);
      setFriendSearchError("Type at least 2 characters to search.");
      setIsFriendSearching(false);
      return;
    }

    let cancelled = false;
    setIsFriendSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/friendships?query=${encodeURIComponent(trimmedQuery)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              results?: FriendshipSearchResult[];
            }
          | null;

        if (!response.ok || !payload?.results) {
          throw new Error(payload?.error || "Failed to search users.");
        }

        if (cancelled) {
          return;
        }

        setFriendResults(payload.results);
        setFriendSearchError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFriendSearchError(
          error instanceof Error ? error.message : "Failed to search users.",
        );
      } finally {
        if (!cancelled) {
          setIsFriendSearching(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [friendQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isFindShortcut =
        event.key.toLowerCase() === "f" &&
        ((event.ctrlKey && !event.metaKey) ||
          (event.metaKey && !event.ctrlKey));

      if (isFindShortcut) {
        event.preventDefault();
        event.stopImmediatePropagation();
        friendSearchInputRef.current?.focus();
        friendSearchInputRef.current?.select();
        return;
      }

      if (event.key !== "Escape") {
        return;
      }

      if (isShellOverlayOpen) {
        return;
      }

      if (openedPostId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpenedPostId(null);
        return;
      }

      if (isNotificationsOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsNotificationsOpen(false);
        return;
      }

      if (expandedNoteId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setExpandedNoteId(null);
        return;
      }

      if (tabFocusLevel === "items") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setTabFocusLevel("tabs");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    expandedNoteId,
    isShellOverlayOpen,
    isNotificationsOpen,
    openedPostId,
    tabFocusLevel,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowDown", "Enter"].includes(event.key)) return;
      if (isShellOverlayOpen || openedPostId || isNotificationsOpen) return;
      if (tabFocusLevel !== "tabs") return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)) return;

      const views: ActiveView[] = ["feed", "schools"];

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setTabKeyboardIndex((i) => (i + views.length - 1) % views.length);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setTabKeyboardIndex((i) => (i + 1) % views.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        setActiveView(views[tabKeyboardIndex]);
        setTabFocusLevel("items");
        setHasArrowSelection(false);
        setActiveCardIndex(0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setTabFocusLevel("items");
        setHasArrowSelection(false);
        setActiveCardIndex(0);
        setActiveSchoolIndex(0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [tabFocusLevel, tabKeyboardIndex, isShellOverlayOpen, openedPostId, isNotificationsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(
          event.key,
        )
      ) {
        return;
      }

      if (
        isShellOverlayOpen ||
        openedPostId ||
        isNotificationsOpen ||
        tabFocusLevelRef.current === "tabs" ||
        (activeViewRef.current === "feed" && displayNotes.length === 0) ||
        (activeViewRef.current === "schools" && schoolCardRefs.current.filter(Boolean).length === 0) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;

      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      const isSchoolsView = activeViewRef.current === "schools";
      const refs = isSchoolsView ? schoolCardRefs : cardButtonRefs;
      const currentIndex = isSchoolsView ? activeSchoolIndexRef.current : activeCardIndex;
      const setIndex = isSchoolsView ? setActiveSchoolIndex : setActiveCardIndex;

      if (event.key === "Enter") {
        event.preventDefault();
        if (isSchoolsView) {
          const el = schoolCardRefs.current[activeSchoolIndexRef.current];
          const schoolId = el?.dataset.schoolId;
          if (schoolId) openSchool(schoolId);
        } else {
          const activeNote = displayNotes[activeCardIndex];
          if (activeNote) setOpenedPostId(activeNote.id);
        }
        return;
      }

      const nextIndex =
        findNextGridItemIndex(
          refs.current,
          currentIndex,
          event.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
        ) ?? currentIndex;

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        setHasArrowSelection(true);
        setIndex(nextIndex);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setTabFocusLevel("tabs");
        setHasArrowSelection(false);
        return;
      }

      if (
        event.key !== "Enter" &&
        ["ArrowLeft", "ArrowRight", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        setHasArrowSelection(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    activeCardIndex,
    displayNotes,
    isNotificationsOpen,
    isShellOverlayOpen,
    openSchool,
    openedPostId,
    router,
  ]);

  async function reloadSearchResults() {
    const trimmedQuery = friendQuery.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    try {
      const response = await fetch(
        `/api/friendships?query=${encodeURIComponent(trimmedQuery)}`,
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            results?: FriendshipSearchResult[];
          }
        | null;

      if (!response.ok || !payload?.results) {
        throw new Error(payload?.error || "Failed to search users.");
      }

      setFriendResults(payload.results);
      setFriendSearchError(null);
    } catch (error) {
      setFriendSearchError(
        error instanceof Error ? error.message : "Failed to search users.",
      );
    }
  }

  async function handleAddFriend(targetUserId: string) {
    setPendingFriendId(targetUserId);
    setActionError(null);

    try {
      const response = await fetch("/api/friendships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            friendshipState?: ProfileFriendshipState;
          }
        | null;

      if (!response.ok || !payload?.friendshipState) {
        throw new Error(payload?.error || "Failed to update friendship.");
      }

      setFriendResults((currentResults) =>
        currentResults.map((result) =>
          result.id === targetUserId
            ? {
                ...result,
                friendshipState: payload.friendshipState!,
              }
            : result,
        ),
      );
      await mutateFeed();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update friendship.",
      );
    } finally {
      setPendingFriendId(null);
    }
  }

  function getFriendActionLabel(state: ProfileFriendshipState) {
    if (state === "accepted") {
      return "Friends";
    }

    if (state === "pending_outgoing") {
      return "Pending";
    }

    if (state === "pending_incoming") {
      return "Accepts on add";
    }

    return "Add friend";
  }

  async function handleNotificationAction(
    action: "accept" | "reject",
    targetUserId: string,
  ) {
    const actionKey = `${action}:${targetUserId}`;
    setPendingNotificationActionKey(actionKey);
    setActionError(null);

    try {
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

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            friendshipState?: ProfileFriendshipState;
          }
        | null;

      if (!response.ok || !payload?.friendshipState) {
        throw new Error(payload?.error || "Failed to update friendship.");
      }

      await Promise.all([
        mutateNotifications(),
        mutateFeed(),
        reloadSearchResults(),
      ]);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update friendship.",
      );
    } finally {
      setPendingNotificationActionKey(null);
    }
  }

  async function handleToggleLike(noteId: string) {
    const target = notes.find((note) => note.id === noteId);

    if (!target) {
      return;
    }

    setActionError(null);

    try {
      await mutateFeed(
        async (current) => {
          const response = await fetch(`/api/notes/${noteId}/likes`, {
            method: "POST",
          });

          const payload = (await response.json().catch(() => null)) as
            | {
                error?: string;
                liked?: boolean;
                likeCount?: number;
              }
            | null;

          if (!response.ok) {
            throw new Error(payload?.error || "Failed to update like.");
          }

          if (!current) {
            return current;
          }

          return {
            notes: current.notes.map((note) =>
              note.id === noteId
                ? {
                    ...note,
                    likedByViewer: payload?.liked ?? note.likedByViewer,
                    likeCount: payload?.likeCount ?? note.likeCount,
                  }
                : note,
            ),
          };
        },
        {
          optimisticData: {
            notes: notes.map((note) =>
              note.id === noteId
                ? {
                    ...note,
                    likedByViewer: !note.likedByViewer,
                    likeCount: Math.max(
                      0,
                      note.likeCount + (note.likedByViewer ? -1 : 1),
                    ),
                  }
                : note,
            ),
          },
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update like.",
      );
    }
  }

  async function handleSubmitComment(noteId: string) {
    const trimmed = commentDraft.trim();

    if (!trimmed) {
      return;
    }

    setActionError(null);

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

      setCommentDraft("");

      await mutateComments(
        (current) => ({
          comments: [...(current?.comments ?? []), payload.comment!],
        }),
        { revalidate: false },
      );

      await mutateFeed(
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
      setActionError(
        error instanceof Error ? error.message : "Failed to save comment.",
      );
    }
  }

  return (
    <main className="h-screen overflow-y-auto bg-white px-4 py-8 text-black sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="mt-3 text-[48px] font-bold leading-none">
              Explore
            </h1>
          </div>
          <div className="relative w-full max-w-[420px]">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="friend-search"
                className="text-[13px] font-semibold uppercase tracking-[0.16em] text-black/40"
              >
                Find friends
              </label>
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-black/70"
                onClick={() =>
                  setIsNotificationsOpen((currentOpen) => !currentOpen)
                }
              >
                Inbox
                {unreadFriendshipCount > 0 ? ` · ${unreadFriendshipCount}` : ""}
              </button>
            </div>
            <input
              id="friend-search"
              ref={friendSearchInputRef}
              type="text"
              value={friendQuery}
              onChange={(event) => setFriendQuery(event.target.value)}
              placeholder="Search"
              className="mt-3 w-full rounded-[22px] border border-black/10 bg-white px-4 py-3 text-[15px] text-black outline-none"
              aria-label="Search friends"
            />
            {friendQuery.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-3 rounded-[28px] border border-black/10 bg-[var(--app-card)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
                {friendSearchError ? (
                  <p className="text-[13px] text-[#a11d1d]">{friendSearchError}</p>
                ) : null}
                {isFriendSearching ? (
                  <p className="text-[13px] text-black/45">Searching...</p>
                ) : null}
                {!isFriendSearching && friendResults.length > 0 ? (
                  <div className="space-y-2">
                    {friendResults.map((result) => {
                      const isPending = pendingFriendId === result.id;
                      const isActionDisabled =
                        isPending ||
                        result.friendshipState === "accepted" ||
                        result.friendshipState === "pending_outgoing";

                      return (
                        <div
                          key={result.id}
                          className="flex items-start justify-between gap-3 rounded-[22px] border border-black/10 bg-white p-3"
                        >
                          <Link
                            href={`/${result.email}`}
                            className="min-w-0 text-left"
                          >
                            <div className="truncate text-[15px] font-semibold text-black hover:underline">
                              {result.fullName}
                            </div>
                            <div className="truncate text-[13px] text-black/45">
                              {result.email}
                            </div>
                          </Link>
                          <button
                            type="button"
                            className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] ${
                              isActionDisabled
                                ? "border-black/8 bg-black/8 text-black/40"
                                : "border-black bg-black text-white"
                            }`}
                            disabled={isActionDisabled}
                            onClick={() => void handleAddFriend(result.id)}
                          >
                            {isPending
                              ? "Working"
                              : getFriendActionLabel(result.friendshipState)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {!isFriendSearching &&
                friendResults.length === 0 &&
                !friendSearchError ? (
                  <p className="text-[13px] text-black/45">No people found.</p>
                ) : null}
              </div>
            ) : null}
            {isNotificationsOpen ? (
              <div className="absolute right-0 top-full z-30 mt-3 w-full max-w-[420px] rounded-[28px] border border-black/10 bg-[var(--app-card)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Friendship activity
                </div>
                {incomingRequests.length === 0 && acceptedRequests.length === 0 ? (
                  <p className="mt-3 text-[13px] text-black/45">
                    No friendship updates right now.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {incomingRequests.length > 0 ? (
                      <div className="space-y-3">
                        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
                          Requests
                        </div>
                        {incomingRequests.map((notification) => {
                          const acceptKey = `accept:${notification.user.id}`;
                          const rejectKey = `reject:${notification.user.id}`;
                          const isBusy =
                            pendingNotificationActionKey === acceptKey ||
                            pendingNotificationActionKey === rejectKey;

                          return (
                            <div
                              key={`incoming-${notification.user.id}`}
                              className="rounded-[22px] border border-black/10 bg-white p-3"
                            >
                              <p className="text-[14px] leading-[1.45] text-black/75">
                                <span className="font-semibold text-black">
                                  {notification.user.fullName}
                                </span>{" "}
                                sent you a friend request.
                              </p>
                              <p className="mt-1 text-[12px] text-black/40">
                                {formatAuthoredDate(notification.createdAt)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-full border border-black bg-black px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-55"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleNotificationAction(
                                      "accept",
                                      notification.user.id,
                                    )
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-black/70 disabled:opacity-55"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleNotificationAction(
                                      "reject",
                                      notification.user.id,
                                    )
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {acceptedRequests.length > 0 ? (
                      <div className="space-y-3">
                        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
                          Accepted
                        </div>
                        {acceptedRequests.map((notification) => (
                          <div
                            key={`accepted-${notification.user.id}-${notification.createdAt}`}
                            className="rounded-[22px] border border-black/10 bg-white p-3"
                          >
                            <p className="text-[14px] leading-[1.45] text-black/75">
                              <span className="font-semibold text-black">
                                {notification.user.fullName}
                              </span>{" "}
                              accepted your friend request.
                            </p>
                            <p className="mt-1 text-[12px] text-black/40">
                              {formatAuthoredDate(notification.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* View tabs */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-sm">
          {(["feed", "schools"] as ActiveView[]).map((view, idx) => (
            <button
              key={view}
              type="button"
              onClick={() => { setActiveView(view); setTabKeyboardIndex(idx); setTabFocusLevel("tabs"); }}
              className={`folder-grid-card border px-6 py-6 text-left outline-none focus:outline-none focus-visible:outline-none ${
                activeView === view
                  ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                  : tabFocusLevel === "tabs" && tabKeyboardIndex === idx
                    ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                    : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
              }`}
            >
              <div className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                activeView === view || (tabFocusLevel === "tabs" && tabKeyboardIndex === idx)
                  ? "text-black/55"
                  : "text-black/95"
              }`}>
                {view === "feed" ? "Feed" : "Schools"}
              </div>
              <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em]">
                {view === "feed" ? notes.length : 6322}
              </div>
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-10 rounded-[28px] border border-red-200 bg-red-50 p-6 text-[17px] text-red-700">
            Failed to load explore notes.
          </div>
        ) : null}
        {actionError ? (
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-700">
            {actionError}
          </div>
        ) : null}

        {/* Schools view */}
        {activeView === "schools" ? (
          <div className="mt-8">
            {schoolsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`school-skeleton-${i}`}
                    className="rounded-[28px] border border-black/10 bg-[var(--app-card)] p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-[56px] w-[56px] rounded-[16px] bg-black/8" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 rounded bg-black/8" />
                        <div className="h-3 w-20 rounded bg-black/8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (schoolsData?.schools ?? []).length === 0 ? (
              <div className="rounded-[28px] border border-black/10 bg-[var(--app-card)] px-6 py-8">
                <p className="text-[20px] font-medium text-black/50">
                  No schools yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(schoolsData?.schools ?? []).map((school, idx) => (
                  <SchoolCard
                    key={school.id}
                    ref={(el) => { schoolCardRefs.current[idx] = el; }}
                    school={school}
                    isActive={tabFocusLevel === "items" && activeSchoolIndex === idx}
                    onClick={() => openSchool(school.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Feed view */}
        {activeView === "feed" ? (
          <>
            {isLoading ? (
              <div className="mt-10 grid gap-5 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`explore-skeleton-${index}`}
                    className="rounded-[28px] border border-black/10 bg-[var(--app-card)] p-6"
                  >
                    <div className="h-4 w-28 bg-black/10" />
                    <div className="mt-5 h-8 w-3/4 bg-black/10" />
                    <div className="mt-4 space-y-3">
                      <div className="h-4 bg-black/10" />
                      <div className="h-4 bg-black/10" />
                      <div className="h-4 w-4/5 bg-black/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!isLoading && notes.length === 0 ? (
              <div className="mt-10 rounded-[28px] border border-black/10 bg-[var(--app-card)] p-8">
                <h2 className="text-[26px] font-bold leading-tight">
                  No posts yet
                </h2>
                <p className="mt-3 text-[17px] leading-[1.5] text-black/55">
                  Explore will show public and school posts here once people start sharing.
                </p>
              </div>
            ) : null}

            <div className="mt-10 grid gap-5 lg:grid-cols-12">
              {displayNotes.map((note, index) => {
                const isExpanded = expandedNoteId === note.id;
                const visibleComments =
                  activeCommentsNoteId === note.id ? commentsData?.comments ?? [] : [];
                const isCommentsLoading =
                  activeCommentsNoteId === note.id ? commentsLoading : false;
                const layout = getExploreCardLayout(index);

                return (
                  <article
                    key={note.id}
                    className={`folder-grid-card overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)] p-6 transition-[transform,box-shadow] duration-200 ${layout.articleClass} ${
                      hasArrowSelection && activeCardIndex === index
                        ? "-translate-y-1 shadow-[0_18px_36px_rgba(20,18,17,0.12)]"
                        : "shadow-[0_1px_0_rgba(20,18,17,0.02)]"
                    }`}
                  >
                    <NoteCardStack
                      className="h-full"
                      topBar={
                        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                          <span
                            className={`rounded-full border px-3 py-1 ${getSourceChipClassName(note.sourceType)}`}
                          >
                            {note.sourceLabel}
                          </span>
                        </div>
                      }
                      header={
                        <div className="flex items-center gap-2.5">
                          <Link href={`/${note.owner.email}`} className="shrink-0">
                            <ExploreUserAvatar
                              fullName={note.owner.fullName}
                              profilePhotoUrl={note.owner.profilePhotoUrl}
                              size={32}
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/${note.owner.email}`}
                              className="block truncate text-[14px] font-semibold text-black hover:underline"
                            >
                              {note.owner.fullName}
                            </Link>
                            <div className="mt-1">
                              <ExploreSchoolTag
                                compact
                                schoolLogoUrl={note.owner.schoolLogoUrl}
                                schoolName={note.owner.schoolName}
                                schoolId={note.owner.schoolId}
                                onClick={() => {
                                  if (note.owner.schoolId) {
                                    openSchool(note.owner.schoolId);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      }
                      title={
                        <button
                          type="button"
                          ref={(element) => {
                            cardButtonRefs.current[index] = element;
                          }}
                          className="flex flex-col rounded-[20px] text-left outline-none"
                          onClick={() => setOpenedPostId(note.id)}
                          onFocus={() => setActiveCardIndex(index)}
                        >
                          <p className="text-[12px] text-black/45">
                            {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
                          </p>
                          <div className={`mt-5 font-bold leading-[1.02] ${layout.titleClass}`}>
                            {note.name}
                          </div>
                          <p className="mt-4 text-[18px] leading-[1.6] text-black/72">
                            {getPreviewText(
                              note.content,
                              isExpanded ? 160 : layout.previewLength,
                            ) || "No preview available yet."}
                          </p>
                        </button>
                      }
                      preview={null}
                      footer={
                        <div>
                          <p className="text-[12px] text-black/45">
                            {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className={`rounded-full border px-4 py-2 text-[15px] font-medium transition-transform duration-150 hover:-translate-y-0.5 ${
                                note.likedByViewer
                                  ? "border-black bg-black text-white"
                                  : "border-black/10 bg-white text-black/70"
                              }`}
                              onClick={() => void handleToggleLike(note.id)}
                            >
                              {note.likedByViewer ? "Liked" : "Like"} · {note.likeCount}
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-black/10 bg-white px-4 py-2 text-[15px] font-medium text-black/70 transition-transform duration-150 hover:-translate-y-0.5"
                              onClick={() =>
                                setExpandedNoteId((current) =>
                                  current === note.id ? null : note.id,
                                )
                              }
                            >
                              Comments · {note.commentCount}
                            </button>
                          </div>

                          {isExpanded ? (
                            <div className="mt-6 rounded-[24px] border border-black/10 bg-white p-5">
                              <div className="space-y-4">
                                {visibleComments.map((comment) => (
                                  <div key={comment.id} className="border-b border-black/6 pb-4 last:border-b-0 last:pb-0">
                                    <div className="text-[14px] font-semibold text-black">
                                      {comment.author.fullName}
                                    </div>
                                    <div className="mt-1 text-[13px] text-black/40">
                                      {formatAuthoredDate(comment.createdAt)}
                                    </div>
                                    <p className="mt-2 text-[15px] leading-[1.5] text-black/72">
                                      {comment.body}
                                    </p>
                                  </div>
                                ))}
                                {!isCommentsLoading && visibleComments.length === 0 ? (
                                  <p className="text-[15px] text-black/45">
                                    No comments yet.
                                  </p>
                                ) : null}
                                {isCommentsLoading ? (
                                  <p className="text-[15px] text-black/45">
                                    Loading comments...
                                  </p>
                                ) : null}
                              </div>

                              <div className="mt-5 flex flex-col gap-3">
                                <textarea
                                  value={commentDraft}
                                  onChange={(event) => setCommentDraft(event.target.value)}
                                  rows={3}
                                  maxLength={600}
                                  className="w-full rounded-[20px] border border-black/10 bg-[var(--app-card)] px-4 py-3 text-[15px] text-black outline-none"
                                  placeholder="Add a comment..."
                                />
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[13px] text-black/35">
                                    {commentDraft.trim().length}/600
                                  </span>
                                  <button
                                    type="button"
                                    className="rounded-full border border-black bg-black px-4 py-2 text-[14px] font-medium text-white"
                                    onClick={() => void handleSubmitComment(note.id)}
                                  >
                                    Post comment
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      }
                    />
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <PostViewerModal
        note={openedPost}
        topMeta={
          openedPost ? (
            <span
              className={`rounded-full border px-3 py-1 ${getSourceChipClassName(openedPost.sourceType)}`}
            >
              {openedPost.sourceLabel}
            </span>
          ) : null
        }
        actions={
          <button
            type="button"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-[14px] font-medium text-black/70"
            onClick={() => setOpenedPostId(null)}
          >
            Close
          </button>
        }
        owner={
          openedPost ? (
            <div className="flex items-center gap-3">
              <Link href={`/${openedPost.owner.email}`} onClick={() => setOpenedPostId(null)}>
                <ExploreUserAvatar
                  fullName={openedPost.owner.fullName}
                  profilePhotoUrl={openedPost.owner.profilePhotoUrl}
                  size={40}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${openedPost.owner.email}`}
                  className="truncate text-[15px] font-semibold text-black hover:underline"
                  onClick={() => setOpenedPostId(null)}
                >
                  {openedPost.owner.fullName}
                </Link>
                <div className="mt-1">
                  <ExploreSchoolTag
                    compact
                    schoolLogoUrl={openedPost.owner.schoolLogoUrl}
                    schoolName={openedPost.owner.schoolName}
                    schoolId={openedPost.owner.schoolId}
                    onClick={() => {
                      if (openedPost.owner.schoolId) {
                        setOpenedPostId(null);
                        openSchool(openedPost.owner.schoolId);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null
        }
        footer={
          <>
            <div className="flex flex-wrap items-center gap-3">
              {openedPost ? (
                <button
                  type="button"
                  className={`rounded-full border px-4 py-2 text-[15px] font-medium transition-transform duration-150 hover:-translate-y-0.5 ${
                    openedPost.likedByViewer
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white text-black/70"
                  }`}
                  onClick={() => void handleToggleLike(openedPost.id)}
                >
                  {openedPost.likedByViewer ? "Liked" : "Like"} ·{" "}
                  {openedPost.likeCount}
                </button>
              ) : null}
              <span className="text-[15px] text-black/55">
                Comments · {commentsData?.comments?.length ?? openedPost?.commentCount ?? 0}
              </span>
            </div>

            <div className="mt-8 space-y-4">
              {(commentsData?.comments ?? []).map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-black/6 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="text-[14px] font-semibold text-black">
                    {comment.author.fullName}
                  </div>
                  <div className="mt-1 text-[13px] text-black/40">
                    {formatAuthoredDate(comment.createdAt)}
                  </div>
                  <p className="mt-2 text-[15px] leading-[1.5] text-black/72">
                    {comment.body}
                  </p>
                </div>
              ))}
              {commentsLoading ? (
                <p className="text-[15px] text-black/45">Loading comments...</p>
              ) : null}
              {!commentsLoading &&
              (commentsData?.comments?.length ?? 0) === 0 ? (
                <p className="text-[15px] text-black/45">No comments yet.</p>
              ) : null}
            </div>

            {openedPost ? (
              <div className="mt-8 flex flex-col gap-3">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={3}
                  maxLength={600}
                  className="w-full rounded-[20px] border border-black/10 bg-[var(--app-card)] px-4 py-3 text-[15px] text-black outline-none"
                  placeholder="Add a comment..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-black/35">
                    {commentDraft.trim().length}/600
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-black bg-black px-4 py-2 text-[14px] font-medium text-white"
                    onClick={() => void handleSubmitComment(openedPost.id)}
                  >
                    Post comment
                  </button>
                </div>
              </div>
            ) : null}
          </>
        }
      />

    </main>
  );
}
