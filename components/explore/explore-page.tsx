"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, startTransition } from "react";
import useSWR from "swr";
import {
  EXPLORE_FEEDS,
  type ExploreCommentRecord,
  type ExploreFeedId,
  type ExploreNoteCard,
} from "@/lib/explore";
import { swrFetcher } from "@/lib/swr-fetcher";
import { formatAuthoredDate, getPreviewText } from "@/lib/text-utils";
import { NOTE_VISIBILITY_LABELS } from "@/lib/note-visibility";
import type { ProfileFriendshipState } from "@/lib/profile-data";

const EMPTY_NOTES: ExploreNoteCard[] = [];

type FriendshipSearchResult = {
  email: string;
  fullName: string;
  friendshipState: ProfileFriendshipState;
  id: string;
  profilePhotoUrl: string | null;
};

const FEED_COPY: Record<
  ExploreFeedId,
  { title: string; description: string; empty: string }
> = {
  friends: {
    title: "Friends",
    description: "Published notes from accepted friends.",
    empty: "No friend activity yet.",
  },
  school: {
    title: "School",
    description: "Notes people at your school chose to share.",
    empty: "Nothing has been shared in your school feed yet.",
  },
  public: {
    title: "Public",
    description: "Shared notes from across the app.",
    empty: "No public notes yet.",
  },
};

