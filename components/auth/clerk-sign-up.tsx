"use client";

import Link from "next/link";
import { useState } from "react";
import { Quicksand } from "next/font/google";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs/legacy";
import { calculateAgeFromBirthdate } from "@/lib/birthdate";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown[] }).errors)
  ) {
    const firstError = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    return firstError?.longMessage ?? firstError?.message ?? "Something went wrong.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export default function ClerkSignUpView() {
  const router = useRouter();
  const { isLoaded, setActive, signUp } = useSignUp();
  const [step, setStep] = useState<"details" | "verify">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDetailsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded || !signUp) {
      return;
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = emailAddress.trim();
    const normalizedBirthdate = birthdate.trim();
    const age = calculateAgeFromBirthdate(normalizedBirthdate);

    if (!normalizedFirstName || !normalizedLastName) {
      setErrorMessage("First name and last name are required.");
      return;
    }

    if (!normalizedBirthdate || age === null) {
      setErrorMessage("Enter a valid birthdate.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await signUp.create({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        emailAddress: normalizedEmail,
        password,
        unsafeMetadata: {
          birthdate: normalizedBirthdate,
        },
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setStep("verify");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded || !signUp || !setActive) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        setErrorMessage("Verification is not complete yet.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.push("/?step=school");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] bg-white px-6 py-12 text-[#2b2725] ${quicksand.className}`}
    >
      <div className="mx-auto w-full max-w-3xl">
        {step === "details" ? (
          <>
            <h1 className="max-w-3xl text-[2.5rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.8rem]">
              Create your account.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-black/50">
              First name, last name, and birthdate are required at sign up.
            </p>

            <form className="mt-14 space-y-6" onSubmit={handleDetailsSubmit}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm uppercase tracking-[0.22em] text-black/35">
                    First name
                  </span>
                  <input
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="mt-3 w-full border-b border-black/20 pb-4 text-[1.45rem] outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-sm uppercase tracking-[0.22em] text-black/35">
                    Last name
                  </span>
                  <input
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="mt-3 w-full border-b border-black/20 pb-4 text-[1.45rem] outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm uppercase tracking-[0.22em] text-black/35">
                  Birthdate
                </span>
                <input
                  required
                  type="date"
                  value={birthdate}
                  onChange={(event) => setBirthdate(event.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="mt-3 w-full border-b border-black/20 pb-4 text-[1.45rem] outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm uppercase tracking-[0.22em] text-black/35">
                  Email
                </span>
                <input
                  required
                  type="email"
                  value={emailAddress}
                  onChange={(event) => setEmailAddress(event.target.value)}
                  className="mt-3 w-full border-b border-black/20 pb-4 text-[1.45rem] outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm uppercase tracking-[0.22em] text-black/35">
                  Password
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-3 w-full border-b border-black/20 pb-4 text-[1.45rem] outline-none"
                />
              </label>

              {errorMessage ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
              ) : null}

              <div className="flex items-center justify-between gap-4 pt-4">
                <Link className="text-sm uppercase tracking-[0.22em] text-black/40 hover:text-black" href="/">
                  Sign in instead
                </Link>
                <button
                  disabled={!isLoaded || isSubmitting}
                  type="submit"
                  className="rounded-full border border-black px-6 py-3 text-sm uppercase tracking-[0.22em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/15 disabled:text-black/25"
                >
                  {isSubmitting ? "Creating" : "Continue"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h1 className="max-w-3xl text-[2.5rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.8rem]">
              Check your email.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-black/50">
              Enter the verification code Clerk sent to {emailAddress}.
            </p>

            <form className="mt-14 space-y-6" onSubmit={handleVerifySubmit}>
              <label className="block">
                <span className="text-sm uppercase tracking-[0.22em] text-black/35">
                  Verification code
                </span>
                <input
                  required
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  className="mt-3 w-full border-b border-black/20 pb-4 text-[1.45rem] outline-none"
                />
              </label>

              {errorMessage ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
              ) : null}

              <div className="flex items-center justify-between gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="text-sm uppercase tracking-[0.22em] text-black/40 hover:text-black"
                >
                  Back
                </button>
                <button
                  disabled={!isLoaded || isSubmitting}
                  type="submit"
                  className="rounded-full border border-black px-6 py-3 text-sm uppercase tracking-[0.22em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/15 disabled:text-black/25"
                >
                  {isSubmitting ? "Verifying" : "Verify"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
