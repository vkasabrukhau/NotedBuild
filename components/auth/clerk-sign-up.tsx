"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs/legacy";
import SignUpStyles from "@/components/sign-up/sign-up-styles";
import TypewriterText from "@/components/ui/typewriter-text";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder";
import { calculateAgeFromBirthdate } from "@/lib/birthdate";

const FIRST_NAME_PLACEHOLDERS = ["First name", "Ada", "Maya", "Jordan"];
const LAST_NAME_PLACEHOLDERS = ["Last name", "Lovelace", "Patel", "Kim"];
const BIRTH_MONTH_PLACEHOLDERS = ["MM"];
const BIRTH_DAY_PLACEHOLDERS = ["DD"];
const BIRTH_YEAR_PLACEHOLDERS = ["YYYY"];
const EMAIL_PLACEHOLDERS = [
  "Email address",
  "maya@school.edu",
  "jordan@example.com",
];
const PASSWORD_PLACEHOLDERS = [
  "Choose a password",
  "Use 8+ characters",
  "Add a strong password",
];
const VERIFICATION_PLACEHOLDERS = ["Verification code", "123456"];

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

function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function buildBirthdate(monthText: string, dayText: string, yearText: string) {
  if (monthText.length !== 2 || dayText.length !== 2 || yearText.length !== 4) {
    return null;
  }

  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const year = Number.parseInt(yearText, 10);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || year < 1900) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

