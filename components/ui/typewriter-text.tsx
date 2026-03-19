"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  characterDelay?: number;
  className?: string;
  cursorClassName?: string;
  onComplete?: () => void;
  showCursor?: boolean;
  startDelay?: number;
  text: string;
};

export default function TypewriterText({
  as = "span",
  characterDelay = 32,
  className = "",
  cursorClassName = "",
  onComplete,
  showCursor = true,
  startDelay = 150,
  text,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;

    const typeNext = (index: number) => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const nextLength = index + 1;
        setVisibleLength(nextLength);

        if (nextLength >= text.length) {
          onComplete?.();
          return;
        }

        typeNext(nextLength);
      }, index === 0 ? startDelay : characterDelay);
    };

    timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setVisibleLength(0);

      if (text.length === 0) {
        onComplete?.();
        return;
      }

      typeNext(0);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [characterDelay, onComplete, startDelay, text]);

  const Component = as;

  return (
    <Component className={className}>
      {text.slice(0, visibleLength)}
      {showCursor ? (
        <span
          className={`typewriter-cursor ml-[0.08em] inline-block ${cursorClassName}`.trim()}
          aria-hidden="true"
        >
          |
        </span>
      ) : null}
    </Component>
  );
}
