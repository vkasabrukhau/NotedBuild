"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { swrFetcher } from "@/lib/swr-fetcher";
import { formatAuthoredDate, getPreviewText } from "@/lib/text-utils";
import type { ProfileViewData, ProfileViewerData } from "@/lib/profile-data";
import type { ExploreCommentRecord } from "@/lib/explore";
import { NOTE_VISIBILITY_LABELS } from "@/lib/note-visibility";
import NoteCardStack from "@/components/notes/note-card-stack";
import PostViewerModal from "@/components/notes/post-viewer-modal";
import { findNextGridItemIndex, focusGridItem } from "@/lib/grid-navigation";

type FriendProfileModalProps = {
  email: string | null;
  onClose: () => void;
  onOpenProfile: (email: string) => void;
  onOpenSchool?: (schoolId: string) => void;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({
  fullName,
  profilePhotoUrl,
  size = 52,
}: {
  fullName: string;
  profilePhotoUrl: string | null;
  size?: number;
}) {
  const radius = size >= 56 ? "rounded-[18px]" : "rounded-[16px]";

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
      <span className="text-sm font-bold uppercase tracking-[0.08em]">
        {getInitials(fullName)}
      </span>
    </div>
  );
}

function SchoolPill({
  schoolName,
  schoolLogoUrl,
  schoolId,
  onNavigateToSchool,
}: {
  schoolName: string | null;
  schoolLogoUrl: string | null;
  schoolId: string | null;
  onNavigateToSchool?: (id: string) => void;
}) {
  if (!schoolName) return null;

  const inner = (
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
      <span className="max-w-[140px] truncate text-[11px] font-medium text-black/65">
        {schoolName}
      </span>
    </span>
  );

  if (schoolId && onNavigateToSchool) {
    return (
      <button
        type="button"
        onClick={() => onNavigateToSchool(schoolId)}
        className="transition hover:opacity-75"
      >
        {inner}
      </button>
    );
  }

  return inner;
}

type ModalTab = "posts" | "friends";

export default function FriendProfileModal({
  email,
  onClose,
  onOpenProfile,
  onOpenSchool,
}: FriendProfileModalProps) {
  if (!email) return null;

  return (
    <FriendProfileModalContent
      key={email}
      email={email}
      onClose={onClose}
      onOpenProfile={onOpenProfile}
      onOpenSchool={onOpenSchool}
    />
  );
}

