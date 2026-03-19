import type { KeyboardEvent, RefObject } from "react";

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
  return (
    <div className="relative mt-12 border-b border-black/20 pb-4">
      <div
        className="school-search-display pointer-events-none absolute inset-0 flex items-center text-[1.55rem] font-medium sm:text-[1.9rem]"
      >
        {schoolQuery.trim() === "" ? (
          <span className="text-black/18">Search for your school</span>
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
