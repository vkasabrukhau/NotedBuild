import type { KeyboardEvent, RefObject } from "react";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder";

const SCHOOL_SEARCH_PLACEHOLDERS = [
  "Search for your school",
  "University of Michigan",
  "New York University",
  "UCLA",
];

type SchoolSearchFieldProps = {
  autocompleteSuffix: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  schoolQuery: string;
  schoolInputRef: RefObject<HTMLInputElement | null>;
};

export default function SchoolSearchField({
  autocompleteSuffix,
  onChange,
  onKeyDown,
  schoolInputRef,
  schoolQuery,
}: SchoolSearchFieldProps) {
  const placeholder = useTypewriterPlaceholder({
    enabled: schoolQuery.trim() === "",
    phrases: SCHOOL_SEARCH_PLACEHOLDERS,
  });

  return (
    <div className="auth-entry auth-input-surface relative mt-12 rounded-[2rem] border border-black/10 bg-black/[0.03] px-6 py-5">
      <div
        className="school-search-display pointer-events-none absolute inset-0 flex items-center px-6 py-5 text-[1.55rem] font-medium sm:text-[1.9rem]"
      >
        {schoolQuery.trim() === "" ? (
          <span className="text-black/18">{placeholder}</span>
        ) : (
          <>
            <span className="text-black">{schoolQuery}</span>
            {autocompleteSuffix ? (
              <span className="text-black/22">{autocompleteSuffix}</span>
            ) : null}
          </>
        )}
      </div>

      <input
        ref={schoolInputRef}
        aria-label="Search for your school"
        value={schoolQuery}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="none"
        autoFocus
        className="school-search-display w-full bg-transparent text-[1.55rem] font-medium text-transparent caret-black outline-none sm:text-[1.9rem]"
      />
    </div>
  );
}