function FriendProfileModalContent({
  email,
  onClose,
  onOpenProfile,
  onOpenSchool,
}: FriendProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("posts");
  const [focusLevel, setFocusLevel] = useState<"tabs" | "items">("tabs");
  const [keyboardFocusIndex, setKeyboardFocusIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const postButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const friendButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const encodedEmail = email ? encodeURIComponent(email) : null;

  const { data, isLoading } = useSWR<{
    profile: ProfileViewData;
    viewer: ProfileViewerData;
  }>(
    encodedEmail ? `/api/users/${encodedEmail}` : null,
    swrFetcher,
  );

  const { data: commentsData, isLoading: commentsLoading } = useSWR<{
    comments: ExploreCommentRecord[];
  }>(
    openedPostId ? `/api/notes/${openedPostId}/comments` : null,
    swrFetcher,
  );

  const profile = data?.profile ?? null;
  const openedPost = profile?.notes.find((n) => n.id === openedPostId) ?? null;

  const changeTab = useCallback((tab: ModalTab, index: number) => {
    setActiveTab(tab);
    setKeyboardFocusIndex(index);
    setFocusLevel("tabs");
    setFocusedItemIndex(0);
  }, []);

  const getActiveItemRefs = useCallback(
    () => (activeTab === "posts" ? postButtonRefs.current : friendButtonRefs.current),
    [activeTab],
  );

  useEffect(() => {
    if (openedPostId) {
      return;
    }

    if (focusLevel === "tabs") {
      const activeTabButton = tabButtonRefs.current[keyboardFocusIndex];
      if (!activeTabButton) {
        return;
      }

      activeTabButton.focus({ preventScroll: true });
      activeTabButton.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
      return;
    }

    focusGridItem(getActiveItemRefs(), focusedItemIndex);
  }, [focusLevel, focusedItemIndex, getActiveItemRefs, keyboardFocusIndex, openedPostId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (openedPostId) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpenedPostId(null);
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };

    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose, openedPostId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!profile || openedPostId) {
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

      const tabOrder: ModalTab[] = ["posts", "friends"];
      const itemCount =
        activeTab === "posts" ? profile.notes.length : profile.friends.length;

      if (focusLevel === "tabs") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const nextIndex = Math.min(tabOrder.length - 1, keyboardFocusIndex + 1);
          changeTab(tabOrder[nextIndex], nextIndex);
          return;
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const nextIndex = Math.max(0, keyboardFocusIndex - 1);
          changeTab(tabOrder[nextIndex], nextIndex);
          return;
        }

        if (e.key === "ArrowDown" && itemCount > 0) {
          e.preventDefault();
          setFocusLevel("items");
          setFocusedItemIndex((current) => Math.min(current, itemCount - 1));
          return;
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          changeTab(tabOrder[keyboardFocusIndex], keyboardFocusIndex);
        }

        return;
      }

      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        const nextIndex = findNextGridItemIndex(
          getActiveItemRefs(),
          focusedItemIndex,
          e.key,
        );

        if (nextIndex !== null) {
          e.preventDefault();
          setFocusedItemIndex(nextIndex);
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusLevel("tabs");
        }

        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();

        if (activeTab === "posts") {
          const note = profile.notes[focusedItemIndex];
          if (note) {
            setOpenedPostId(note.id);
          }
          return;
        }

        const friend = profile.friends[focusedItemIndex];
        if (friend) {
          onOpenProfile(friend.email);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    activeTab,
    changeTab,
    focusLevel,
    focusedItemIndex,
    getActiveItemRefs,
    keyboardFocusIndex,
    onOpenProfile,
    openedPostId,
    profile,
  ]);

  async function handleSubmitComment(noteId: string) {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    await fetch(`/api/notes/${noteId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });

    setCommentDraft("");
  }

  function handleNavigateToSchool(schoolId: string) {
    onClose();
    onOpenSchool?.(schoolId);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-[0_0_80px_rgba(0,0,0,0.16)]">
        {/* Close bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/8 px-6 py-4">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
            Profile
          </span>
          <button
            type="button"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] font-medium text-black/70 transition hover:border-black/20"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-[18px] bg-black/8" />
              <div className="h-7 w-48 rounded-lg bg-black/8" />
              <div className="h-4 w-32 rounded bg-black/8" />
            </div>
          ) : !profile ? (
            <p className="text-[15px] text-black/45">Profile not found.</p>
          ) : (
            <>
              {/* Profile header */}
              <div className="flex items-start gap-4">
                <Avatar
                  fullName={profile.fullName}
                  profilePhotoUrl={profile.profilePhotoUrl}
                  size={64}
                />
                <div className="min-w-0 flex-1 pt-1">
                  <h2 className="text-[26px] font-bold leading-tight text-black">
                    {profile.fullName}
                  </h2>
                  {profile.schoolName ? (
                    <div className="mt-1.5">
                      <SchoolPill
                        schoolName={profile.schoolName}
                        schoolLogoUrl={profile.schoolLogoUrl}
                        schoolId={profile.schoolId}
                        onNavigateToSchool={handleNavigateToSchool}
                      />
                    </div>
                  ) : null}
                  {profile.bio ? (
                    <p className="mt-2 text-[14px] leading-[1.5] text-black/60">
                      {profile.bio}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 border-b border-black/8 pb-5">
                {([
                  {
                    count: profile.notes.length,
                    index: 0,
                    label: "Posts",
                    tab: "posts" as const,
                  },
                  {
                    count: profile.friendCount,
                    index: 1,
                    label: "Friends",
                    tab: "friends" as const,
                  },
                ]).map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    ref={(element) => {
                      tabButtonRefs.current[item.index] = element;
                    }}
                    onClick={() => changeTab(item.tab, item.index)}
                    className={`folder-grid-card border px-5 py-5 text-left outline-none focus:outline-none focus-visible:outline-none ${
                      activeTab === item.tab
                        ? "folder-grid-card--selected border-black/10 bg-white text-black shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                        : focusLevel === "tabs" && keyboardFocusIndex === item.index
                          ? "folder-grid-card--active border-black/20 bg-white/60 text-black ring-2 ring-black ring-offset-2"
                          : "border-transparent text-black hover:border-black/10 hover:bg-white hover:shadow-[inset_0_0_0_9999px_rgba(120,84,0,0.045)]"
                    }`}
                  >
                    <div
                      className={`text-[11px] font-medium uppercase tracking-[0.24em] ${
                        activeTab === item.tab ||
                        (focusLevel === "tabs" && keyboardFocusIndex === item.index)
                          ? "text-black/55"
                          : "text-black/95"
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                      {item.count}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-[28px] font-bold leading-none tracking-[-0.04em] text-black">
                  {activeTab === "posts" ? "Posts" : "Friends"}
                </h3>
              </div>

              {/* Posts tab */}
              {activeTab === "posts" ? (
                <div className="mt-6 grid gap-4">
                  {profile.notes.length === 0 ? (
                    <div className="rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] px-5 py-6">
                      <p className="text-[16px] font-medium text-black/50">
                        No public posts yet.
                      </p>
                    </div>
                  ) : (
                    profile.notes.map((note, idx) => (
                      <button
                        key={note.id}
                        type="button"
                        ref={(element) => {
                          postButtonRefs.current[idx] = element;
                        }}
                        onClick={() => setOpenedPostId(note.id)}
                        onFocus={() => {
                          setFocusLevel("items");
                          setFocusedItemIndex(idx);
                        }}
                        className={`folder-grid-card w-full rounded-[24px] border border-black/10 bg-[var(--app-card)] p-5 text-left text-black outline-none focus:outline-none focus-visible:outline-none ${
                          focusLevel === "items" &&
                          activeTab === "posts" &&
                          focusedItemIndex === idx
                            ? "folder-grid-card--active -translate-y-1 border-black shadow-[0_18px_36px_rgba(20,18,17,0.12)]"
                            : ""
                        }`}
                      >
                        <NoteCardStack
                          topBar={
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
                              <span className="rounded-full border border-black/10 bg-black/8 px-2.5 py-0.5">
                                {NOTE_VISIBILITY_LABELS[note.visibility]}
                              </span>
                            </div>
                          }
                          title={
                            <h3 className="text-[20px] font-bold leading-tight">
                              {note.name}
                            </h3>
                          }
                          preview={
                            <p className="text-[14px] leading-[1.5] text-black/65">
                              {getPreviewText(note.content, 60) ||
                                "No preview available yet."}
                            </p>
                          }
                          footer={
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-black/45">
                              <span>♡ {note.likeCount}</span>
                              <span>· {note.commentCount} comments</span>
                              <span>· {formatAuthoredDate(note.publishedAt ?? note.createdAt)}</span>
                            </div>
                          }
                        />
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {/* Friends tab */}
              {activeTab === "friends" ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {profile.friends.length === 0 ? (
                    <div className="rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] px-5 py-6 sm:col-span-2">
                      <p className="text-[16px] font-medium text-black/50">
                        No accepted friends yet.
                      </p>
                    </div>
                  ) : (
                    profile.friends.map((friend, idx) => (
                      <button
                        key={friend.id}
                        type="button"
                        ref={(element) => {
                          friendButtonRefs.current[idx] = element;
                        }}
                        onClick={() => onOpenProfile(friend.email)}
                        onFocus={() => {
                          setFocusLevel("items");
                          setFocusedItemIndex(idx);
                        }}
                        className={`folder-grid-card w-full rounded-[24px] border border-black/10 bg-[var(--app-card-alt)] p-4 text-left text-black outline-none focus:outline-none focus-visible:outline-none ${
                          focusLevel === "items" &&
                          activeTab === "friends" &&
                          focusedItemIndex === idx
                            ? "folder-grid-card--active -translate-y-1 border-black shadow-[0_18px_36px_rgba(20,18,17,0.12)]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            fullName={friend.fullName}
                            profilePhotoUrl={friend.profilePhotoUrl}
                            size={44}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold text-black">
                              {friend.fullName}
                            </div>
                            <div className="truncate text-[13px] text-black/55">
                              {friend.email}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Full post overlay (on top of slide-over) */}
      <PostViewerModal
        note={openedPost}
        overlayClassName="z-[60] bg-black/30"
        maxWidthClassName="max-w-3xl"
        titleClassName="text-[32px] font-bold leading-[1.05] text-black"
        actions={
          openedPost && profile ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/${encodeURIComponent(profile.email)}/notes/${encodeURIComponent(openedPost.name)}`}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] font-medium text-black/70 transition hover:border-black/20"
              >
                Open full
              </Link>
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-[14px] font-medium text-black/70"
                onClick={() => setOpenedPostId(null)}
              >
                Back
              </button>
            </div>
          ) : null
        }
        owner={
          openedPost && profile ? (
            <div className="flex items-center gap-2.5">
              <Avatar
                fullName={profile.fullName}
                profilePhotoUrl={profile.profilePhotoUrl}
                size={36}
              />
              <div>
                <p className="text-[14px] font-semibold text-black">
                  {profile.fullName}
                </p>
              </div>
            </div>
          ) : null
        }
        footer={
          <>
            <div className="space-y-4">
              {(commentsData?.comments ?? []).map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-black/6 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="text-[14px] font-semibold text-black">
                    {comment.author.fullName}
                  </div>
                  <div className="mt-0.5 text-[12px] text-black/40">
                    {formatAuthoredDate(comment.createdAt)}
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.5] text-black/72">
                    {comment.body}
                  </p>
                </div>
              ))}
              {commentsLoading ? (
                <p className="text-[14px] text-black/45">Loading comments...</p>
              ) : null}
              {!commentsLoading && (commentsData?.comments?.length ?? 0) === 0 ? (
                <p className="text-[14px] text-black/45">No comments yet.</p>
              ) : null}
            </div>

            {openedPost ? (
              <div className="mt-6 flex flex-col gap-3">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  maxLength={600}
                  className="w-full rounded-[20px] border border-black/10 bg-[var(--app-card)] px-4 py-3 text-[14px] text-black outline-none"
                  placeholder="Add a comment..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-black/35">
                    {commentDraft.trim().length}/600
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-black bg-black px-4 py-2 text-[13px] font-medium text-white"
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
    </>
  );
}
