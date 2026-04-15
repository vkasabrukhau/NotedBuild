"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  type ExploreCommentRecord,
  type ExploreNoteCard,
} from "@/lib/explore";
import { swrFetcher } from "@/lib/swr-fetcher";
import { formatAuthoredDate, getPreviewText } from "@/lib/text-utils";
import type { ProfileFriendshipState } from "@/lib/profile-data";

const EMPTY_NOTES: ExploreNoteCard[] = [];
const DEMO_NOTE_ID_PREFIX = "demo-explore-note-";

const DEMO_NOTE_SEEDS = [
  {
    name: "Math final cheat sheet that is actually understandable",
    content:
      "<p>I turned my last three review sessions into one page: derivative rules, trig identities, and the two substitution patterns I always forget. If anyone wants it cleaned up into a study guide, I can post version two tonight.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "friends" as const,
    sourceLabel: "From friends",
    publishedAt: "2026-04-15T11:40:00.000Z",
    likeCount: 12,
    likedByViewer: false,
    owner: {
      id: "demo-owner-1",
      email: "maya@noted.demo",
      fullName: "Maya Chen",
      profilePhotoUrl: null,
      schoolName: "Columbia University",
    },
  },
  {
    name: "Organic chemistry reaction ladder for midterm week",
    content:
      "<p>I made a condensed reaction map for substitution, elimination, oxidation, and reduction. The full note has color-coded mistakes I kept making on old problem sets.</p>",
    visibility: "SCHOOL" as const,
    sourceType: "school" as const,
    sourceLabel: "From your school",
    publishedAt: "2026-04-15T10:05:00.000Z",
    likeCount: 8,
    likedByViewer: true,
    owner: {
      id: "demo-owner-2",
      email: "leo@noted.demo",
      fullName: "Leo Martinez",
      profilePhotoUrl: null,
      schoolName: "Columbia University",
    },
  },
  {
    name: "CS interview note on trees that finally clicked for me",
    content:
      "<p>Binary trees stopped being abstract once I rewrote every traversal with one sentence each. Preorder is visit before branching, inorder is left-root-right, postorder is clean up on the way back.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "trending" as const,
    sourceLabel: "Trending now",
    publishedAt: "2026-04-15T09:15:00.000Z",
    likeCount: 21,
    likedByViewer: false,
    owner: {
      id: "demo-owner-3",
      email: "nina@noted.demo",
      fullName: "Nina Kapoor",
      profilePhotoUrl: null,
      schoolName: "NYU",
    },
  },
  {
    name: "Constitutional law cases grouped by what they actually changed",
    content:
      "<p>Instead of memorizing case names in isolation, I grouped them into privacy, speech, equal protection, and federal power. The note reads more like a timeline than a casebook.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "public" as const,
    sourceLabel: "Public post",
    publishedAt: "2026-04-14T20:30:00.000Z",
    likeCount: 5,
    likedByViewer: false,
    owner: {
      id: "demo-owner-4",
      email: "sara@noted.demo",
      fullName: "Sara Williams",
      profilePhotoUrl: null,
      schoolName: "Georgetown",
    },
  },
  {
    name: "Spanish vocab note built from phrases instead of word lists",
    content:
      "<p>I started storing words only inside sentences I would actually say. Retention got much better, and it stopped feeling like a stack of disconnected flashcards.</p>",
    visibility: "SCHOOL" as const,
    sourceType: "school" as const,
    sourceLabel: "From your school",
    publishedAt: "2026-04-14T18:10:00.000Z",
    likeCount: 7,
    likedByViewer: false,
    owner: {
      id: "demo-owner-5",
      email: "elena@noted.demo",
      fullName: "Elena Ruiz",
      profilePhotoUrl: null,
      schoolName: "Columbia University",
    },
  },
  {
    name: "Game theory examples from class rewritten in plain English",
    content:
      "<p>Nash equilibrium felt obvious once I stopped writing it like a theorem and started describing what each player would regret changing after the fact.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "friends" as const,
    sourceLabel: "From friends",
    publishedAt: "2026-04-14T16:25:00.000Z",
    likeCount: 14,
    likedByViewer: true,
    owner: {
      id: "demo-owner-6",
      email: "omar@noted.demo",
      fullName: "Omar Hassan",
      profilePhotoUrl: null,
      schoolName: "Princeton",
    },
  },
  {
    name: "Microeconomics diagrams with the labels people always skip",
    content:
      "<p>I annotated every graph with the exact shift trigger, the equilibrium change, and the one sentence interpretation professors usually ask for under time pressure.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "trending" as const,
    sourceLabel: "Trending now",
    publishedAt: "2026-04-14T15:40:00.000Z",
    likeCount: 18,
    likedByViewer: false,
    owner: {
      id: "demo-owner-7",
      email: "ivy@noted.demo",
      fullName: "Ivy Park",
      profilePhotoUrl: null,
      schoolName: "UChicago",
    },
  },
  {
    name: "Physics lab checklist so I stop losing points on formatting",
    content:
      "<p>This note has nothing glamorous in it, just the exact order for uncertainty, units, sig figs, and graph captions. It saved me twice already.</p>",
    visibility: "SCHOOL" as const,
    sourceType: "school" as const,
    sourceLabel: "From your school",
    publishedAt: "2026-04-14T13:55:00.000Z",
    likeCount: 4,
    likedByViewer: false,
    owner: {
      id: "demo-owner-8",
      email: "jules@noted.demo",
      fullName: "Jules Carter",
      profilePhotoUrl: null,
      schoolName: "Columbia University",
    },
  },
  {
    name: "European history essay structure that keeps my arguments coherent",
    content:
      "<p>I built a repeatable outline: claim, tension, evidence, historiography, and why the evidence matters. It made my last paper easier to draft and revise.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "public" as const,
    sourceLabel: "Public post",
    publishedAt: "2026-04-14T12:20:00.000Z",
    likeCount: 6,
    likedByViewer: false,
    owner: {
      id: "demo-owner-9",
      email: "claire@noted.demo",
      fullName: "Claire Dubois",
      profilePhotoUrl: null,
      schoolName: "Brown",
    },
  },
  {
    name: "Linear algebra summary for eigenvalues without the textbook fog",
    content:
      "<p>The note boils the chapter down to transformations, stretch directions, and why diagonalization matters for repeated matrix multiplication.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "friends" as const,
    sourceLabel: "From friends",
    publishedAt: "2026-04-14T09:45:00.000Z",
    likeCount: 11,
    likedByViewer: false,
    owner: {
      id: "demo-owner-10",
      email: "ethan@noted.demo",
      fullName: "Ethan Brooks",
      profilePhotoUrl: null,
      schoolName: "Penn",
    },
  },
  {
    name: "Quick accounting sheet for debits, credits, and common mistakes",
    content:
      "<p>I wrote this for friends in intro accounting who kept mixing up what increases assets versus liabilities. The examples are short and painfully direct.</p>",
    visibility: "PUBLIC" as const,
    sourceType: "trending" as const,
    sourceLabel: "Trending now",
    publishedAt: "2026-04-13T22:00:00.000Z",
    likeCount: 16,
    likedByViewer: true,
    owner: {
      id: "demo-owner-11",
      email: "rachael@noted.demo",
      fullName: "Rachael Kim",
      profilePhotoUrl: null,
      schoolName: "Michigan",
    },
  },
];

