"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  type ExploreCommentRecord,
  type ExploreNoteCard,
} from "@/lib/explore";
import { swrFetcher } from "@/lib/swr-fetcher";
import { formatAuthoredDate, getPreviewText } from "@/lib/text-utils";
import type { ProfileFriendshipState } from "@/lib/profile-data";

const EMPTY_NOTES: ExploreNoteCard[] = [];

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
}: {
  compact?: boolean;
  schoolLogoUrl: string | null;
  schoolName: string | null;
}) {
  if (!schoolName) {
    return null;
  }

  return (
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
}

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
}: {
  isShellOverlayOpen?: boolean;
}) {
  const cardButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [hasArrowSelection, setHasArrowSelection] = useState(false);
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

  useEffect(() => {
    setActiveCardIndex((currentIndex) =>
      Math.max(0, Math.min(displayNotes.length - 1, currentIndex)),
    );
  }, [displayNotes.length]);

  useEffect(() => {
    if (
      isShellOverlayOpen ||
      !hasArrowSelection ||
      openedPostId ||
      displayNotes.length === 0
    ) {
      return;
    }

    const activeCard = cardButtonRefs.current[activeCardIndex];

    if (!activeCard) {
      return;
    }

    activeCard.focus({ preventScroll: true });
    activeCard.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
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
      if (event.key !== "Escape") {
        return;
      }

      if (isShellOverlayOpen) {
        return;
      }

      if (openedPostId) {
        event.preventDefault();
        event.stopPropagation();
        setOpenedPostId(null);
        return;
      }

      if (isNotificationsOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsNotificationsOpen(false);
        return;
      }

      if (expandedNoteId) {
        event.preventDefault();
        event.stopPropagation();
        setExpandedNoteId(null);
        return;
      }

      if (hasArrowSelection) {
        event.preventDefault();
        event.stopPropagation();
        setHasArrowSelection(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    expandedNoteId,
    hasArrowSelection,
    isNotificationsOpen,
    isShellOverlayOpen,
    openedPostId,
  ]);

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
        displayNotes.length === 0 ||
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

      if (event.key === "Enter") {
        event.preventDefault();
        const activeNote = displayNotes[activeCardIndex];

        if (activeNote) {
          setOpenedPostId(activeNote.id);
        }

        return;
      }

      const currentCard = cardButtonRefs.current[activeCardIndex];

      if (!currentCard) {
        return;
      }

      const currentRect = currentCard.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;
      const currentHeight = currentRect.height;
      const currentWidth = currentRect.width;

      let nextIndex = activeCardIndex;
      let bestPrimaryDistance = Number.POSITIVE_INFINITY;
      let bestSecondaryDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < displayNotes.length; index += 1) {
        if (index === activeCardIndex) {
          continue;
        }

        const candidateCard = cardButtonRefs.current[index];

        if (!candidateCard) {
          continue;
        }

        const candidateRect = candidateCard.getBoundingClientRect();
        const candidateCenterX = candidateRect.left + candidateRect.width / 2;
        const candidateCenterY = candidateRect.top + candidateRect.height / 2;
        const deltaX = candidateCenterX - currentCenterX;
        const deltaY = candidateCenterY - currentCenterY;

        let primaryDistance = Number.POSITIVE_INFINITY;
        let secondaryDistance = Number.POSITIVE_INFINITY;

        if (event.key === "ArrowLeft" && deltaX < -8) {
          primaryDistance = Math.abs(deltaX);
          secondaryDistance = Math.abs(deltaY);
        }

        if (event.key === "ArrowRight" && deltaX > 8) {
          primaryDistance = Math.abs(deltaX);
          secondaryDistance = Math.abs(deltaY);
        }

        if (event.key === "ArrowUp" && deltaY < -8) {
          primaryDistance = Math.abs(deltaY);
          secondaryDistance = Math.abs(deltaX);
        }

        if (event.key === "ArrowDown" && deltaY > 8) {
          primaryDistance = Math.abs(deltaY);
          secondaryDistance = Math.abs(deltaX);
        }

        if (!Number.isFinite(primaryDistance)) {
          continue;
        }

        const isHorizontalMove =
          event.key === "ArrowLeft" || event.key === "ArrowRight";
        const alignmentLimit = isHorizontalMove
          ? Math.max(72, currentHeight * 0.7)
          : Math.max(96, currentWidth * 0.8);
        const penalizedPrimary = secondaryDistance > alignmentLimit
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
      }

      if (nextIndex !== activeCardIndex) {
        event.preventDefault();
        setHasArrowSelection(true);
        setActiveCardIndex(nextIndex);
        return;
      }

      if (
        event.key !== "Enter" &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
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
    openedPostId,
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
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold text-black">
                              {result.fullName}
                            </div>
                            <div className="truncate text-[13px] text-black/45">
                              {result.email}
                            </div>
                          </div>
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
                className={`overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)] p-6 transition-[transform,box-shadow] duration-200 ${layout.articleClass} ${
                  hasArrowSelection && activeCardIndex === index
                    ? "-translate-y-1 shadow-[0_18px_36px_rgba(20,18,17,0.12)]"
                    : "shadow-[0_1px_0_rgba(20,18,17,0.02)]"
                }`}
              >
                <div className="flex h-full flex-col">
                  <button
                    type="button"
                    ref={(element) => {
                      cardButtonRefs.current[index] = element;
                    }}
                    className="flex flex-1 flex-col rounded-[20px] text-left outline-none"
                    onClick={() => setOpenedPostId(note.id)}
                    onFocus={() => setActiveCardIndex(index)}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                      <span
                        className={`rounded-full border px-3 py-1 ${getSourceChipClassName(note.sourceType)}`}
                      >
                        {note.sourceLabel}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-2.5">
                      <ExploreUserAvatar
                        fullName={note.owner.fullName}
                        profilePhotoUrl={note.owner.profilePhotoUrl}
                        size={32}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-black">
                          {note.owner.fullName}
                        </p>
                        <div className="mt-1">
                          <ExploreSchoolTag
                            compact
                            schoolLogoUrl={note.owner.schoolLogoUrl}
                            schoolName={note.owner.schoolName}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-black/45">
                      {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
                    </p>

                    <div className={`mt-5 font-bold leading-[1.02] ${layout.titleClass}`}>
                      {note.name}
                    </div>
                    <p className="mt-5 text-[18px] leading-[1.6] text-black/72">
                      {getPreviewText(
                        note.content,
                        isExpanded ? 160 : layout.previewLength,
                      ) || "No preview available yet."}
                    </p>
                  </button>

                  <div className="mt-auto pt-6">
                    <div className="flex flex-wrap items-center gap-3">
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
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {openedPost ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-6 py-8">
          <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                <span
                  className={`rounded-full border px-3 py-1 ${getSourceChipClassName(openedPost.sourceType)}`}
                >
                  {openedPost.sourceLabel}
                </span>
              </div>
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-[14px] font-medium text-black/70"
                onClick={() => setOpenedPostId(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <ExploreUserAvatar
                fullName={openedPost.owner.fullName}
                profilePhotoUrl={openedPost.owner.profilePhotoUrl}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-black">
                  {openedPost.owner.fullName}
                </p>
                <div className="mt-1">
                  <ExploreSchoolTag
                    compact
                    schoolLogoUrl={openedPost.owner.schoolLogoUrl}
                    schoolName={openedPost.owner.schoolName}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-black/45">
              {formatAuthoredDate(
                openedPost.publishedAt ?? openedPost.createdAt,
              )}
            </p>

            <h2 className="mt-6 max-w-4xl text-[38px] font-bold leading-[1.02] text-black">
              {openedPost.name}
            </h2>

            <div
              className="prose prose-lg mt-8 max-w-none text-black"
              dangerouslySetInnerHTML={{ __html: openedPost.content }}
            />

            <div className="mt-10 border-t border-black/10 pt-8">
              <div className="flex flex-wrap items-center gap-3">
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
                <span className="text-[15px] text-black/55">
                  Comments ·{" "}
                  {commentsData?.comments?.length ?? openedPost.commentCount}
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
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
