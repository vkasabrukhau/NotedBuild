"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

function PaperNotificationButton({
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
      className="relative h-[52px] w-[52px] shrink-0 rounded-[16px] border border-black/12 bg-[#fcfbf7] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"
      aria-label="Notifications"
      aria-pressed={isOpen}
    >
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

export default function ProfileView({
  profile,
  schools = [],
  viewer,
}: ProfileViewProps) {
  const router = useRouter();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [friendshipState, setFriendshipState] = useState(
    viewer.friendshipState,
  );
  const [friendError, setFriendError] = useState<string | null>(null);
  const [isFriendActionPending, setIsFriendActionPending] = useState(false);

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

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.05em] text-black">
            Profile
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.22em] text-black/35">
            Identity and account
          </p>
        </div>

        <div className="flex items-start gap-3">
          {viewer.isOwnProfile ? (
            <div className="relative">
              <PaperNotificationButton
                isOpen={isNotificationsOpen}
                onToggle={() => setIsNotificationsOpen((current) => !current)}
              />
              {isNotificationsOpen ? (
                <div className="absolute right-0 top-[64px] w-[260px] rounded-[22px] border border-black/10 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                    Notifications
                  </div>
                  <p className="mt-3 text-sm leading-6 text-black/62">
                    Friend requests will appear here next. The button is wired
                    in now; the request list can plug into this panel after.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFriendshipAction}
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

            <div className="border-l border-black/90 pl-8">
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/95">
                Friends
              </div>
              <div className="mt-4 text-[34px] font-bold leading-none tracking-[-0.05em] text-black">
                {profile.friendCount}
              </div>
            </div>
          </div>
        </div>

        {friendError ? (
          <p className="mt-6 text-sm text-[#a11d1d]">{friendError}</p>
        ) : null}

        <div className="mt-8 border-t border-dashed border-black/20 pt-12" />
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
