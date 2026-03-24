export type SchoolOption = {
  id: string;
  name: string;
  location?: string | null;
};

export type SignUpViewProps = {
  fullName?: string;
  schools?: SchoolOption[];
};

export type CompletionPhase = "hidden" | "enter" | "visible" | "exit";
export type SignUpPanelPhase = "enter" | "idle" | "exit";
export type SuggestionDirection = "up" | "down";

export type ReasonOption = {
  label: string;
  color: string;
};
