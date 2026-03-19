"use client";

import type { CompletionPhase } from "@/components/sign-up/types";
import TypewriterText from "@/components/ui/typewriter-text";

type CompletionOverlayProps = {
  onTypingComplete: () => void;
  phase: CompletionPhase;
};

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
            : phase === "exit"
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
          <TypewriterText
            as="span"
            className="inline-block"
            text="You're all set and ready to go. Press Enter to start noting."
            onComplete={onTypingComplete}
          />
        ) : null}
        </p>
    </div>
  );
}
