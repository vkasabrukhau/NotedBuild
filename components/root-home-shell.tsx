"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mathematics } from "@tiptap/extension-mathematics";
import { StarterKit } from "@tiptap/starter-kit";
import Image from "next/image";
import ProfileView, { type ProfileViewData } from "@/components/profile/profile-view";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const MATH_TRIGGER_REGEX = /\/math\[([^\]]+)\]$/;
const PLACEHOLDERS = [
  "Jot something down…",
  "Let's start brewing...",
  "Write your next big idea...",
  "Thoughts, notes, reminders...",
  "Start typing your genius here...",
];
const HOME_SHORTCUTS = [
  { key: "H", label: "home" },
  { key: "A", label: "all notes" },
  { key: "N", label: "new note" },
  { key: "F", label: "new folder" },
  { key: "M", label: "menu" },
  { key: "S", label: "save" },
  { key: "L", label: "look" },
  { key: "D", label: "delete" },
  { key: "T", label: "trash" },
] as const;
const HOME_ACTIONS = [
  { keys: "Escape", action: "close" },
  { keys: "Enter", action: "select" },
  { keys: "Arrows", action: "navigate" },
] as const;
const MENU_OPTIONS = [
  "Account",
  "Appearance",
  "Font",
  "Languages",
  "Voices Library",
  "STEM Preferences",
  "たまごっち Preferences",
] as const;

type MathEditorState = {
  pos: number;
  left: number;
  top: number;
  latex: string;
};

type InitialNote = {
  id: string;
  name: string;
  content: string;
  ownerEmail: string;
};

type NoteSummary = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  ownerEmail: string;
  folderId: string | null;
};

type InitialFolder = {
  id: string;
  name: string;
  ownerEmail: string;
  selectedNoteIds: string[];
};

type RootHomeShellProps = {
  initialView?: "home" | "all-notes" | "note" | "folder" | "profile";
  initialNote?: InitialNote | null;
  initialFolder?: InitialFolder | null;
  initialNoteUsageCount?: number;
  profile: ProfileViewData;
};

function createNoteSignature(
  noteId: string | null,
  title: string,
  content: string,
) {
  return JSON.stringify({
    noteId,
    title: title.trim(),
    content,
  });
}

