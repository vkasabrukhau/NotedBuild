"use client";

import { useEffect, useRef, useState } from "react";

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
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;
    hasCompletedRef.current = false;

    const complete = () => {
      if (hasCompletedRef.current) {
        return;
      }

      hasCompletedRef.current = true;
      onCompleteRef.current?.();
    };

    const typeNext = (index: number) => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const nextLength = index + 1;
        setVisibleLength(nextLength);

        if (nextLength >= text.length) {
          complete();
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
        complete();
        return;
      }

      typeNext(0);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [characterDelay, startDelay, text]);

  const Component = as;

  return (
    <Component className={className}>
      <span className="relative inline-grid text-left">
        <span className="invisible col-start-1 row-start-1" aria-hidden="true">
          {text}
          <span className="ml-[0.08em] inline-block">|</span>
        </span>
        <span className="col-start-1 row-start-1">
          {text.slice(0, visibleLength)}
          <span
            className={`ml-[0.08em] inline-block ${showCursor ? "typewriter-cursor" : "invisible"} ${cursorClassName}`.trim()}
            aria-hidden="true"
          >
            |
          </span>
        </span>
      </span>
    </Component>
  );
}
