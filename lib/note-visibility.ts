export const NOTE_VISIBILITY_OPTIONS = [
  "PRIVATE",
  "SCHOOL",
  "PUBLIC",
] as const;

export type NoteVisibilityId = (typeof NOTE_VISIBILITY_OPTIONS)[number];

export const NOTE_VISIBILITY_LABELS: Record<NoteVisibilityId, string> = {
  PRIVATE: "Private",
  SCHOOL: "School",
  PUBLIC: "Public",
};

export function isNoteVisibilityId(value: unknown): value is NoteVisibilityId {
  return (
    typeof value === "string" &&
    NOTE_VISIBILITY_OPTIONS.includes(value as NoteVisibilityId)
  );
}