const INITIAL_DEMO_COMMENTS_BY_NOTE: Record<string, ExploreCommentRecord[]> = {
  [`${DEMO_NOTE_ID_PREFIX}1`]: [
    {
      id: "demo-comment-1",
      body: "This is exactly the kind of post I would open from the feed.",
      createdAt: new Date("2026-04-15T12:15:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-15T12:15:00.000Z").toISOString(),
      author: {
        id: "demo-friend-1",
        email: "maya@noted.demo",
        fullName: "Maya Chen",
        profilePhotoUrl: null,
      },
    },
  ],
  [`${DEMO_NOTE_ID_PREFIX}3`]: [
    {
      id: "demo-comment-2",
      body: "The traversal sentence trick is weirdly effective.",
      createdAt: new Date("2026-04-15T11:05:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-15T11:05:00.000Z").toISOString(),
      author: {
        id: "demo-friend-2",
        email: "alex@noted.demo",
        fullName: "Alex Rivera",
        profilePhotoUrl: null,
      },
    },
  ],
};

function isDemoNoteId(noteId: string) {
  return noteId.startsWith(DEMO_NOTE_ID_PREFIX);
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getCompactSourceLabel(sourceType: ExploreNoteCard["sourceType"]) {
  if (sourceType === "friends") {
    return "Friends";
  }

  if (sourceType === "school") {
    return "School";
  }

  if (sourceType === "trending") {
    return "Trending";
  }

  return "Public";
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
  schoolLogoUrl,
  schoolName,
}: {
  schoolLogoUrl: string | null;
  schoolName: string | null;
}) {
  if (!schoolName) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 shadow-sm">
      {schoolLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={schoolLogoUrl}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <span className="text-[10px] font-bold text-black/55">
          {getInitials(schoolName).slice(0, 2)}
        </span>
      )}
      <span className="max-w-[160px] truncate text-[11px] font-medium text-black/65">
        {schoolName}
      </span>
    </span>
  );
}

