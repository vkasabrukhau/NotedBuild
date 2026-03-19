"use client";

import { useEffect, useMemo, useState } from "react";

type UseTypewriterPlaceholderOptions = {
  enabled?: boolean;
  phrases: string[];
  startDelay?: number;
  typeDelay?: number;
};

export function useTypewriterPlaceholder({
  enabled = true,
  phrases,
  startDelay = 180,
  typeDelay = 32,
}: UseTypewriterPlaceholderOptions) {
  const normalizedPhrases = useMemo(
    () => phrases.filter((phrase) => phrase.trim().length > 0),
    [phrases],
  );
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    if (!enabled || normalizedPhrases.length === 0) {
      const timeoutId = window.setTimeout(() => {
        setPlaceholder("");
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    let cancelled = false;
    let timeoutId = 0;
    const finalPhrase = normalizedPhrases[normalizedPhrases.length - 1] ?? "";
    let visibleLength = 0;

    const run = () => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        visibleLength += 1;
        setPlaceholder(finalPhrase.slice(0, visibleLength));

        if (visibleLength < finalPhrase.length) {
          runAfter(typeDelay);
          return;
        }
      }, 0);
    };

    const runAfter = (delay: number) => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        run();
      }, delay);
    };

    runAfter(startDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    enabled,
    normalizedPhrases,
    startDelay,
    typeDelay,
  ]);

  return placeholder;
}