export default function ExplorePage() {
  const [activeFeed, setActiveFeed] = useState<ExploreFeedId>("school");
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState<FriendshipSearchResult[]>(
    [],
  );
  const [friendSearchError, setFriendSearchError] = useState<string | null>(
    null,
  );
  const [isFriendSearching, setIsFriendSearching] = useState(false);
  const [pendingFriendId, setPendingFriendId] = useState<string | null>(null);
  const feedKey = `/api/explore?feed=${activeFeed}`;
  const {
    data,
    error,
    isLoading,
    mutate: mutateFeed,
  } = useSWR<{ notes: ExploreNoteCard[] }>(feedKey, swrFetcher);
  const notes = useMemo(() => data?.notes ?? EMPTY_NOTES, [data]);
  const {
    data: commentsData,
    isLoading: commentsLoading,
    mutate: mutateComments,
  } = useSWR<{ comments: ExploreCommentRecord[] }>(
    expandedNoteId ? `/api/notes/${expandedNoteId}/comments` : null,
    swrFetcher,
  );

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
    <main className="min-h-screen bg-white px-6 py-8 text-black">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[14px] font-medium uppercase tracking-[0.18em] text-black/40">
              Explore
            </p>
            <h1 className="mt-3 text-[48px] font-bold leading-none">
              Notes worth opening
            </h1>
            <p className="mt-4 max-w-2xl text-[18px] leading-[1.5] text-black/60">
              Switch between friend activity, your school, and the wider public
              feed. Likes and comments only appear on notes that were explicitly
              shared.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-[var(--app-card)] px-5 py-3 text-[15px] font-medium text-black transition-transform duration-150 hover:-translate-y-0.5"
          >
            Back home
          </Link>
        </div>

        <div className="mt-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-wrap gap-3">
            {EXPLORE_FEEDS.map((feed) => {
              const isActive = feed === activeFeed;

              return (
                <button
                  key={feed}
                  type="button"
                  className={`rounded-full px-5 py-3 text-left transition-all duration-150 ${
                    isActive
                      ? "bg-black text-white"
                      : "border border-black/10 bg-[var(--app-card)] text-black/70"
                  }`}
                  onClick={() =>
                    startTransition(() => {
                      setActiveFeed(feed);
                      setExpandedNoteId(null);
                      setCommentDraft("");
                    })
                  }
                >
                  <div className="text-[15px] font-semibold">
                    {FEED_COPY[feed].title}
                  </div>
                  <div
                    className={`mt-1 text-[13px] ${
                      isActive ? "text-white/70" : "text-black/45"
                    }`}
                  >
                    {FEED_COPY[feed].description}
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="rounded-[28px] border border-black/10 bg-[var(--app-card)] p-5">
            <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-black/40">
              Find friends
            </div>
            <p className="mt-2 text-[15px] leading-[1.5] text-black/55">
              Search people by name or email and add them to your friends feed.
            </p>
            <input
              type="text"
              value={friendQuery}
              onChange={(event) => setFriendQuery(event.target.value)}
              placeholder="Search friends"
              className="mt-4 w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-[15px] text-black outline-none"
              aria-label="Search friends"
            />
            {friendSearchError ? (
              <p className="mt-3 text-[13px] text-[#a11d1d]">
                {friendSearchError}
              </p>
            ) : null}
            {isFriendSearching ? (
              <p className="mt-3 text-[13px] text-black/45">Searching...</p>
            ) : null}
            <div className="mt-4 space-y-3">
              {friendResults.map((result) => {
                const isPending = pendingFriendId === result.id;
                const isActionDisabled =
                  isPending ||
                  result.friendshipState === "accepted" ||
                  result.friendshipState === "pending_outgoing";

                return (
                  <div
                    key={result.id}
                    className="rounded-[20px] border border-black/10 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
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
                        className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] ${
                          isActionDisabled
                            ? "bg-black/8 text-black/40"
                            : "bg-black text-white"
                        }`}
                        disabled={isActionDisabled}
                        onClick={() => void handleAddFriend(result.id)}
                      >
                        {isPending
                          ? "Working"
                          : getFriendActionLabel(result.friendshipState)}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!isFriendSearching &&
              friendQuery.trim().length >= 2 &&
              friendResults.length === 0 &&
              !friendSearchError ? (
                <p className="text-[13px] text-black/45">No people found.</p>
              ) : null}
            </div>
          </aside>
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
                className="rounded-[32px] border border-black/10 bg-[var(--app-card)] p-6"
              >
                <div className="h-4 w-28 rounded-full bg-black/10" />
                <div className="mt-5 h-8 w-3/4 rounded-full bg-black/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 rounded-full bg-black/10" />
                  <div className="h-4 rounded-full bg-black/10" />
                  <div className="h-4 w-4/5 rounded-full bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && notes.length === 0 ? (
          <div className="mt-10 rounded-[32px] border border-black/10 bg-[var(--app-card)] p-8">
            <h2 className="text-[26px] font-bold leading-tight">
              {FEED_COPY[activeFeed].title} feed is quiet
            </h2>
            <p className="mt-3 text-[17px] leading-[1.5] text-black/55">
              {FEED_COPY[activeFeed].empty}
            </p>
          </div>
        ) : null}

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {notes.map((note) => {
            const isExpanded = expandedNoteId === note.id;

            return (
              <article
                key={note.id}
                className="rounded-[32px] border border-black/10 bg-[var(--app-card)] p-6"
              >
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  <span
                    className={`rounded-full px-3 py-1 ${
                      note.visibility === "PUBLIC"
                        ? "bg-black text-white"
                        : "bg-black/10 text-black/75"
                    }`}
                  >
                    {NOTE_VISIBILITY_LABELS[note.visibility]}
                  </span>
                  <span>{formatAuthoredDate(note.publishedAt ?? note.createdAt)}</span>
                  {note.owner.schoolName ? <span>{note.owner.schoolName}</span> : null}
                </div>

                <h2 className="mt-4 text-[32px] font-bold leading-[1.05]">
                  {note.name}
                </h2>
                <p className="mt-2 text-[16px] font-medium text-black/45">
                  {note.owner.fullName}
                </p>
                <p className="mt-5 text-[18px] leading-[1.6] text-black/72">
                  {getPreviewText(note.content, isExpanded ? 120 : 48) || "No preview available yet."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-[15px] font-medium transition-transform duration-150 hover:-translate-y-0.5 ${
                      note.likedByViewer
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white text-black/70"
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
                      {(commentsData?.comments ?? []).map((comment) => (
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
                      {!commentsLoading &&
                      (commentsData?.comments?.length ?? 0) === 0 ? (
                        <p className="text-[15px] text-black/45">
                          No comments yet.
                        </p>
                      ) : null}
                      {commentsLoading ? (
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
                          className="rounded-full bg-black px-4 py-2 text-[14px] font-medium text-white"
                          onClick={() => void handleSubmitComment(note.id)}
                        >
                          Post comment
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
