"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { formatAuthoredDate, getPreviewText } from "@/lib/text-utils";
import type { ExploreNoteCard, ExploreCommentRecord } from "@/lib/explore";
import { swrFetcher } from "@/lib/swr-fetcher";
import PixelatedSchoolLogo from "@/components/profile/pixelated-school-logo";

type SchoolData = {
  id: string;
  name: string;
  location: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
};

type StudentData = {
  id: string;
  email: string;
  fullName: string;
  profilePhotoUrl: string | null;
  schoolId: string | null;
};

type SchoolProfileViewProps = {
  school: SchoolData;
  students: StudentData[];
  notes: ExploreNoteCard[];
};

type SchoolTab = "students" | "notes";
type FocusLevel = "tabs" | "items";

const TABS: SchoolTab[] = ["students", "notes"];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function UserAvatar({
  fullName,
  profilePhotoUrl,
  size,
}: {
  fullName: string;
  profilePhotoUrl: string | null;
  size: number;
}) {
  const radius = size >= 48 ? "rounded-[18px]" : "rounded-[16px]";

  if (profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePhotoUrl}
        alt={fullName}
        width={size}
        height={size}
        className={`${radius} border border-black/8 object-cover shadow-[0_10px_24px_rgba(20,18,17,0.08)]`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex ${radius} items-center justify-center border border-black/8 bg-black text-white shadow-[0_10px_24px_rgba(20,18,17,0.08)]`}
      style={{ width: size, height: size }}
    >
      <span className={`${size >= 48 ? "text-sm" : "text-[11px]"} font-bold uppercase tracking-[0.08em]`}>
        {getInitials(fullName)}
      </span>
    </div>
  );
}

function getCardLayout(index: number) {
  const pattern = index % 6;
  if (pattern === 0) return { articleClass: "lg:col-span-7 lg:min-h-[380px]", titleClass: "text-[38px] lg:text-[48px]", previewLength: 140 };
  if (pattern === 1) return { articleClass: "lg:col-span-5 lg:min-h-[380px]", titleClass: "text-[28px] lg:text-[38px]", previewLength: 110 };
  if (pattern === 2) return { articleClass: "lg:col-span-4 lg:min-h-[300px]", titleClass: "text-[26px] lg:text-[32px]", previewLength: 88 };
  if (pattern === 3) return { articleClass: "lg:col-span-4 lg:min-h-[320px]", titleClass: "text-[26px] lg:text-[34px]", previewLength: 96 };
  if (pattern === 4) return { articleClass: "lg:col-span-4 lg:min-h-[280px]", titleClass: "text-[24px] lg:text-[30px]", previewLength: 80 };
  return { articleClass: "lg:col-span-6 lg:min-h-[320px]", titleClass: "text-[28px] lg:text-[38px]", previewLength: 100 };
}

export default function SchoolProfileView({
  school,
  students,
  notes: initialNotes,
}: SchoolProfileViewProps) {
  const [activeTab, setActiveTab] = useState<SchoolTab>("students");
  const [focusLevel, setFocusLevel] = useState<FocusLevel>("tabs");
  const [keyboardFocusIndex, setKeyboardFocusIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);

  // note modal
  const [notes, setNotes] = useState<ExploreNoteCard[]>(initialNotes);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const studentButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const noteButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const router = useRouter();

  const openedPost = notes.find((n) => n.id === openedPostId) ?? null;

  const { data: commentsData, isLoading: commentsLoading, mutate: mutateComments } = useSWR<{
    comments: ExploreCommentRecord[];
  }>(openedPostId ? `/api/notes/${openedPostId}/comments` : null, swrFetcher);

  const changeTab = useCallback((tab: SchoolTab, idx: number) => {
    setActiveTab(tab);
    setKeyboardFocusIndex(idx);
    setFocusLevel("tabs");
    setFocusedItemIndex(0);
  }, []);

  const findNextItemIndex = useCallback(
    (currentIndex: number, key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown") => {
      const refs =
        activeTab === "students" ? studentButtonRefs.current : noteButtonRefs.current;
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
    [activeTab],
  );

  useEffect(() => {
    if (focusLevel !== "items") {
      return;
    }

    const refs =
      activeTab === "students" ? studentButtonRefs.current : noteButtonRefs.current;
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
  }, [activeTab, focusLevel, focusedItemIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openedPostId) { e.preventDefault(); e.stopImmediatePropagation(); setOpenedPostId(null); return; }
        if (focusLevel === "items") { e.preventDefault(); e.stopImmediatePropagation(); setFocusLevel("tabs"); }
        return;
      }

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return;

      const itemCount = activeTab === "students" ? students.length : notes.length;

      if (focusLevel === "tabs") {
        if (e.key === "ArrowRight") { e.preventDefault(); setKeyboardFocusIndex((i) => (i + 1) % TABS.length); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); setKeyboardFocusIndex((i) => (i + TABS.length - 1) % TABS.length); }
        else if (e.key === "Enter") { e.preventDefault(); changeTab(TABS[keyboardFocusIndex], keyboardFocusIndex); }
        else if (e.key === "ArrowDown" && itemCount > 0) { e.preventDefault(); setFocusLevel("items"); setFocusedItemIndex(0); }
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
        }
        else if (e.key === "Enter" && itemCount > 0) {
          e.preventDefault();
          if (activeTab === "notes") {
            const note = notes[focusedItemIndex];
            if (note) setOpenedPostId(note.id);
          } else {
            const student = students[focusedItemIndex];
            if (student) router.push(`/${student.email}`);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    focusLevel,
    keyboardFocusIndex,
    focusedItemIndex,
    activeTab,
    students,
    notes,
    changeTab,
    findNextItemIndex,
    openedPostId,
    router,
  ]);

  async function handleToggleLike(noteId: string) {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    setActionError(null);

    // optimistic
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, likedByViewer: !n.likedByViewer, likeCount: Math.max(0, n.likeCount + (n.likedByViewer ? -1 : 1)) }
          : n
      )
    );

    try {
      const res = await fetch(`/api/notes/${noteId}/likes`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { liked?: boolean; likeCount?: number; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Failed to update like.");
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, likedByViewer: payload?.liked ?? n.likedByViewer, likeCount: payload?.likeCount ?? n.likeCount }
            : n
        )
      );
    } catch (err) {
      // rollback
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, likedByViewer: target.likedByViewer, likeCount: target.likeCount }
            : n
        )
      );
      setActionError(err instanceof Error ? err.message : "Failed to update like.");
    }
  }

  async function handleSubmitComment(noteId: string) {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/notes/${noteId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const payload = (await res.json().catch(() => null)) as { comment?: ExploreCommentRecord; commentCount?: number; error?: string } | null;
      if (!res.ok || !payload?.comment) throw new Error(payload?.error ?? "Failed to save comment.");
      setCommentDraft("");
      await mutateComments((current) => ({ comments: [...(current?.comments ?? []), payload.comment!] }), { revalidate: false });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, commentCount: payload.commentCount ?? n.commentCount + 1 } : n
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save comment.");
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-black sm:px-6 lg:px-8 xl:px-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div
          className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)]"
          style={school.primaryColor ? { backgroundColor: `${school.primaryColor}18` } : undefined}
        >
          {school.logoUrl ? (
            <PixelatedSchoolLogo src={school.logoUrl} alt={school.name} size={100} />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[28px] font-bold text-black/30">{getInitials(school.name)}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.03em] text-black sm:text-[52px]">
            {school.name}
          </h1>
          {school.location ? (
            <p className="mt-2 text-[16px] text-black/55">{school.location}</p>
          ) : null}
        </div>
      </div>

      {/* Tab bar — big box style */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-sm">
        {(["students", "notes"] as SchoolTab[]).map((tab, idx) => (
          <button
            key={tab}
            type="button"
            onClick={() => changeTab(tab, idx)}
            className={`folder-grid-card border px-6 py-6 text-left outline-none focus:outline-none focus-visible:outline-none ${
              activeTab === tab
                ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                : focusLevel === "tabs" && keyboardFocusIndex === idx
                  ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                  : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
            }`}
          >
            <div
              className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                activeTab === tab || (focusLevel === "tabs" && keyboardFocusIndex === idx)
                  ? "text-black/55"
                  : "text-black/95"
              }`}
            >
              {tab === "students" ? "Students" : "Notes"}
            </div>
            <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em]">
              {tab === "students" ? students.length : notes.length}
            </div>
          </button>
        ))}
      </div>

      {/* Students section */}
      {activeTab === "students" ? (
        <div className="mt-8">
          {students.length === 0 ? (
            <div className="rounded-[28px] border border-black/10 bg-[var(--app-card)] px-6 py-8">
              <p className="text-[20px] font-medium text-black/50">No students yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {students.map((student, idx) => (
                <button
                  key={student.id}
                  type="button"
                  ref={(element) => {
                    studentButtonRefs.current[idx] = element;
                  }}
                  onClick={() => router.push(`/${student.email}`)}
                  className={`folder-grid-card w-full rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] p-4 text-left text-black outline-none transition-[transform,box-shadow,border-color] duration-200 hover:border-black/20 focus:outline-none focus-visible:outline-none ${
                    focusLevel === "items" && focusedItemIndex === idx
                      ? "folder-grid-card--active -translate-y-1 border-black shadow-[0_18px_36px_rgba(20,18,17,0.12)]"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar fullName={student.fullName} profilePhotoUrl={student.profilePhotoUrl} size={56} />
                    <div className="min-w-0">
                      <div className="truncate text-[17px] font-semibold text-black">{student.fullName}</div>
                      <div className="truncate text-[13px] text-black/55">{student.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Notes section */}
      {activeTab === "notes" ? (
        <div className="mt-8">
          {notes.length === 0 ? (
            <div className="rounded-[28px] border border-black/10 bg-[var(--app-card)] px-6 py-8">
              <p className="text-[20px] font-medium text-black/50">No public notes from this school yet.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-12">
              {notes.map((note, index) => {
                const layout = getCardLayout(index);
                return (
                  <button
                    key={note.id}
                    type="button"
                    ref={(element) => {
                      noteButtonRefs.current[index] = element;
                    }}
                    onClick={() => setOpenedPostId(note.id)}
                    className={`folder-grid-card overflow-hidden rounded-[28px] border border-black/10 bg-[var(--app-card)] p-6 text-left outline-none transition-[transform,box-shadow,border-color] duration-200 focus:outline-none focus-visible:outline-none ${layout.articleClass} ${
                      focusLevel === "items" && focusedItemIndex === index
                        ? "folder-grid-card--active -translate-y-1 border-black shadow-[0_18px_36px_rgba(20,18,17,0.12)]"
                        : ""
                    }`}
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar fullName={note.owner.fullName} profilePhotoUrl={note.owner.profilePhotoUrl} size={32} />
                        <p className="truncate text-[14px] font-semibold text-black">{note.owner.fullName}</p>
                      </div>
                      <p className="mt-2 text-[12px] text-black/45">
                        {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
                      </p>
                      <div className={`mt-5 font-bold leading-[1.02] ${layout.titleClass}`}>
                        {note.name}
                      </div>
                      <p className="mt-4 text-[17px] leading-[1.6] text-black/72">
                        {getPreviewText(note.content, layout.previewLength) || "No preview available yet."}
                      </p>
                      <div className="mt-auto pt-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[14px] font-medium text-black/65">
                            ♡ {note.likeCount}
                          </span>
                          <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[14px] font-medium text-black/65">
                            {note.commentCount} comments
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Note detail modal */}
      {openedPost ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-6 py-8">
          <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div />
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-[14px] font-medium text-black/70"
                onClick={() => setOpenedPostId(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setOpenedPostId(null); router.push(`/${openedPost.owner.email}`); }}
              >
                <UserAvatar fullName={openedPost.owner.fullName} profilePhotoUrl={openedPost.owner.profilePhotoUrl} size={40} />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="truncate text-[15px] font-semibold text-black hover:underline"
                  onClick={() => { setOpenedPostId(null); router.push(`/${openedPost.owner.email}`); }}
                >
                  {openedPost.owner.fullName}
                </button>
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

            {actionError ? (
              <p className="mt-4 text-[14px] text-red-600">{actionError}</p>
            ) : null}

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
                  {openedPost.likedByViewer ? "Liked" : "Like"} · {openedPost.likeCount}
                </button>
                <span className="text-[15px] text-black/55">
                  Comments · {commentsData?.comments?.length ?? openedPost.commentCount}
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {(commentsData?.comments ?? []).map((comment) => (
                  <div key={comment.id} className="border-b border-black/6 pb-4 last:border-b-0 last:pb-0">
                    <div className="text-[14px] font-semibold text-black">{comment.author.fullName}</div>
                    <div className="mt-1 text-[13px] text-black/40">{formatAuthoredDate(comment.createdAt)}</div>
                    <p className="mt-2 text-[15px] leading-[1.5] text-black/72">{comment.body}</p>
                  </div>
                ))}
                {commentsLoading ? <p className="text-[15px] text-black/45">Loading comments...</p> : null}
                {!commentsLoading && (commentsData?.comments?.length ?? 0) === 0 ? (
                  <p className="text-[15px] text-black/45">No comments yet.</p>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  maxLength={600}
                  className="w-full rounded-[20px] border border-black/10 bg-[var(--app-card)] px-4 py-3 text-[15px] text-black outline-none"
                  placeholder="Add a comment..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-black/35">{commentDraft.trim().length}/600</span>
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