function createFolderSignature(
  folderId: string | null,
  title: string,
  selectedNoteIds: string[],
) {
  return JSON.stringify({
    folderId,
    title: title.trim(),
    selectedNoteIds: [...selectedNoteIds].sort(),
  });
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPreviewText(content: string, maxWords = 48) {
  return stripHtml(content)
    .split(" ")
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function formatAuthoredDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function sanitizeLatex(latex: string) {
  return latex
    .trim()
    .replace(/^```(?:latex)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .trim();
}

function isMathNode(
  node: ProseMirrorNode | null | undefined,
): node is ProseMirrorNode {
  return node?.type.name === "inlineMath" || node?.type.name === "blockMath";
}

function isSaveShortcut(event: {
  key: string;
  code?: string;
  keyCode?: number;
  which?: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}) {
  const normalizedKey = event.key?.toLowerCase?.() ?? "";
  const legacyCode = event.keyCode ?? event.which;
  const isSKey =
    event.code === "KeyS" || normalizedKey === "s" || legacyCode === 83;
  return (
    event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && isSKey
  );
}

function useGlobalSaveShortcut(onSave: () => void) {
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onSaveRef.current();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}

async function convertMathPromptToLatex(
  prompt: string,
): Promise<string | null> {
  const response = await fetch("/api/math-latex", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      data?.error || `Math conversion failed with ${response.status}`,
    );
  }

  const data = (await response.json()) as { latex?: string };
  if (!data.latex?.trim()) {
    return null;
  }

  const cleaned = data.latex
    .trim()
    .replace(/^```(?:latex)?/i, "")
    .replace(/```$/, "")
    .trim();

  return cleaned
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .trim();
}

function HomeComponent() {
  const [pressedKeys, setPressedKeys] = useState<{
    ctrl: boolean;
    shift: boolean;
    letter: string | null;
  }>({
    ctrl: false,
    shift: false,
    letter: null,
  });
  const [headingPrefix, setHeadingPrefix] = useState("");
  const [headingNoting, setHeadingNoting] = useState("");
  const modifierText = "^ + Shift +";

  useEffect(() => {
    const validLetters = new Set(["H", "A", "N", "F", "M", "S", "L", "D", "T"]);

    const handleKeyDown = (event: KeyboardEvent) => {
      const letter = event.key.toUpperCase();

      setPressedKeys({
        ctrl: event.ctrlKey || event.metaKey || event.altKey,
        shift: event.shiftKey,
        letter: validLetters.has(letter) ? letter : null,
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const letter = event.key.toUpperCase();

      setPressedKeys((current) => ({
        ctrl: event.ctrlKey || event.metaKey || event.altKey,
        shift: event.shiftKey,
        letter:
          current.letter === letter && validLetters.has(letter)
            ? null
            : validLetters.has(letter)
              ? letter
              : null,
      }));
    };

    const clearPressedKeys = () => {
      setPressedKeys({
        ctrl: false,
        shift: false,
        letter: null,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearPressedKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearPressedKeys);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const typingDelay = 32;

    const sleep = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    const typeInto = async (
      text: string,
      setter: Dispatch<SetStateAction<string>>,
    ) => {
      for (let index = 0; index < text.length; index += 1) {
        if (cancelled) {
          return;
        }

        setter((prev) => prev + text.charAt(index));
        await sleep(typingDelay);
      }
    };

    const run = async () => {
      await sleep(150);
      await typeInto("Good morning, let's get ", setHeadingPrefix);
      await typeInto("noting", setHeadingNoting);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <h1 className="text-[40px] font-normal leading-none text-black">
        {headingPrefix}
        <span className="font-bold italic">{headingNoting}</span>
        <span className="typewriter-cursor" aria-hidden="true">
          |
        </span>
      </h1>

      <div className="mt-10 grid min-h-[calc(100vh-120px)] gap-10 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="grid grid-cols-[180px_1fr] gap-x-8">
            <div
              className="home-shortcut-group flex items-center justify-center text-[26px] leading-none text-black"
              style={{ animationDelay: "80ms" }}
            >
              <span className="inline-flex">
                {modifierText.split("").map((character, index) => {
                  const isCtrlToken = index === 0 || index === 2;
                  const isShiftToken = index >= 4 && index <= 10;
                  const isActive =
                    (isCtrlToken && pressedKeys.ctrl) ||
                    (isShiftToken && pressedKeys.shift);

                  return (
                    <span
                      key={`${character}-${index}`}
                      className={`whitespace-pre transition-all duration-150 ${
                        isActive ? "scale-105 font-bold" : "font-medium"
                      }`}
                    >
                      {character}
                    </span>
                  );
                })}
              </span>
            </div>

            <div className="space-y-8 text-[26px] leading-none text-black">
              {HOME_SHORTCUTS.map(({ key }, index) => {
                const isActive =
                  pressedKeys.ctrl &&
                  pressedKeys.shift &&
                  pressedKeys.letter === key;

                return (
                  <div
                    key={key}
                    className="home-shortcut-row grid grid-cols-[40px_1fr] gap-x-4"
                    style={{ animationDelay: `${120 + index * 55}ms` }}
                  >
                    <span
                      className={`transition-all duration-150 ${
                        isActive ? "scale-110 font-bold" : "font-medium"
                      }`}
                    >
                      {key}
                    </span>
                    <span
                      className={`transition-all duration-150 ${
                        isActive ? "translate-x-1 font-bold" : "font-medium"
                      }`}
                    >
                      - {HOME_SHORTCUTS[index].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 ml-[188px] grid grid-cols-[140px_1fr] gap-x-4 gap-y-6 text-[24px] leading-none text-black">
            {HOME_ACTIONS.map(({ keys }, index) => {
              return (
                <div key={keys} className="contents">
                  <div
                    className="home-shortcut-row font-medium"
                    style={{ animationDelay: `${520 + index * 70}ms` }}
                  >
                    {keys}
                  </div>
                  <div
                    className="home-shortcut-row font-medium"
                    style={{ animationDelay: `${560 + index * 70}ms` }}
                  >
                    - {HOME_ACTIONS[index].action}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-[40px]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-white/10" />
            <Image
              src="/mylittlecoffeeshop.gif"
              alt="Coffee shop"
              width={1200}
              height={900}
              className="h-auto w-full rounded-[40px] object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuOverlay({
  onClose,
  noteUsageCount,
  onSelectOption,
}: {
  onClose: () => void;
  noteUsageCount: number;
  onSelectOption: (option: (typeof MENU_OPTIONS)[number]) => void;
}) {
  const storageLimit = 250;
  const normalizedNoteUsageCount = Math.max(0, noteUsageCount);
  const storageProgress = Math.min(
    100,
    (normalizedNoteUsageCount / storageLimit) * 100,
  );

  return (
    <div
      className="valtest-menu-overlay fixed inset-0 z-50 bg-black/20"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex h-full items-stretch justify-start p-6">
        <div
          className="valtest-menu-panel flex h-full w-full max-w-[420px] flex-col rounded-[40px] bg-white px-8 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div>
            <h2 className="text-[40px] font-bold leading-none text-black">
              Menu
            </h2>

            <div className="mt-10 space-y-6 text-[28px] leading-none text-black">
              {MENU_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelectOption(option)}
                  className={`block text-left font-medium transition-opacity duration-150 ${
                    option === "Account"
                      ? "hover:opacity-65"
                      : "cursor-default opacity-45"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto px-2 pb-2 pt-8">
            <div className="mb-4 flex items-center justify-between text-[22px] font-medium leading-none text-black">
              <span>Cloud Storage</span>
              <span>{normalizedNoteUsageCount}/250</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-black transition-[width] duration-300 ease-out"
                style={{ width: `${storageProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteGridCard({
  note,
  isSelected = false,
  isActive = false,
  animationDelayMs = 0,
  onClick,
  onFocus,
}: {
  note: NoteSummary;
  isSelected?: boolean;
  isActive?: boolean;
  animationDelayMs?: number;
  onClick: () => void;
  onFocus?: () => void;
}) {
  return (
    <button
      type="button"
      role="gridcell"
      className={`folder-grid-card rounded-[28px] border p-5 text-left ${
        isSelected
          ? "border-black bg-black text-white"
          : "border-black/10 bg-[#f7f7f7] text-black"
      } ${isActive ? "folder-grid-card--active ring-2 ring-black ring-offset-2" : ""} ${
        isSelected ? "folder-grid-card--selected" : ""
      }`}
      style={{
        animationDelay: `${animationDelayMs}ms`,
      }}
      onClick={onClick}
      onFocus={onFocus}
    >
      <div className="text-[24px] font-bold leading-tight">{note.name}</div>
      <div
        className={`mt-4 text-[18px] leading-[1.45] ${
          isSelected ? "text-white/82" : "text-black/70"
        }`}
      >
        {getPreviewText(note.content)}
      </div>
      <div
        className={`mt-5 text-[16px] font-medium leading-none ${
          isSelected ? "text-white/70" : "text-black/55"
        }`}
      >
        {formatAuthoredDate(note.createdAt)}
      </div>
    </button>
  );
}

function AllNotesComponent({
  refreshToken,
  onOpenNote,
}: {
  refreshToken: number;
  onOpenNote: (note: InitialNote) => void;
}) {
  const [headingText, setHeadingText] = useState("");
  const [sortMode, setSortMode] = useState<
    "date-desc" | "date-asc" | "alpha-asc" | "alpha-desc" | "size-desc"
  >("date-desc");
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const typingDelay = 38;
    setHeadingText("");

    const run = async () => {
      for (let index = 0; index < "All Notes".length; index += 1) {
        if (cancelled) {
          return;
        }

        setHeadingText((prev) => prev + "All Notes".charAt(index));
        await new Promise((resolve) => window.setTimeout(resolve, typingDelay));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      setIsLoadingNotes(true);

      try {
        const response = await fetch("/api/notes");
        const data = (await response.json().catch(() => null)) as {
          notes?: NoteSummary[];
        } | null;

        if (!response.ok || !data?.notes || cancelled) {
          return;
        }

        setNotes(data.notes);
        setActiveIndex(data.notes.length > 0 ? 0 : -1);
      } catch (error) {
        console.error("failed to load notes", error);
      } finally {
        if (!cancelled) {
          setIsLoadingNotes(false);
        }
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const sortedNotes = [...notes].sort((left, right) => {
    if (sortMode === "date-desc") {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    }

    if (sortMode === "date-asc") {
      return (
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
    }

    if (sortMode === "alpha-asc") {
      return left.name.localeCompare(right.name);
    }

    if (sortMode === "alpha-desc") {
      return right.name.localeCompare(left.name);
    }

    return stripHtml(right.content).length - stripHtml(left.content).length;
  });

  useEffect(() => {
    if (notes.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((current) =>
      current < 0 ? 0 : Math.min(current, notes.length - 1),
    );
  }, [sortMode, notes.length]);

  useEffect(() => {
    if (!isLoadingNotes && sortedNotes.length > 0) {
      gridRef.current?.focus();
    }
  }, [isLoadingNotes, sortedNotes.length]);

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (sortedNotes.length === 0) {
      return;
    }

    const columnCount = 4;

    if (event.key === "Enter") {
      event.preventDefault();
      const note = sortedNotes[activeIndex];
      if (note) {
        onOpenNote({
          id: note.id,
          name: note.name,
          content: note.content,
          ownerEmail: note.ownerEmail,
        });
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(sortedNotes.length - 1, current + 1),
      );
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(sortedNotes.length - 1, current + columnCount),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - columnCount));
    }
  };

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="flex items-start justify-between gap-6">
        <h1 className="text-[40px] font-bold leading-none text-black">
          {headingText}
          <span className="typewriter-cursor" aria-hidden="true">
            |
          </span>
        </h1>

        <div className="min-w-[260px]">
          <label
            htmlFor="notes-sort"
            className="mb-2 block text-[16px] font-medium uppercase tracking-[0.12em] text-black/45"
          >
            Sort
          </label>
          <select
            id="notes-sort"
            value={sortMode}
            onChange={(event) =>
              setSortMode(
                event.target.value as
                  | "date-desc"
                  | "date-asc"
                  | "alpha-asc"
                  | "alpha-desc"
                  | "size-desc",
              )
            }
            className="w-full rounded-[18px] border border-black/10 bg-[#f7f7f7] px-4 py-3 pr-12 text-[18px] font-medium text-black outline-none"
          >
            <option value="date-desc">Date: newest first</option>
            <option value="date-asc">Date: oldest first</option>
            <option value="alpha-asc">Alphabetical: A-Z</option>
            <option value="alpha-desc">Alphabetical: Z-A</option>
            <option value="size-desc">Note size</option>
          </select>
        </div>
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="All notes"
        className="mt-10 grid grid-cols-1 gap-5 outline-none sm:grid-cols-2 xl:grid-cols-4"
        onKeyDown={handleGridKeyDown}
      >
        {isLoadingNotes
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`all-notes-skeleton-${index}`}
                className="folder-skeleton-card rounded-[28px] border border-black/[0.08] bg-[#f4f4f4] p-5"
              >
                <div className="h-7 w-2/3 rounded-full bg-black/[0.08]" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 rounded-full bg-black/[0.08]" />
                  <div className="h-4 rounded-full bg-black/[0.08]" />
                  <div className="h-4 w-4/5 rounded-full bg-black/[0.08]" />
                </div>
                <div className="mt-6 h-4 w-1/3 rounded-full bg-black/[0.08]" />
              </div>
            ))
          : sortedNotes.map((note, index) => (
              <NoteGridCard
                key={note.id}
                note={note}
                isActive={index === activeIndex}
                animationDelayMs={Math.min(index, 11) * 45}
                onFocus={() => {
                  setActiveIndex(index);
                }}
                onClick={() => {
                  setActiveIndex(index);
                  gridRef.current?.focus();
                  onOpenNote({
                    id: note.id,
                    name: note.name,
                    content: note.content,
                    ownerEmail: note.ownerEmail,
                  });
                }}
              />
            ))}
      </div>

      {!isLoadingNotes && sortedNotes.length === 0 ? (
        <div className="mt-10 text-[22px] font-medium text-black/45">
          No notes yet.
        </div>
      ) : null}
    </div>
  );
}

function NoteComponent({
  initialNote,
  onNoteUsageCountChange,
  onNoteSaved,
  onRequestClose,
}: {
  initialNote?: InitialNote | null;
  onNoteUsageCountChange?: (count: number) => void;
  onNoteSaved?: (note: InitialNote) => void;
  onRequestClose?: () => void;
}) {
  const isConvertingMathRef = useRef(false);
  const isSavingRef = useRef(false);
  const hideSavedTimerRef = useRef<number | null>(null);
  const [mathEditor, setMathEditor] = useState<MathEditorState | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [title, setTitle] = useState(initialNote?.name ?? "");
  const [noteId, setNoteId] = useState<string | null>(initialNote?.id ?? null);
  const [content, setContent] = useState(initialNote?.content ?? "<p></p>");
  const [titlePlaceholder, setTitlePlaceholder] = useState("");
  const [bodyPlaceholder, setBodyPlaceholder] = useState("");
  const [arePlaceholdersVisible, setArePlaceholdersVisible] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [savedToastKey, setSavedToastKey] = useState(0);
  const [savedToastText, setSavedToastText] = useState("Saved");
  const mathInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const shouldAnimatePlaceholders = title.trim().length === 0 && isEditorEmpty;
  const lastSavedSignatureRef = useRef(
    createNoteSignature(
      initialNote?.id ?? null,
      initialNote?.name ?? "",
      initialNote?.content ?? "<p></p>",
    ),
  );

  const triggerSavedToast = (text = "Saved") => {
    setSavedToastText(text);
    setSavedToastKey((current) => current + 1);
    setShowSavedToast(true);
    if (hideSavedTimerRef.current) {
      window.clearTimeout(hideSavedTimerRef.current);
    }
    hideSavedTimerRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
    }, 1800);
  };

  const saveNote = useCallback(
    async ({ showToastOnNoop = false }: { showToastOnNoop?: boolean } = {}) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle || isSavingRef.current) {
        return;
      }

      const signature = createNoteSignature(noteId, trimmedTitle, content);
      if (signature === lastSavedSignatureRef.current) {
        if (showToastOnNoop) {
          triggerSavedToast();
        }
        return;
      }

      isSavingRef.current = true;

      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteId,
            title: trimmedTitle,
            content,
          }),
        });

        const data = (await response.json().catch(() => null)) as {
          error?: string;
          note?: InitialNote;
          noteUsageCount?: number;
        } | null;

        if (!response.ok || !data?.note) {
          throw new Error(
            data?.error || `Failed to save note with ${response.status}`,
          );
        }

        setNoteId(data.note.id);
        if (typeof data.noteUsageCount === "number") {
          onNoteUsageCountChange?.(data.noteUsageCount);
        }
        onNoteSaved?.(data.note);
        lastSavedSignatureRef.current = createNoteSignature(
          data.note.id,
          data.note.name,
          data.note.content,
        );

        triggerSavedToast();
      } catch (error) {
        console.error("note save failed", error);
        triggerSavedToast("Save failed");
      } finally {
        isSavingRef.current = false;
      }
    },
    [content, noteId, onNoteSaved, onNoteUsageCountChange, title],
  );

  const triggerManualSave = useCallback(() => {
    triggerSavedToast("Saving...");

    if (!title.trim()) {
      triggerSavedToast("Add a title first");
      return;
    }

    void saveNote({ showToastOnNoop: true });
  }, [saveNote, title]);

  const handleCloseNoteShortcut = useCallback(
    (event: { preventDefault(): void }) => {
      event.preventDefault();

      void (async () => {
        if (title.trim()) {
          await saveNote({ showToastOnNoop: true });
        }
        onRequestClose?.();
      })();
    },
    [onRequestClose, saveNote, title],
  );

  useGlobalSaveShortcut(() => {
    if (mathEditor) {
      return;
    }

    triggerManualSave();
  });

  const editor = useEditor({
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      setIsEditorEmpty(editor.isEmpty);
      setContent(editor.getHTML());
    },
    onUpdate: ({ editor }) => {
      setIsEditorEmpty(editor.isEmpty);
      setContent(editor.getHTML());
    },
    onFocus: () => {
      setIsEditorFocused(true);
    },
    onBlur: () => {
      setIsEditorFocused(false);
    },
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Note editor",
        class: "w-full min-h-[60vh] focus:outline-none text-left",
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;

        if (event.key === "Escape") {
          handleCloseNoteShortcut(event);
          return true;
        }

        if (
          event.key === "Backspace" &&
          selection.empty &&
          selection.$from.parentOffset === 0 &&
          selection.$from.depth === 1 &&
          selection.$from.index(0) === 0
        ) {
          event.preventDefault();
          const titleInput = titleInputRef.current;
          if (titleInput) {
            titleInput.focus();
            const end = titleInput.value.length;
            titleInput.setSelectionRange(end, end);
          }
          return true;
        }

        if (
          event.key === "ArrowUp" &&
          selection.empty &&
          selection.$from.parentOffset === 0 &&
          selection.$from.depth === 1 &&
          selection.$from.index(0) === 0
        ) {
          event.preventDefault();
          titleInputRef.current?.focus();
          return true;
        }

        if (event.key !== "]") {
          return false;
        }

        window.setTimeout(async () => {
          if (isConvertingMathRef.current) {
            return;
          }

          const { $from } = view.state.selection;

          if (!$from.parent.isTextblock) {
            return;
          }

          const textBeforeCursor = $from.parent.textContent.slice(
            0,
            $from.parentOffset,
          );
          const match = textBeforeCursor.match(MATH_TRIGGER_REGEX);
          const naturalLanguageMath = match?.[1]?.trim();

          if (!match || !naturalLanguageMath) {
            return;
          }

          const from =
            $from.start() + textBeforeCursor.length - match[0].length;
          const to = $from.start() + textBeforeCursor.length;

          isConvertingMathRef.current = true;
          try {
            const latex = await convertMathPromptToLatex(naturalLanguageMath);
            if (!latex) {
              return;
            }

            const inlineMathType = view.state.schema.nodes.inlineMath;
            if (!inlineMathType) {
              return;
            }

            const docSize = view.state.doc.content.size;
            const safeFrom = Math.max(0, Math.min(from, docSize));
            const safeTo = Math.max(safeFrom, Math.min(to, docSize));

            if (safeFrom > safeTo) {
              return;
            }

            const tr = view.state.tr.delete(safeFrom, safeTo);
            const insertPos = tr.mapping.map(safeFrom);
            tr.insert(insertPos, inlineMathType.create({ latex }));
            tr.insertText(" ", insertPos + 1);
            view.dispatch(tr);
          } catch (error) {
            console.error("/math conversion failed", error);
          } finally {
            isConvertingMathRef.current = false;
          }
        }, 0);

        return false;
      },
    },
    extensions: [
      StarterKit,
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
    ],
    content: initialNote?.content ?? "<p></p>",
  });

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!shouldAnimatePlaceholders) {
      setArePlaceholdersVisible(true);
      setTitlePlaceholder("Name your note…");
      setBodyPlaceholder(PLACEHOLDERS[4]);
      return;
    }

    setArePlaceholdersVisible(false);
    setTitlePlaceholder("");
    setBodyPlaceholder("");

    let cancelled = false;
    const typingDelay = 55;
    let startTimer = 0;

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const typeMessage = async (
      message: string,
      setter: (value: string | ((prev: string) => string)) => void,
      startDelay = 0,
    ) => {
      if (cancelled) return;
      await sleep(startDelay);
      if (cancelled) return;
      setter("");
      for (let i = 0; i < message.length; i += 1) {
        if (cancelled) return;
        setter((prev: string) => prev + message.charAt(i));
        await sleep(typingDelay);
      }
      if (!cancelled) setter(message);
    };

    startTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setArePlaceholdersVisible(true);
      void Promise.all([
        typeMessage("Name your note…", setTitlePlaceholder),
        typeMessage(PLACEHOLDERS[4], setBodyPlaceholder),
      ]);
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [shouldAnimatePlaceholders]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleMathClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const wrapper = target?.closest(
        '[data-type="inline-math"], [data-type="block-math"]',
      ) as HTMLElement | null;

      if (!wrapper) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let pos = -1;

      try {
        pos = editor.view.posAtDOM(wrapper, 0);
      } catch {
        pos = -1;
      }

      const candidatePositions = [pos, pos - 1, pos + 1].filter(
        (value) => value >= 0,
      );

      for (const candidatePos of candidatePositions) {
        const node = editor.state.doc.nodeAt(candidatePos);
        if (!isMathNode(node)) {
          continue;
        }

        const coords = editor.view.coordsAtPos(candidatePos);
        setMathEditor({
          pos: candidatePos,
          latex: node.attrs.latex ?? "",
          left: coords.left,
          top: coords.bottom + 8,
        });
        return;
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("click", handleMathClick, true);

    return () => {
      dom.removeEventListener("click", handleMathClick, true);
    };
  }, [editor]);

  useEffect(() => {
    if (!mathEditor) {
      return;
    }

    mathInputRef.current?.focus();
    mathInputRef.current?.setSelectionRange(
      mathInputRef.current.value.length,
      mathInputRef.current.value.length,
    );
  }, [mathEditor]);

  useEffect(() => {
    return () => {
      if (hideSavedTimerRef.current) {
        window.clearTimeout(hideSavedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const signature = createNoteSignature(noteId, trimmedTitle, content);
    if (signature === lastSavedSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveNote();
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [noteId, title, content, saveNote]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mathEditor) {
        handleCloseNoteShortcut(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseNoteShortcut, mathEditor]);

  const saveMathEditor = () => {
    if (!editor || !mathEditor) {
      return;
    }

    const node = editor.state.doc.nodeAt(mathEditor.pos);
    if (!isMathNode(node)) {
      setMathEditor(null);
      return;
    }

    const latex = sanitizeLatex(mathEditor.latex);
    const tr = editor.state.tr;

    if (!latex) {
      tr.delete(mathEditor.pos, mathEditor.pos + node.nodeSize);
    } else if (latex !== node.attrs.latex) {
      tr.setNodeMarkup(mathEditor.pos, node.type, {
        ...node.attrs,
        latex,
      });
    }

    editor.view.dispatch(tr);
    editor.view.focus();
    setMathEditor(null);
  };

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="w-full mb-6">
        <div className="relative">
          {title.length === 0 && arePlaceholdersVisible ? (
            <div className="pointer-events-none absolute inset-0 flex items-center text-[40px] font-bold leading-none text-gray-400">
              <span>{titlePlaceholder}</span>
              <span className="typewriter-cursor" aria-hidden="true">
                |
              </span>
            </div>
          ) : null}
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            className="w-full text-[40px] font-bold text-black bg-transparent border-0 outline-none"
            aria-label="Note title"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                handleCloseNoteShortcut(event);
                return;
              }

              if (event.key === "ArrowDown" || event.key === "Enter") {
                event.preventDefault();
                editor?.chain().focus("start").run();
              }
            }}
          />
        </div>
      </div>

      <div className="relative">
        {!isEditorFocused && isEditorEmpty && arePlaceholdersVisible ? (
          <div className="pointer-events-none absolute left-0 top-0 text-[25px] leading-[1.5] text-gray-400">
            <span>{bodyPlaceholder}</span>
            <span className="typewriter-cursor" aria-hidden="true">
              |
            </span>
          </div>
        ) : null}
        <EditorContent
          editor={editor}
          className="w-full text-[25px] leading-[1.5] text-black"
        />
      </div>
      {mathEditor ? (
        <div
          className="tiptap-math-popover"
          style={{
            position: "fixed",
            left: mathEditor.left,
            top: mathEditor.top,
          }}
        >
          <input
            ref={mathInputRef}
            value={mathEditor.latex}
            onChange={(event) =>
              setMathEditor((current) =>
                current
                  ? {
                      ...current,
                      latex: event.target.value,
                    }
                  : current,
              )
            }
            onBlur={saveMathEditor}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setMathEditor(null);
                editor?.view.focus();
              }

              if (event.key === "Enter") {
                event.preventDefault();
                saveMathEditor();
              }
            }}
            className="tiptap-math-editor-input"
            aria-label="Edit LaTeX math"
            spellCheck={false}
          />
        </div>
      ) : null}
      {showSavedToast ? (
        <div
          key={savedToastKey}
          className="saved-toast fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 text-black shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={savedToastKey}
            src={`/check.gif?toast=${savedToastKey}`}
            alt=""
            width={28}
            height={28}
            className="saved-toast-check grayscale"
            aria-hidden="true"
          />
          <span className="text-[20px] font-medium leading-none">
            {savedToastText}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function FolderComponent({
  initialFolder,
}: {
  initialFolder?: InitialFolder | null;
}) {
  const isSavingRef = useRef(false);
  const hideSavedTimerRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState(initialFolder?.name ?? "");
  const [folderId, setFolderId] = useState<string | null>(
    initialFolder?.id ?? null,
  );
  const [titlePlaceholder, setTitlePlaceholder] = useState("");
  const [arePlaceholdersVisible, setArePlaceholdersVisible] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<NoteSummary[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(
    initialFolder?.selectedNoteIds ?? [],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [savedToastKey, setSavedToastKey] = useState(0);
  const [savedToastText, setSavedToastText] = useState("Saved");
  const lastSavedSignatureRef = useRef(
    createFolderSignature(
      initialFolder?.id ?? null,
      initialFolder?.name ?? "",
      initialFolder?.selectedNoteIds ?? [],
    ),
  );

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (title.trim().length > 0) {
      setArePlaceholdersVisible(true);
      setTitlePlaceholder("Name your folder…");
      return;
    }

    setArePlaceholdersVisible(false);
    setTitlePlaceholder("");

    let cancelled = false;
    const typingDelay = 55;
    let startTimer = 0;

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const typeMessage = async (message: string) => {
      await sleep(150);
      setArePlaceholdersVisible(true);
      for (let i = 0; i < message.length; i += 1) {
        if (cancelled) {
          return;
        }

        setTitlePlaceholder((prev) => prev + message.charAt(i));
        await sleep(typingDelay);
      }
    };

    startTimer = window.setTimeout(() => {
      if (!cancelled) {
        void typeMessage("Name your folder…");
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [title]);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      setIsLoadingNotes(true);

      try {
        const response = await fetch("/api/folders");
        const data = (await response.json().catch(() => null)) as {
          notes?: NoteSummary[];
        } | null;

        if (!response.ok || !data?.notes || cancelled) {
          return;
        }

        const selectedSet = new Set(initialFolder?.selectedNoteIds ?? []);
        const sortedNotes = [...data.notes].sort((left, right) => {
          const leftSelected = selectedSet.has(left.id);
          const rightSelected = selectedSet.has(right.id);

          if (leftSelected !== rightSelected) {
            return leftSelected ? -1 : 1;
          }

          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        });

        if (cancelled) {
          return;
        }

        setAvailableNotes(sortedNotes);
        setActiveIndex(sortedNotes.length > 0 ? 0 : -1);
      } catch (error) {
        console.error("failed to load notes for folder selection", error);
      } finally {
        if (!cancelled) {
          setIsLoadingNotes(false);
        }
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [initialFolder?.selectedNoteIds]);

  useEffect(() => {
    return () => {
      if (hideSavedTimerRef.current) {
        window.clearTimeout(hideSavedTimerRef.current);
      }
    };
  }, []);

  const toggleSelectedNote = (noteId: string) => {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId],
    );
  };

  const triggerSavedToast = (text = "Saved") => {
    setSavedToastText(text);
    setSavedToastKey((current) => current + 1);
    setShowSavedToast(true);
    if (hideSavedTimerRef.current) {
      window.clearTimeout(hideSavedTimerRef.current);
    }
    hideSavedTimerRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
    }, 1800);
  };

  const saveFolder = useCallback(
    async ({ showToastOnNoop = false }: { showToastOnNoop?: boolean } = {}) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle || isSavingRef.current) {
        return;
      }

      const signature = createFolderSignature(
        folderId,
        trimmedTitle,
        selectedNoteIds,
      );
      if (signature === lastSavedSignatureRef.current) {
        if (showToastOnNoop) {
          triggerSavedToast();
        }
        return;
      }

      isSavingRef.current = true;

      try {
        const response = await fetch("/api/folders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folderId,
            title: trimmedTitle,
            selectedNoteIds,
          }),
        });

        const data = (await response.json().catch(() => null)) as {
          error?: string;
          folder?: InitialFolder;
        } | null;

        if (!response.ok || !data?.folder) {
          throw new Error(
            data?.error || `Failed to save folder with ${response.status}`,
          );
        }

        setFolderId(data.folder.id);
        setSelectedNoteIds(data.folder.selectedNoteIds);
        lastSavedSignatureRef.current = createFolderSignature(
          data.folder.id,
          data.folder.name,
          data.folder.selectedNoteIds,
        );
        triggerSavedToast();
      } catch (error) {
        console.error("folder save failed", error);
        triggerSavedToast("Save failed");
      } finally {
        isSavingRef.current = false;
      }
    },
    [folderId, selectedNoteIds, title],
  );

  const triggerManualFolderSave = useCallback(() => {
    triggerSavedToast("Saving...");

    if (!title.trim()) {
      triggerSavedToast("Add a title first");
      return;
    }

    void saveFolder({ showToastOnNoop: true });
  }, [saveFolder, title]);

  useGlobalSaveShortcut(() => {
    triggerManualFolderSave();
  });

  useEffect(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const signature = createFolderSignature(
      folderId,
      trimmedTitle,
      selectedNoteIds,
    );
    if (signature === lastSavedSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveFolder();
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [folderId, saveFolder, selectedNoteIds, title]);

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (availableNotes.length === 0) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        titleInputRef.current?.focus();
      }
      return;
    }

    const columnCount = 4;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const note = availableNotes[activeIndex];
      if (note) {
        toggleSelectedNote(note.id);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(availableNotes.length - 1, current + 1),
      );
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(availableNotes.length - 1, current + columnCount),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (activeIndex < columnCount) {
        titleInputRef.current?.focus();
        return;
      }

      setActiveIndex((current) => Math.max(0, current - columnCount));
    }
  };

  return (
    <div className="min-h-screen w-full bg-white px-6 py-8">
      <div className="w-full mb-8">
        <div className="relative">
          {title.length === 0 && arePlaceholdersVisible ? (
            <div className="pointer-events-none absolute inset-0 flex items-center text-[40px] font-bold leading-none text-gray-400">
              <span>{titlePlaceholder}</span>
              <span className="typewriter-cursor" aria-hidden="true">
                |
              </span>
            </div>
          ) : null}
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            className="w-full text-[40px] font-bold text-black bg-transparent border-0 outline-none"
            aria-label="Folder title"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "Enter") {
                event.preventDefault();
                gridRef.current?.focus();
              }
            }}
          />
        </div>
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="Folder note selection"
        className="grid grid-cols-1 gap-5 outline-none sm:grid-cols-2 xl:grid-cols-4"
        onKeyDown={handleGridKeyDown}
      >
        {isLoadingNotes
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`folder-skeleton-${index}`}
                className="folder-skeleton-card rounded-[28px] border border-black/[0.08] bg-[#f4f4f4] p-5"
              >
                <div className="h-7 w-2/3 rounded-full bg-black/[0.08]" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 rounded-full bg-black/[0.08]" />
                  <div className="h-4 rounded-full bg-black/[0.08]" />
                  <div className="h-4 w-4/5 rounded-full bg-black/[0.08]" />
                </div>
                <div className="mt-6 h-4 w-1/3 rounded-full bg-black/[0.08]" />
              </div>
            ))
          : availableNotes.map((note, index) => {
              const isSelected = selectedNoteIds.includes(note.id);
              const isActive = index === activeIndex;

              return (
                <button
                  key={note.id}
                  type="button"
                  role="gridcell"
                  className={`folder-grid-card rounded-[28px] border p-5 text-left ${
                    isSelected
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-[#f7f7f7] text-black"
                  } ${isActive ? "folder-grid-card--active ring-2 ring-black ring-offset-2" : ""} ${
                    isSelected ? "folder-grid-card--selected" : ""
                  }`}
                  style={{
                    animationDelay: `${Math.min(index, 11) * 45}ms`,
                  }}
                  onClick={() => {
                    setActiveIndex(index);
                    gridRef.current?.focus();
                    toggleSelectedNote(note.id);
                  }}
                >
                  <div className="text-[24px] font-bold leading-tight">
                    {note.name}
                  </div>
                  <div
                    className={`mt-4 text-[18px] leading-[1.45] ${
                      isSelected ? "text-white/82" : "text-black/70"
                    }`}
                  >
                    {getPreviewText(note.content)}
                  </div>
                  <div
                    className={`mt-5 text-[16px] font-medium leading-none ${
                      isSelected ? "text-white/70" : "text-black/55"
                    }`}
                  >
                    {formatAuthoredDate(note.createdAt)}
                  </div>
                </button>
              );
            })}
      </div>

      {!isLoadingNotes && availableNotes.length === 0 ? (
        <div className="mt-10 text-[22px] font-medium text-black/45">
          No notes yet. Create a note first, then add it to a folder here.
        </div>
      ) : null}

      {showSavedToast ? (
        <div
          key={savedToastKey}
          className="saved-toast folder-saved-toast fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 text-black shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={savedToastKey}
            src={`/check.gif?toast=${savedToastKey}`}
            alt=""
            width={28}
            height={28}
            className="saved-toast-check grayscale"
            aria-hidden="true"
          />
          <span className="text-[20px] font-medium leading-none">
            {savedToastText}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function RootHomeShell({
  initialView = "home",
  initialNote = null,
  initialFolder = null,
  initialNoteUsageCount = 0,
  profile,
}: RootHomeShellProps) {
  const [view, setView] = useState<
    "home" | "all-notes" | "note" | "folder" | "profile"
  >(
    initialView,
  );
  const [activeNote, setActiveNote] = useState<InitialNote | null>(initialNote);
  const [activeFolder, setActiveFolder] = useState<InitialFolder | null>(
    initialFolder,
  );
  const [noteSessionKey, setNoteSessionKey] = useState(0);
  const [folderSessionKey, setFolderSessionKey] = useState(0);
  const [noteReturnView, setNoteReturnView] = useState<"home" | "all-notes">(
    "home",
  );
  const [allNotesRefreshToken, setAllNotesRefreshToken] = useState(0);
  const [noteUsageCount, setNoteUsageCount] = useState(initialNoteUsageCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [noteViewAnimationClass, setNoteViewAnimationClass] = useState("");
  const noteTransitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noteTransitionTimerRef.current) {
        window.clearTimeout(noteTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        e.preventDefault();
        setIsMenuOpen(false);
        return;
      }

      if (e.key === "Escape" && view !== "note") {
        e.preventDefault();
        if (view === "all-notes" || view === "folder" || view === "profile") {
          setView("home");
        }
        return;
      }

      if (e.ctrlKey && e.shiftKey) {
        if (e.key === "H" || e.key === "h") {
          e.preventDefault();
          setView("home");
        } else if (e.key === "A" || e.key === "a") {
          e.preventDefault();
          setView("all-notes");
        } else if (e.key === "N" || e.key === "n") {
          e.preventDefault();
          setActiveNote(null);
          setNoteReturnView("home");
          setNoteSessionKey((current) => current + 1);
          setNoteViewAnimationClass("note-view-shell--enter-default");
          setView("note");
        } else if (e.key === "F" || e.key === "f") {
          e.preventDefault();
          setActiveFolder(null);
          setFolderSessionKey((current) => current + 1);
          setView("folder");
        } else if (e.key === "M" || e.key === "m") {
          e.preventDefault();
          setIsMenuOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, view]);

  return (
    <>
      {view === "home" ? <HomeComponent /> : null}
      {view === "all-notes" ? (
        <AllNotesComponent
          refreshToken={allNotesRefreshToken}
          onOpenNote={(note) => {
            setActiveNote(note);
            setNoteReturnView("all-notes");
            setNoteViewAnimationClass("note-view-shell--enter-from-grid");
            setView("note");
          }}
        />
      ) : null}
      {view === "note" ? (
        <div className={noteViewAnimationClass}>
          <NoteComponent
            key={activeNote?.id ?? `new-note-${noteSessionKey}`}
            initialNote={activeNote}
            onNoteUsageCountChange={setNoteUsageCount}
            onNoteSaved={() => {
              setAllNotesRefreshToken((current) => current + 1);
            }}
            onRequestClose={() => {
              if (noteTransitionTimerRef.current) {
                window.clearTimeout(noteTransitionTimerRef.current);
              }

              const nextAnimationClass =
                noteReturnView === "all-notes"
                  ? "note-view-shell--exit-to-grid"
                  : "note-view-shell--exit-default";

              setNoteViewAnimationClass(nextAnimationClass);

              noteTransitionTimerRef.current = window.setTimeout(() => {
                setView(noteReturnView);
                setAllNotesRefreshToken((current) => current + 1);
                setNoteViewAnimationClass("");
              }, 220);
            }}
          />
        </div>
      ) : null}
      {view === "folder" ? (
        <FolderComponent
          key={activeFolder?.id ?? `new-folder-${folderSessionKey}`}
          initialFolder={activeFolder}
        />
      ) : null}
      {view === "profile" ? <ProfileView profile={profile} /> : null}
      {isMenuOpen ? (
        <MenuOverlay
          onClose={() => setIsMenuOpen(false)}
          noteUsageCount={noteUsageCount}
          onSelectOption={(option) => {
            if (option === "Account") {
              setView("profile");
              setIsMenuOpen(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
