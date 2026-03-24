"use client";

import { useEffect, useState } from "react";
import type { CompletionPhase } from "@/components/sign-up/types";

type CompletionOverlayProps = {
  canContinue: boolean;
  onTypingComplete: () => void;
  phase: CompletionPhase;
};

function CompletionTypewriter({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [messagePrefix, setMessagePrefix] = useState("");
  const [messageNoting, setMessageNoting] = useState("");

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    const getTypingDelay = (character: string, index: number) => {
      if (character === "." || character === "!" || character === "?") {
        return 190;
      }

      if (character === ",") {
        return 130;
      }

      if (character === " ") {
        return 52;
      }

      const rhythm = [54, 38, 46, 62, 41, 57];
      return rhythm[index % rhythm.length];
    };

    const typeInto = async (
      text: string,
      setter: React.Dispatch<React.SetStateAction<string>>,
    ) => {
      for (let index = 0; index < text.length; index += 1) {
        if (cancelled) {
          return;
        }

        const character = text.charAt(index);
        setter((previous) => previous + character);
        await sleep(getTypingDelay(character, index));
      }
    };

    const run = async () => {
      await sleep(180);
      await typeInto("You're all set and ready to go,", setMessagePrefix);
      await sleep(160);
      await typeInto("Enter to start ", setMessagePrefix);
      await typeInto("noting.", setMessageNoting);
      await typeInto("", setMessageNoting);
      onComplete();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  return (
    <>
      {messagePrefix}
      <span className="font-bold italic">{messageNoting}</span>
      <span className="typewriter-cursor" aria-hidden="true">
        |
      </span>
    </>
  );
}

export default function CompletionOverlay({
  canContinue,
  onTypingComplete,
  phase,
}: CompletionOverlayProps) {
  return (
    <div
      className={`completion-overlay fixed inset-0 z-50 flex items-center justify-center bg-white/98 px-8 text-center transition-opacity duration-700 ${
        phase === "hidden"
          ? "pointer-events-none opacity-0"
          : phase === "enter"
            ? "opacity-0"
            : phase === "exit"
              ? "opacity-0"
              : "opacity-100"
      }`}
      >
        <p
          className={`max-w-5xl text-center text-[2.35rem] leading-tight tracking-[-0.05em] text-black transition-all sm:text-[3.5rem] ${
          phase === "visible"
            ? "translate-y-0 scale-100 opacity-100 duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            : phase === "exit"
              ? "-translate-y-28 scale-[0.93] opacity-0 duration-[1850ms] ease-[cubic-bezier(0.2,0.75,0,1)]"
              : "translate-y-8 scale-[0.992] opacity-0 duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        }`}
      >
          {phase === "visible" ? (
            <CompletionTypewriter onComplete={onTypingComplete} />
          ) : null}
        </p>
        {phase === "visible" && canContinue }
      <style jsx>{`
        .typewriter-cursor {
          display: inline-block;
          margin-left: 0.08em;
          animation: completionCursorBlink 1s steps(1, end) infinite;
        }

        @keyframes completionCursorBlink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
