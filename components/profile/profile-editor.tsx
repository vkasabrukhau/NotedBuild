"use client";

import { useUser } from "@clerk/nextjs";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import type { ProfileSchoolOption, ProfileViewData } from "@/lib/profile-data";

type ProfileEditorProps = {
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  profile: ProfileViewData;
  schools: ProfileSchoolOption[];
};

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
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmailAddressId, setPendingEmailAddressId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFullName(profile.fullName);
    setEmail(profile.email);
    setAge(profile.age?.toString() ?? "");
    setBio(profile.bio ?? "");
    setSchoolId(profile.schoolId ?? "");
    setProfilePhoto(null);
    setVerificationCode("");
    setPendingEmailAddressId(null);
    setMessage(null);
    setError(null);
  }, [open, profile]);

  if (!open) {
    return null;
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
            <select
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              className="mt-2 w-full rounded-[18px] border border-black/12 bg-white px-4 py-3 text-[15px] text-black outline-none transition focus:border-black/30"
            >
              <option value="">No school selected</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.location
                    ? `${school.name} · ${school.location}`
                    : school.name}
                </option>
              ))}
            </select>
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
