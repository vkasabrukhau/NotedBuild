import type { KeyboardEvent, RefObject } from "react";
import { completeSchoolSelection } from "@/app/actions/complete-school-selection";
import SchoolOptionRow from "@/components/sign-up/school-option-row";
import SchoolSearchField from "@/components/sign-up/school-search-field";
import TypewriterText from "@/components/ui/typewriter-text";
import type {
  SchoolOption,
  SuggestionDirection,
} from "@/components/sign-up/types";

type SchoolViewProps = {
  activeSchoolIndex: number | null;
  activeSchoolRowRef: RefObject<HTMLButtonElement | null>;
  autocompleteSuffix: string;
  firstName: string;
  filteredSchools: SchoolOption[];
  onHoverSchool: (index: number | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSchoolQueryChange: (value: string) => void;
  onSelectSchool: (schoolId: string) => void;
  schoolFormRef: RefObject<HTMLFormElement | null>;
  schoolIdInputRef: RefObject<HTMLInputElement | null>;
  schoolInputRef: RefObject<HTMLInputElement | null>;
  schoolQuery: string;
  schoolsCount: number;
  selectedReason: string | null;
  selectingSchoolId: string | null;
  selectionFlashTick: number;
  suggestionDirection: SuggestionDirection;
};

export default function SchoolView({
  activeSchoolIndex,
  activeSchoolRowRef,
  autocompleteSuffix,
  filteredSchools,
  firstName,
  onHoverSchool,
  onKeyDown,
  onSchoolQueryChange,
  onSelectSchool,
  schoolFormRef,
  schoolIdInputRef,
  schoolInputRef,
  schoolQuery,
  schoolsCount,
  selectedReason,
  selectingSchoolId,
  selectionFlashTick,
  suggestionDirection,
}: SchoolViewProps) {
  const hasQuery = schoolQuery.trim() !== "";
  const resultsAnimationKey = `${schoolQuery.trim().toLowerCase()}-${filteredSchools
    .map((school) => school.id)
    .join("-")}`;

  return (
    <>
      <TypewriterText
        as="h1"
        className="text-[2.4rem] font-semibold leading-tight tracking-[-0.05em] text-black sm:text-[3.3rem]"
        text={`Great, ${firstName}. Choose your school.`}
      />

      <form
        ref={schoolFormRef}
        action={completeSchoolSelection}
        className="mt-12"
      >
        <input type="hidden" name="reason" value={selectedReason ?? ""} />
        <input
          ref={schoolIdInputRef}
          type="hidden"
          name="schoolId"
          defaultValue=""
        />

        <SchoolSearchField
          autocompleteSuffix={autocompleteSuffix}
          onChange={onSchoolQueryChange}
          onKeyDown={onKeyDown}
          schoolInputRef={schoolInputRef}
          schoolQuery={schoolQuery}
        />

        <p className="mt-4 text-sm text-black/35">{schoolsCount} schools</p>

        <div className="school-results-stage mt-8">
          {!hasQuery ? (
            <div className="school-results-empty">
              <p className="text-center text-[1.05rem] text-black/40 sm:text-[1.15rem]">
                Start typing to reveal matching schools.
              </p>
            </div>
          ) : null}

          {hasQuery && filteredSchools.length === 0 ? (
            <div className="school-results-empty">
              <p className="text-center text-[1.05rem] text-black/40 sm:text-[1.15rem]">
                No schools matched that search.
              </p>
            </div>
          ) : null}

          {hasQuery && filteredSchools.length > 0 ? (
            <div
              key={resultsAnimationKey}
              className="school-results-panel school-results-scroll"
            >
              {filteredSchools.map((school, index) => (
                <SchoolOptionRow
                  key={school.id}
                  activeSchoolRowRef={activeSchoolRowRef}
                  index={index}
                  isActive={index === activeSchoolIndex}
                  isSelecting={Boolean(selectingSchoolId)}
                  onMouseEnter={() => onHoverSchool(index)}
                  onMouseLeave={() => onHoverSchool(null)}
                  onSelect={() => onSelectSchool(school.id)}
                  school={school}
                  selectingSchoolId={selectingSchoolId}
                  selectionFlashTick={selectionFlashTick}
                  suggestionDirection={suggestionDirection}
                />
              ))}
            </div>
          ) : null}
        </div>
      </form>
    </>
  );
}
