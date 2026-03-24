"use client";

import { useState } from "react";
import type { CompletionPhase } from "@/components/sign-up/types";
import TypewriterText from "@/components/ui/typewriter-text";

type CompletionOverlayProps = {
  onTypingComplete: () => void;
  phase: CompletionPhase;
};

function CompletionLines({
  onTypingComplete,
}: {
  onTypingComplete: () => void;
}) {
  const [showSecondLine, setShowSecondLine] = useState(false);

  return (
    <span className="relative inline-grid">
      <span
        className="invisible col-start-1 row-start-1 inline-flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span>{`You're all set and ready to go.|`}</span>
        <span>{`Press Enter to start noting.|`}</span>
      </span>
      <span className="col-start-1 row-start-1 inline-flex flex-col items-center gap-2">
        <TypewriterText
          as="span"
          className="inline-block"
          text="You're all set and ready to go."
          showCursor={!showSecondLine}
          onComplete={() => setShowSecondLine(true)}
        />
        {showSecondLine ? (
          <TypewriterText
            as="span"
            className="inline-block"
            text="Press Enter to start noting."
            startDelay={90}
            onComplete={onTypingComplete}
          />
        ) : (
          <span className="h-[1em]" aria-hidden="true" />
        )}
      </span>
    </span>
  );
}

export default function CompletionOverlay({
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
            : "opacity-100"
      }`}
      >
        <p
          className={`max-w-5xl text-center text-[2.35rem] font-semibold leading-tight tracking-[-0.05em] text-black transition-all sm:text-[3.5rem] ${
          phase === "visible"
            ? "translate-y-0 scale-100 opacity-100 duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            : phase === "exit"
              ? "-translate-y-28 scale-[0.93] opacity-0 duration-[1850ms] ease-[cubic-bezier(0.2,0.75,0,1)]"
              : "translate-y-8 scale-[0.992] opacity-0 duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        }`}
      >
        {phase === "visible" ? (
          <CompletionLines onTypingComplete={onTypingComplete} />
        ) : null}
        </p>
    </div>
  );
}