function createInitialDemoNotes(): ExploreNoteCard[] {
  return DEMO_NOTE_SEEDS.map((seed, index) => {
    const id = `${DEMO_NOTE_ID_PREFIX}${index + 1}`;
    const comments = INITIAL_DEMO_COMMENTS_BY_NOTE[id] ?? [];

    return {
      id,
      name: seed.name,
      content: seed.content,
      visibility: seed.visibility,
      createdAt: seed.publishedAt,
      updatedAt: seed.publishedAt,
      publishedAt: seed.publishedAt,
      likeCount: seed.likeCount,
      commentCount: comments.length,
      likedByViewer: seed.likedByViewer,
      sourceType: seed.sourceType,
      sourceLabel: getCompactSourceLabel(seed.sourceType),
      score: 999 - index,
      owner: {
        ...seed.owner,
        schoolLogoUrl: null,
      },
    };
  });
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

export default function ExplorePage() {
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [pendingNotificationActionKey, setPendingNotificationActionKey] =
    useState<string | null>(null);
  const [demoNotes, setDemoNotes] = useState<ExploreNoteCard[]>(
    createInitialDemoNotes,
  );
  const [demoCommentsByNote, setDemoCommentsByNote] = useState<
    Record<string, ExploreCommentRecord[]>
  >(INITIAL_DEMO_COMMENTS_BY_NOTE);
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
    (openedPostId ?? expandedNoteId) &&
      !isDemoNoteId(openedPostId ?? expandedNoteId ?? "")
      ? `/api/notes/${openedPostId ?? expandedNoteId}/comments`
      : null,
    swrFetcher,
  );
  const shouldShowDemoNote = !isLoading && !error && notes.length === 0;
  const displayNotes = useMemo<ExploreNoteCard[]>(
    () => (shouldShowDemoNote ? demoNotes : notes),
    [demoNotes, notes, shouldShowDemoNote],
  );
  const openedPost = useMemo(
    () => displayNotes.find((note) => note.id === openedPostId) ?? null,
    [displayNotes, openedPostId],
  );
  const activeCommentsNoteId = openedPostId ?? expandedNoteId;
  const incomingRequests = notificationsData?.incomingRequests ?? [];

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
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [expandedNoteId, isNotificationsOpen, openedPostId]);

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
    if (isDemoNoteId(noteId)) {
      setActionError(null);
      setDemoNotes((currentNotes) =>
        currentNotes.map((note) =>
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
      );
      return;
    }

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

    if (isDemoNoteId(noteId)) {
      const nextComment: ExploreCommentRecord = {
        id: `demo-comment-${Date.now()}`,
        body: trimmed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: {
          id: "demo-viewer",
          email: "you@noted.demo",
          fullName: "You",
          profilePhotoUrl: null,
        },
      };
      setDemoCommentsByNote((currentComments) => {
        const existingComments = currentComments[noteId] ?? [];

        return {
          ...currentComments,
          [noteId]: [...existingComments, nextComment],
        };
      });
      setDemoNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                commentCount: note.commentCount + 1,
              }
            : note,
        ),
      );
      setCommentDraft("");
      return;
    }

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
                {incomingRequests.length > 0 ? ` · ${incomingRequests.length}` : ""}
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
                {incomingRequests.length === 0 ? (
                  <p className="mt-3 text-[13px] text-black/45">
                    No incoming friend requests right now.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
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
              No live posts yet, so here are some demo cards
            </h2>
            <p className="mt-3 text-[17px] leading-[1.5] text-black/55">
              Likes and comments on the sample posts work locally so you can
              preview how Explore will feel before real posts start showing up.
            </p>
          </div>
        ) : null}

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          {displayNotes.map((note, index) => {
            const isExpanded = expandedNoteId === note.id;
            const isDemoNote = isDemoNoteId(note.id);
            const visibleComments = isDemoNote
              ? demoCommentsByNote[note.id] ?? []
              : activeCommentsNoteId === note.id
                ? commentsData?.comments ?? []
                : [];
            const isCommentsLoading = isDemoNote
              ? false
              : activeCommentsNoteId === note.id
                ? commentsLoading
                : false;
            const layout = getExploreCardLayout(index);

            return (
              <article
                key={note.id}
                className={`overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)] p-6 ${layout.articleClass}`}
              >
                <div className="flex h-full flex-col">
                  <button
                    type="button"
                    className="flex flex-1 flex-col text-left"
                    onClick={() => setOpenedPostId(note.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
                      <span
                        className={`rounded-full border px-3 py-1 ${getSourceChipClassName(note.sourceType)}`}
                      >
                        {note.sourceLabel}
                      </span>
                      <ExploreSchoolTag
                        schoolLogoUrl={note.owner.schoolLogoUrl}
                        schoolName={note.owner.schoolName}
                      />
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <ExploreUserAvatar
                        fullName={note.owner.fullName}
                        profilePhotoUrl={note.owner.profilePhotoUrl}
                        size={48}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-black">
                          {note.owner.fullName}
                        </p>
                        <p className="mt-1 text-[13px] text-black/45">
                          {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
                        </p>
                      </div>
                    </div>

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
                <ExploreSchoolTag
                  schoolLogoUrl={openedPost.owner.schoolLogoUrl}
                  schoolName={openedPost.owner.schoolName}
                />
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
                size={56}
              />
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold text-black">
                  {openedPost.owner.fullName}
                </p>
                <p className="mt-1 text-[14px] text-black/45">
                  {formatAuthoredDate(
                    openedPost.publishedAt ?? openedPost.createdAt,
                  )}
                </p>
              </div>
            </div>

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
                  {isDemoNoteId(openedPost.id)
                    ? demoCommentsByNote[openedPost.id]?.length ?? 0
                    : commentsData?.comments?.length ?? openedPost.commentCount}
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {(isDemoNoteId(openedPost.id)
                  ? demoCommentsByNote[openedPost.id] ?? []
                  : commentsData?.comments ?? []
                ).map((comment) => (
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
                {!isDemoNoteId(openedPost.id) && commentsLoading ? (
                  <p className="text-[15px] text-black/45">Loading comments...</p>
                ) : null}
                {(isDemoNoteId(openedPost.id)
                  ? (demoCommentsByNote[openedPost.id]?.length ?? 0) === 0
                  : !commentsLoading &&
                    (commentsData?.comments?.length ?? 0) === 0) ? (
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
