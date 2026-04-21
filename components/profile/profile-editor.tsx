"use client";

import { useUser } from "@clerk/nextjs";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProfileSchoolOption, ProfileViewData } from "@/lib/profile-data";

type ProfileEditorProps = {
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  profile: ProfileViewData;
  schools: ProfileSchoolOption[];
};

function getSchoolDisplayLabel(school: ProfileSchoolOption) {
  return school.location ? `${school.name} · ${school.location}` : school.name;
}

function getSchoolSearchText(school: ProfileSchoolOption) {
  return `${school.name} ${school.location ?? ""}`.trim().toLowerCase();
}

async function syncProfileToServer(payload: {
  age: number | null;
  bio: string | null;
  fullName: string;
  schoolId: string | null;
}) {
  const response = await fetch("/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to update profile.");
  }
}

export default function ProfileEditor({
  onClose,
  onSaved,
  open,
  profile,
  schools,
}: ProfileEditorProps) {
  const { user } = useUser();
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [schoolId, setSchoolId] = useState(profile.schoolId ?? "");
  const [schoolQuery, setSchoolQuery] = useState(profile.schoolName ?? "");
  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState(false);
  const [activeSchoolIndex, setActiveSchoolIndex] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmailAddressId, setPendingEmailAddressId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const schoolFieldRef = useRef<HTMLDivElement | null>(null);
  const schoolInputRef = useRef<HTMLInputElement | null>(null);
  const schoolOptionsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === schoolId) ?? null,
    [schoolId, schools],
  );
  const normalizedSchoolQuery = schoolQuery.trim().toLowerCase();
  const filteredSchools = useMemo(() => {
    if (normalizedSchoolQuery.length === 0) {
      return [];
    }

    return schools
      .filter((school) => getSchoolSearchText(school).includes(normalizedSchoolQuery))
      .slice(0, 8);
  }, [normalizedSchoolQuery, schools]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFullName(profile.fullName);
    setEmail(profile.email);
    setAge(profile.age?.toString() ?? "");
    setBio(profile.bio ?? "");
    setSchoolId(profile.schoolId ?? "");
    setSchoolQuery(profile.schoolName ?? "");
    setIsSchoolMenuOpen(false);
    setActiveSchoolIndex(0);
    setProfilePhoto(null);
    setVerificationCode("");
    setPendingEmailAddressId(null);
    setMessage(null);
    setError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open || !isSchoolMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!schoolFieldRef.current?.contains(event.target as Node)) {
        setIsSchoolMenuOpen(false);
        setActiveSchoolIndex(0);
        setSchoolQuery(selectedSchool ? getSchoolDisplayLabel(selectedSchool) : "");
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isSchoolMenuOpen, open, selectedSchool]);

  useEffect(() => {
    if (!open || !isSchoolMenuOpen || filteredSchools.length === 0) {
      return;
    }

    const activeOption = schoolOptionsRef.current[activeSchoolIndex];
    activeOption?.scrollIntoView({
      block: "nearest",
    });
  }, [activeSchoolIndex, filteredSchools.length, isSchoolMenuOpen, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (isSchoolMenuOpen) {
        setIsSchoolMenuOpen(false);
        setActiveSchoolIndex(0);
        setSchoolQuery(selectedSchool ? getSchoolDisplayLabel(selectedSchool) : "");
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isSchoolMenuOpen, onClose, open, selectedSchool]);

  if (!open) {
    return null;
  }

  function handleSchoolSelect(nextSchoolId: string) {
    const nextSchool = schools.find((school) => school.id === nextSchoolId) ?? null;
    setSchoolId(nextSchoolId);
    setSchoolQuery(nextSchool ? getSchoolDisplayLabel(nextSchool) : "");
    setIsSchoolMenuOpen(false);
    setActiveSchoolIndex(0);
    setError(null);
  }

  function handleSchoolQueryChange(value: string) {
    setSchoolQuery(value);
    setIsSchoolMenuOpen(true);
    setActiveSchoolIndex(0);

    if (value.trim() === "") {
      setSchoolId("");
      return;
    }

    const exactMatch =
      schools.find(
        (school) =>
          getSchoolDisplayLabel(school).toLowerCase() === value.trim().toLowerCase() ||
          school.name.toLowerCase() === value.trim().toLowerCase(),
      ) ?? null;

    setSchoolId(exactMatch?.id ?? "");
  }

  function handleSchoolInputFocus() {
    setIsSchoolMenuOpen(true);
  }

  function handleSchoolInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isSchoolMenuOpen) {
        setIsSchoolMenuOpen(true);
        return;
      }

      if (filteredSchools.length > 0) {
        setActiveSchoolIndex((current) => Math.min(current + 1, filteredSchools.length - 1));
      }
      return;
    }

    if (event.key === "ArrowUp") {
      if (!isSchoolMenuOpen || filteredSchools.length === 0) {
        return;
      }

      event.preventDefault();
      setActiveSchoolIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && isSchoolMenuOpen && filteredSchools.length > 0) {
      event.preventDefault();
      handleSchoolSelect(filteredSchools[activeSchoolIndex]?.id ?? filteredSchools[0].id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsSchoolMenuOpen(false);
      setActiveSchoolIndex(0);
      setSchoolQuery(selectedSchool ? getSchoolDisplayLabel(selectedSchool) : "");
    }
  }

  async function saveProfileDetails() {
    const parsedAge = age.trim() === "" ? null : Number(age);

    await syncProfileToServer({
      age: parsedAge,
      bio: bio.trim() || null,
      fullName: fullName.trim(),
      schoolId: schoolId || null,
    });

    setMessage("Profile updated.");
    onSaved();
    onClose();
  }

  async function handlePrimarySave() {
    if (!user) {
      setError("You need to be signed in to edit your profile.");
      return;
    }

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (profilePhoto) {
        await user.setProfileImage({
          file: profilePhoto,
        });
      }

      const nextEmail = email.trim();
      const currentEmail =
        user.primaryEmailAddress?.emailAddress.trim().toLowerCase() ??
        profile.email.trim().toLowerCase();

      if (nextEmail.toLowerCase() !== currentEmail) {
        const emailAddress = await user.createEmailAddress({
          email: nextEmail,
        });

        await emailAddress.prepareVerification({
          strategy: "email_code",
        });

        setPendingEmailAddressId(emailAddress.id);
        setMessage(`Verification code sent to ${nextEmail}.`);
        return;
      }

      await saveProfileDetails();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEmailVerification() {
    if (!user || !pendingEmailAddressId) {
      setError("Email verification could not be started.");
      return;
    }

    if (!verificationCode.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await user.reload();

      const pendingEmailAddress = user.emailAddresses.find(
        (emailAddress) => emailAddress.id === pendingEmailAddressId,
      );

      if (!pendingEmailAddress) {
        throw new Error("That email verification is no longer available.");
      }

      const verifiedEmailAddress = await pendingEmailAddress.attemptVerification(
        {
          code: verificationCode.trim(),
        },
      );

      await user.update({
        primaryEmailAddressId: verifiedEmailAddress.id,
      });

      await saveProfileDetails();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Failed to verify the new email address.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleProfilePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setProfilePhoto(event.target.files?.[0] ?? null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8">
      <div className="w-full max-w-2xl rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-bold tracking-[-0.04em] text-black">
              Edit profile
            </h2>
            <p className="mt-2 text-sm text-black/55">
              Update your school, name, age, profile photo, and email.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-black/70 transition hover:border-black/20 hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Full name
            </span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-[18px] border border-black/12 px-4 py-3 text-[15px] text-black outline-none transition focus:border-black/30"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-[18px] border border-black/12 px-4 py-3 text-[15px] text-black outline-none transition focus:border-black/30"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Age
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="mt-2 w-full rounded-[18px] border border-black/12 px-4 py-3 text-[15px] text-black outline-none transition focus:border-black/30"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              School
            </span>
            <div ref={schoolFieldRef} className="relative mt-2">
              <input
                ref={schoolInputRef}
                value={schoolQuery}
                onChange={(event) => handleSchoolQueryChange(event.target.value)}
                onFocus={handleSchoolInputFocus}
                onKeyDown={handleSchoolInputKeyDown}
                placeholder="Type your university"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="words"
                className="w-full rounded-[18px] border border-black/12 bg-[var(--app-card)] px-4 py-3 pr-10 text-[15px] text-black outline-none transition focus:border-black/30"
              />
              <button
                type="button"
                onClick={() => {
                  setIsSchoolMenuOpen((current) => !current);
                  schoolInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 text-black/45 transition hover:border-black/20 hover:text-black"
                aria-label={isSchoolMenuOpen ? "Close school menu" : "Open school menu"}
              >
                <span className={`text-xs transition ${isSchoolMenuOpen ? "rotate-180" : ""}`}>
                  v
                </span>
              </button>

              {isSchoolMenuOpen ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[22px] border border-black/10 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSchoolSelect("")}
                    className={`flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-[14px] transition ${
                      schoolId === ""
                        ? "bg-black text-white"
                        : "text-black/72 hover:bg-black/[0.04]"
                    }`}
                  >
                    <span>No school selected</span>
                    <span className={`text-[11px] uppercase tracking-[0.22em] ${schoolId === "" ? "text-white/70" : "text-black/35"}`}>
                      Clear
                    </span>
                  </button>

                  {normalizedSchoolQuery.length === 0 ? (
                    <div className="px-4 pb-2 pt-3 text-[12px] text-black/45">
                      {selectedSchool
                        ? `Current: ${getSchoolDisplayLabel(selectedSchool)}`
                        : "Type to search for your university."}
                    </div>
                  ) : filteredSchools.length > 0 ? (
                    <div className="mt-2 max-h-56 overflow-y-auto">
                      {filteredSchools.map((school, index) => {
                        const isActive = index === activeSchoolIndex;
                        const isSelected = school.id === schoolId;

                        return (
                          <button
                            key={school.id}
                            type="button"
                            ref={(element) => {
                              schoolOptionsRef.current[index] = element;
                            }}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveSchoolIndex(index)}
                            onClick={() => handleSchoolSelect(school.id)}
                            className={`mb-1 flex w-full items-start justify-between gap-4 rounded-[16px] border px-4 py-3 text-left outline-none transition-[transform,background-color,border-color,box-shadow] duration-200 last:mb-0 ${
                              isActive
                                ? "-translate-y-1 border-black bg-[var(--app-card)] shadow-[0_14px_28px_rgba(20,18,17,0.10)]"
                                : isSelected
                                  ? "border-black/20 bg-black/[0.04]"
                                  : "border-transparent hover:border-black/10 hover:bg-black/[0.03]"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[14px] font-medium text-black">
                                {school.name}
                              </span>
                              {school.location ? (
                                <span className="mt-1 block truncate text-[12px] text-black/45">
                                  {school.location}
                                </span>
                              ) : null}
                            </span>
                            <span className={`shrink-0 pt-1 text-[10px] uppercase tracking-[0.22em] ${
                              isActive ? "text-black/70" : "text-black/28"
                            }`}>
                              {isSelected ? "Selected" : isActive ? "Ready" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 pb-2 pt-3 text-[12px] text-black/45">
                      No schools match that search.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </label>
        </div>

        <label className="mt-4 block sm:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
            Bio
          </span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell people a little about yourself…"
            className="mt-2 w-full resize-none rounded-[18px] border border-black/12 px-4 py-3 text-[15px] text-black outline-none transition focus:border-black/30"
          />
          <p className="mt-1 text-right text-xs text-black/35">{bio.length}/500</p>
        </label>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
            Profile photo
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePhotoChange}
            className="mt-2 block w-full text-sm text-black/65 file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <p className="mt-2 text-xs text-black/45">
            {profilePhoto ? `${profilePhoto.name} ready to upload.` : "Keep your current photo or choose a new one."}
          </p>
        </label>

        {pendingEmailAddressId ? (
          <div className="mt-6 rounded-[22px] border border-black/10 bg-[#f7f5f0] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Verify email
            </div>
            <p className="mt-2 text-sm text-black/62">
              Enter the verification code from your new email before saving.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="Verification code"
                className="w-full rounded-[16px] border border-black/12 bg-white px-4 py-3 text-[15px] text-black outline-none transition focus:border-black/30"
              />
              <button
                type="button"
                onClick={handleEmailVerification}
                disabled={isSaving}
                className="rounded-[16px] bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Verify email
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-[#a11d1d]">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 text-sm text-black/60">{message}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[16px] border border-black/12 px-5 py-3 text-sm font-medium text-black/70 transition hover:border-black/20 hover:text-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrimarySave}
            disabled={isSaving || Boolean(pendingEmailAddressId)}
            className="rounded-[16px] bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingEmailAddressId ? "Verification sent" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