export default function ClerkSignUpView() {
  const router = useRouter();
  const { isLoaded, setActive, signUp } = useSignUp();
  const [step, setStep] = useState<"details" | "verify">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const detailsFormRef = useRef<HTMLFormElement | null>(null);
  const verifyFormRef = useRef<HTMLFormElement | null>(null);
  const birthMonthRef = useRef<HTMLInputElement | null>(null);
  const birthDayRef = useRef<HTMLInputElement | null>(null);
  const birthYearRef = useRef<HTMLInputElement | null>(null);
  const firstNamePlaceholder = useTypewriterPlaceholder({
    enabled: firstName.trim() === "",
    phrases: FIRST_NAME_PLACEHOLDERS,
  });
  const lastNamePlaceholder = useTypewriterPlaceholder({
    enabled: lastName.trim() === "",
    phrases: LAST_NAME_PLACEHOLDERS,
  });
  const birthMonthPlaceholder = useTypewriterPlaceholder({
    enabled: birthMonth.trim() === "",
    phrases: BIRTH_MONTH_PLACEHOLDERS,
  });
  const birthDayPlaceholder = useTypewriterPlaceholder({
    enabled: birthDay.trim() === "",
    phrases: BIRTH_DAY_PLACEHOLDERS,
  });
  const birthYearPlaceholder = useTypewriterPlaceholder({
    enabled: birthYear.trim() === "",
    phrases: BIRTH_YEAR_PLACEHOLDERS,
  });
  const emailPlaceholder = useTypewriterPlaceholder({
    enabled: emailAddress.trim() === "",
    phrases: EMAIL_PLACEHOLDERS,
  });
  const passwordPlaceholder = useTypewriterPlaceholder({
    enabled: password.trim() === "",
    phrases: PASSWORD_PLACEHOLDERS,
  });
  const verificationPlaceholder = useTypewriterPlaceholder({
    enabled: verificationCode.trim() === "",
    phrases: VERIFICATION_PLACEHOLDERS,
  });
  const birthdate = buildBirthdate(birthMonth, birthDay, birthYear) ?? "";
  const isDetailsComplete =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    birthdate.trim() !== "" &&
    emailAddress.trim() !== "" &&
    password.trim() !== "";
  const isVerifyComplete = verificationCode.trim() !== "";
  const inputClassName =
    "auth-input-surface w-full rounded-[1.75rem] border border-black/10 bg-black/[0.03] px-5 py-4 text-[1.2rem] text-black outline-none sm:text-[1.35rem]";
  const birthInputClassName =
    "auth-input-surface w-full rounded-[1.75rem] border border-black/10 bg-black/[0.03] px-5 py-4 text-center text-[1.2rem] text-black outline-none sm:text-[1.35rem]";

  function handleFormEnter(
    event: React.KeyboardEvent<HTMLFormElement>,
    isComplete: boolean,
  ) {
    if (event.key !== "Enter" || event.shiftKey || isSubmitting) {
      return;
    }

    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.tagName === "TEXTAREA"
    ) {
      return;
    }

    if (!isComplete) {
      return;
    }

    event.preventDefault();
    event.currentTarget.requestSubmit();
  }

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
      router.replace("/");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-[#2b2725]">
      <div className="mx-auto w-full max-w-3xl">
        {step === "details" ? (
          <>
            <TypewriterText
              as="h1"
              className="max-w-3xl text-[2.5rem] font-semibold leading-tight tracking-[-0.05em] text-black sm:text-[3.8rem]"
              text="Let's get to know you"
            />

            <form
              ref={detailsFormRef}
              className="mt-14 space-y-5"
              onKeyDown={(event) => handleFormEnter(event, isDetailsComplete)}
              onSubmit={handleDetailsSubmit}
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <input
                  required
                  aria-label="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={firstNamePlaceholder}
                  className={`${inputClassName} auth-entry`}
                  style={{ animationDelay: "70ms" }}
                />

                <input
                  required
                  aria-label="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={lastNamePlaceholder}
                  className={`${inputClassName} auth-entry`}
                  style={{ animationDelay: "130ms" }}
                />
              </div>

              <div
                className="auth-entry grid grid-cols-[0.95fr_0.95fr_1.1fr] gap-4"
                style={{ animationDelay: "190ms" }}
              >
                <input
                  ref={birthMonthRef}
                  required
                  aria-label="Birth month"
                  inputMode="numeric"
                  maxLength={2}
                  value={birthMonth}
                  onChange={(event) => {
                    const nextValue = digitsOnly(event.target.value, 2);
                    setBirthMonth(nextValue);

                    if (nextValue.length === 2) {
                      birthDayRef.current?.focus();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && birthMonth.length === 0) {
                      event.preventDefault();
                    }
                  }}
                  placeholder={birthMonthPlaceholder}
                  className={birthInputClassName}
                />

                <input
                  ref={birthDayRef}
                  required
                  aria-label="Birth day"
                  inputMode="numeric"
                  maxLength={2}
                  value={birthDay}
                  onChange={(event) => {
                    const nextValue = digitsOnly(event.target.value, 2);
                    setBirthDay(nextValue);

                    if (nextValue.length === 2) {
                      birthYearRef.current?.focus();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && birthDay.length === 0) {
                      birthMonthRef.current?.focus();
                    }
                  }}
                  placeholder={birthDayPlaceholder}
                  className={birthInputClassName}
                />

                <input
                  ref={birthYearRef}
                  required
                  aria-label="Birth year"
                  inputMode="numeric"
                  maxLength={4}
                  value={birthYear}
                  onChange={(event) => {
                    setBirthYear(digitsOnly(event.target.value, 4));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && birthYear.length === 0) {
                      birthDayRef.current?.focus();
                    }
                  }}
                  placeholder={birthYearPlaceholder}
                  className={birthInputClassName}
                />
              </div>

              <input
                required
                aria-label="Email address"
                type="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                placeholder={emailPlaceholder}
                className={`${inputClassName} auth-entry`}
                style={{ animationDelay: "250ms" }}
              />

              <input
                required
                aria-label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={passwordPlaceholder}
                className={`${inputClassName} auth-entry`}
                style={{ animationDelay: "310ms" }}
              />

              {errorMessage ? (
                <p
                  className="auth-entry text-sm text-red-600"
                  style={{ animationDelay: "340ms" }}
                >
                  {errorMessage}
                </p>
              ) : null}

              <div
                id="clerk-captcha"
                data-cl-theme="light"
                data-cl-size="flexible"
                className="auth-entry overflow-hidden rounded-[1.75rem]"
                style={{ animationDelay: "355ms" }}
              />

              <div
                className={`auth-entry auth-guidance mt-6 w-full ${
                  isDetailsComplete ? "auth-guidance--ready text-black" : "text-black/55"
                }`}
                style={{ animationDelay: "370ms" }}
              >
                <div className="flex items-center justify-between gap-6">
                  <span className="auth-guidance-line" />
                  <span className="auth-guidance-dot" />
                  <p
                    className="auth-guidance-text flex-1 text-center text-sm uppercase tracking-[0.22em]"
                  >
                    {isDetailsComplete
                      ? (
                        <>
                          Press <span className="font-bold text-base">Enter</span>{" "}
                          to continue
                        </>
                      )
                      : "Finish every field before moving on"}
                  </p>
                  <span className="auth-guidance-dot" />
                  <span className="auth-guidance-line" />
                </div>
              </div>
              <button
                aria-hidden="true"
                tabIndex={-1}
                disabled={!isLoaded || isSubmitting}
                type="submit"
                className="sr-only"
              >
                Submit
              </button>
            </form>
          </>
        ) : (
          <>
            <TypewriterText
              as="h1"
              className="max-w-3xl text-[2.5rem] font-semibold leading-tight tracking-[-0.05em] text-black sm:text-[3.8rem]"
              text="Check your email"
            />

            <form
              ref={verifyFormRef}
              className="mt-14 space-y-6"
              onKeyDown={(event) => handleFormEnter(event, isVerifyComplete)}
              onSubmit={handleVerifySubmit}
            >
              <input
                required
                aria-label="Verification code"
                inputMode="numeric"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder={verificationPlaceholder}
                className={`${inputClassName} auth-entry`}
                style={{ animationDelay: "80ms" }}
              />

              {errorMessage ? (
                <p
                  className="auth-entry text-sm text-red-600"
                  style={{ animationDelay: "140ms" }}
                >
                  {errorMessage}
                </p>
              ) : null}

              <div
                className={`auth-entry auth-guidance mt-6 w-full ${
                  isVerifyComplete ? "auth-guidance--ready text-black" : "text-black/55"
                }`}
                style={{ animationDelay: "180ms" }}
              >
                <div className="flex items-center justify-between gap-6">
                  <span className="auth-guidance-line" />
                  <span className="auth-guidance-dot" />
                  <p
                    className="auth-guidance-text flex-1 text-center text-sm uppercase tracking-[0.22em]"
                  >
                    {isVerifyComplete
                      ? (
                        <>
                          Press <span className="font-bold text-base">Enter</span>{" "}
                          to continue
                        </>
                      )
                      : "Finish entering the code before moving on"}
                  </p>
                  <span className="auth-guidance-dot" />
                  <span className="auth-guidance-line" />
                </div>
              </div>
              <button
                aria-hidden="true"
                tabIndex={-1}
                disabled={!isLoaded || isSubmitting}
                type="submit"
                className="sr-only"
              >
                Submit
              </button>
            </form>
          </>
        )}
      </div>
      <SignUpStyles />
    </main>
  );
}
