import type { RefObject } from "react";
import type {
  SchoolOption,
  SuggestionDirection,
} from "@/components/sign-up/types";

type SchoolOptionRowProps = {
  activeSchoolRowRef: RefObject<HTMLButtonElement | null>;
  index: number;
  isActive: boolean;
  isSelecting: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSelect: () => void;
  school: SchoolOption;
  selectingSchoolId: string | null;
  selectionFlashTick: number;
  suggestionDirection: SuggestionDirection;
};

export default function SchoolOptionRow({
  activeSchoolRowRef,
  index,
  isActive,
  isSelecting,
  onMouseEnter,
  onMouseLeave,
  onSelect,
  school,
  selectingSchoolId,
  selectionFlashTick,
  suggestionDirection,
}: SchoolOptionRowProps) {
  const isSelected = selectingSchoolId === school.id;
  const isBlackState = (isSelected && selectionFlashTick % 2 === 0) || isActive;

  return (
    <button
      ref={isActive ? activeSchoolRowRef : null}
      type="button"
      disabled={Boolean(selectingSchoolId)}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex w-full items-start justify-between gap-6 border-b py-4 text-left transition-[transform,opacity,border-color,background-color,color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isSelecting ? "cursor-wait" : "hover:border-black/25"
      } ${
        suggestionDirection === "up"
          ? "translate-y-0 animate-[schoolSuggestionUp_700ms_cubic-bezier(0.22,1,0.36,1)]"
          : "translate-y-0 animate-[schoolSuggestionDown_700ms_cubic-bezier(0.22,1,0.36,1)]"
      } ${
        isSelected
          ? selectionFlashTick % 2 === 0
            ? "border-black bg-black text-white"
            : "border-black bg-white text-black"
          : isActive
            ? "border-black bg-black text-white"
            : "border-black/10 text-black"
      }`}
      style={{
        animationDelay: `${index * 28}ms`,
        animationFillMode: "both",
      }}
    >
      <span>
        <span
          className={`block text-[1.45rem] leading-none tracking-[-0.03em] ${
            isBlackState ? "text-white" : "text-black"
          }`}
        >
          {school.name}
        </span>
        {school.location ? (
          <span
            className={`mt-2 block text-sm ${
              isBlackState ? "text-white/70" : "text-black/40"
            }`}
          >
            {school.location}
          </span>
        ) : null}
      </span>
      <span
        className={`pt-1 text-sm uppercase tracking-[0.22em] ${
          isBlackState ? "text-white/75" : "text-black/30"
        }`}
      >
        {isSelected ? "Opening" : isActive ? "Ready" : "Select"}
      </span>
    </button>
  );
}
