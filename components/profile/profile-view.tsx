export type ProfileViewData = {
  age: number | null;
  email: string;
  folderCount: number;
  fullName: string;
  joinedAt: string;
  noteCount: number;
  profilePhotoUrl: string | null;
  schoolAccentColor: string | null;
  schoolLogoUrl: string | null;
  schoolLocation: string | null;
  schoolName: string | null;
  schoolPrimaryColor: string | null;
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

function getSchoolBadgeColors(profile: ProfileViewData) {
  return {
    accent: profile.schoolAccentColor ?? "#f0c772",
    primary: profile.schoolPrimaryColor ?? "#1d2329",
  };
}

function DottedSchoolMark({ profile }: { profile: ProfileViewData }) {
  const schoolLabel = profile.schoolName ?? "School";
  const badgeText = getInitials(schoolLabel).slice(0, 2);
  const colors = getSchoolBadgeColors(profile);

  return (
    <div
      className="relative h-[132px] w-[132px] shrink-0 overflow-hidden rounded-[32px] border border-black/10"
      style={{
        backgroundImage: `linear-gradient(145deg, ${colors.primary}, ${colors.accent})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 22%, rgba(255,255,255,0.92) 0 1.6px, transparent 1.9px),
            radial-gradient(circle at 58% 34%, rgba(255,255,255,0.72) 0 1.8px, transparent 2.1px),
            radial-gradient(circle at 78% 70%, rgba(255,255,255,0.86) 0 1.4px, transparent 1.8px),
            radial-gradient(circle at 30% 76%, rgba(255,255,255,0.78) 0 1.7px, transparent 2px)
          `,
          backgroundSize: "18px 18px, 22px 22px, 16px 16px, 20px 20px",
          backgroundPosition: "0 0, 8px 10px, 4px 6px, 11px 3px",
        }}
      />
      {profile.schoolLogoUrl ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_18%,rgba(255,255,255,0.1)_19%,rgba(255,255,255,0.12)_45%,transparent_76%)]" />
          <img
            src={profile.schoolLogoUrl}
            alt={schoolLabel}
            width={132}
            height={132}
            className="absolute inset-0 h-full w-full object-contain p-5 opacity-95"
            style={{
              filter: "brightness(0) invert(1)",
              mixBlendMode: "screen",
              WebkitMaskImage:
                "radial-gradient(circle, rgba(0,0,0,1) 0 52%, transparent 58%)",
              WebkitMaskPosition: "0 0",
              WebkitMaskSize: "12px 12px",
              WebkitMaskRepeat: "repeat",
              maskImage:
                "radial-gradient(circle, rgba(0,0,0,1) 0 52%, transparent 58%)",
              maskPosition: "0 0",
              maskRepeat: "repeat",
              maskSize: "12px 12px",
            }}
          />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_28%,rgba(255,255,255,0.16)_29%,rgba(255,255,255,0.12)_45%,transparent_76%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="translate-y-1 text-[44px] font-bold uppercase tracking-[-0.08em] text-white/92">
              {badgeText}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProfileView({
  profile,
}: {
  profile: ProfileViewData;
}) {
  const schoolLabel = profile.schoolName ?? "Add your school";

  return (
    <div className="min-h-screen w-full bg-[#f4f2ee] px-6 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-[40px] font-bold leading-none text-black">
          Profile
        </h1>

        <section className="mt-10 overflow-hidden rounded-[36px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(20,18,17,0.08)]">
          <div className="relative h-[174px] overflow-hidden bg-[linear-gradient(135deg,#ede6d8_0%,#f9f8f4_42%,#ddd5c4_100%)]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />
            <div className="absolute left-8 top-8 h-28 w-28 rounded-full bg-white/45 blur-3xl" />
            <div className="absolute right-8 top-6 h-36 w-36 rounded-full bg-black/6 blur-3xl" />
          </div>

          <div className="px-8 pb-8 pt-0 sm:px-10 sm:pb-10">
            <div className="-mt-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
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
                  <h2 className="text-[36px] font-bold leading-none tracking-[-0.04em] text-black">
                    {profile.fullName}
                  </h2>
                  <p className="mt-3 text-[18px] text-black/58">
                    {profile.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-5 rounded-[28px] border border-black/10 bg-[#f8f6f1] px-5 py-5 lg:min-w-[360px]">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-black/38">
                    School
                  </div>
                  <div className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.04em] text-black">
                    {schoolLabel}
                  </div>
                  {profile.schoolLocation ? (
                    <div className="mt-1 text-[16px] text-black/48">
                      {profile.schoolLocation}
                    </div>
                  ) : null}
                </div>
                <DottedSchoolMark profile={profile} />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-black/10 bg-[#f8f8f6] px-5 py-5">
                <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-black/40">
                  Age
                </div>
                <div className="mt-3 text-[32px] font-bold leading-none tracking-[-0.04em] text-black">
                  {profile.age ?? "Not set"}
                </div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-[#f8f8f6] px-5 py-5">
                <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-black/40">
                  Joined
                </div>
                <div className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.04em] text-black">
                  {formatJoinedDate(profile.joinedAt)}
                </div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-[#f8f8f6] px-5 py-5">
                <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-black/40">
                  Notes
                </div>
                <div className="mt-3 text-[32px] font-bold leading-none tracking-[-0.04em] text-black">
                  {profile.noteCount}
                </div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-[#f8f8f6] px-5 py-5">
                <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-black/40">
                  Folders
                </div>
                <div className="mt-3 text-[32px] font-bold leading-none tracking-[-0.04em] text-black">
                  {profile.folderCount}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-dashed border-black/12 bg-[#fbfbfb] p-6">
              <div className="text-[14px] font-medium uppercase tracking-[0.16em] text-black/40">
                Next
              </div>
              <p className="mt-4 max-w-2xl text-[20px] leading-[1.45] text-black/68">
                This is the basic LinkedIn-style top card. If you want real school
                logos later, add a `logoUrl` to your `School` model and render it
                inside the dotted badge on the right.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
