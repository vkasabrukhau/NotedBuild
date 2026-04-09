"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mathematics } from "@tiptap/extension-mathematics";
import { StarterKit } from "@tiptap/starter-kit";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ProfileView from "@/components/profile/profile-view";
import type {
  ProfileSchoolOption,
  ProfileViewData,
  ProfileViewerData,
} from "@/lib/profile-data";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, startTransition } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { swrFetcher } from "@/lib/swr-fetcher";
import { useUser } from "@clerk/nextjs";
import {
  DEV_UNLOCK_ALL,
  SPECIAL_PETS,
  EVOLUTION_LINES,
  getSpeciesClickGif,
  getSpeciesIdleGif,
  getSpeciesName,
  getTier,
  MAX_XP,
} from "@/lib/tamagotchi-config";
import {
  stripHtml,
  getPreviewText,
  formatAuthoredDate,
} from "@/lib/text-utils";

const MATH_TRIGGER_REGEX = /\/math\[([^\]]+)\]$/;
const BODY_PLACEHOLDER = "Start typing your genius here...";
const HOME_SHORTCUTS = [
  { key: "H", label: "home" },
  { key: "A", label: "all items" },
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

const FONTS = [
  {
    id: "doto",
    name: "Doto",
    variable: "--font-doto",
    sample: "Aa Bb Cc",
    description: "Default",
  },
  {
    id: "bitcount",
    name: "Bitcount Grid Double Ink",
    variable: "--font-bitcount",
    sample: "Aa Bb Cc",
    description: "Display",
  },
  {
    id: "roboto",
    name: "Roboto",
    variable: "--font-roboto",
    sample: "Aa Bb Cc",
    description: "Sans-serif",
  },
  {
    id: "sue-ellen",
    name: "Sue Ellen Francisco",
    variable: "--font-sue-ellen",
    sample: "Aa Bb Cc",
    description: "Handwriting",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    variable: "--font-merriweather",
    sample: "Aa Bb Cc",
    description: "Serif",
  },
  {
    id: "lora",
    name: "Lora",
    variable: "--font-lora",
    sample: "Aa Bb Cc",
    description: "Serif",
  },
  {
    id: "source-code-pro",
    name: "Source Code Pro",
    variable: "--font-source-code-pro",
    sample: "Aa Bb Cc",
    description: "Monospace",
  },
  {
    id: "cabin",
    name: "Cabin",
    variable: "--font-cabin",
    sample: "Aa Bb Cc",
    description: "Sans-serif",
  },
];

const THEMES = [
  {
    id: "default",
    name: "Default",
    image: "/themes/default.png",
    cardBg: "#f5f5f5",
    accent: "#000000",
    ink: "#000000",
  },
  {
    id: "black-coffee",
    name: "Black Coffee",
    image: "/themes/black-coffee.png",
    cardBg: "#ece4dc",
    accent: "#6f4e37",
    ink: "#4a2e18",
  },
  {
    id: "latte",
    name: "Latte",
    image: "/themes/latte.png",
    cardBg: "#f0e5d8",
    accent: "#a07850",
    ink: "#5c3d20",
  },
  {
    id: "mocha",
    name: "Mocha",
    image: "/themes/mocha.png",
    cardBg: "#ede0cf",
    accent: "#964b00",
    ink: "#5c2e00",
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    image: "/themes/caramel-macchiato.png",
    cardBg: "#faf0d0",
    accent: "#c49a3c",
    ink: "#7a5c14",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    image: "/themes/cappuccino.png",
    cardBg: "#ede0cc",
    accent: "#b56a25",
    ink: "#6e3a0a",
  },
  {
    id: "light-roast",
    name: "Light Roast",
    image: "/themes/light-roast.png",
    cardBg: "#edd8d8",
    accent: "#a52a2a",
    ink: "#6b1010",
  },
  {
    id: "chai",
    name: "Chai",
    image: "/themes/chai.png",
    cardBg: "#eddfc0",
    accent: "#b8860b",
    ink: "#6b4a00",
  },
];

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

type FolderSummary = {
  id: string;
  name: string;
  noteCount: number;
  ownerEmail: string;
  updatedAt: string;
};

type InitialFolder = {
  id: string;
  name: string;
  ownerEmail: string;
  selectedNoteIds: string[];
};

type OwnedTamagotchi = {
  species: string;
  lineId: string | null;
  displayName: string | null;
  happiness: number;
  isActive: boolean;
  lastClickAt: string | null;
};

type TamagotchiStatus = {
  globalXp: number;
  streak: {
    current: number;
    longest: number;
    totalCheckins: number;
    checkedInToday: boolean;
  };
  tamagotchis: OwnedTamagotchi[];
};

type TamagotchiCheckinResponse = TamagotchiStatus & {
  newUnlocks?: string[];
};

function isOwnedTamagotchi(value: unknown): value is OwnedTamagotchi {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.species === "string" &&
    (typeof candidate.lineId === "string" || candidate.lineId === null) &&
    (typeof candidate.displayName === "string" ||
      candidate.displayName === null) &&
    typeof candidate.happiness === "number" &&
    typeof candidate.isActive === "boolean" &&
    (typeof candidate.lastClickAt === "string" ||
      candidate.lastClickAt === null)
  );
}

function isTamagotchiStatus(value: unknown): value is TamagotchiStatus {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const streak = candidate.streak;

  if (
    !streak ||
    typeof streak !== "object" ||
    !Array.isArray(candidate.tamagotchis)
  ) {
    return false;
  }

  const streakCandidate = streak as Record<string, unknown>;
  return (
    typeof candidate.globalXp === "number" &&
    typeof streakCandidate.current === "number" &&
    typeof streakCandidate.longest === "number" &&
    typeof streakCandidate.totalCheckins === "number" &&
    typeof streakCandidate.checkedInToday === "boolean" &&
    candidate.tamagotchis.every(isOwnedTamagotchi)
  );
}

function isTamagotchiCheckinResponse(
  value: unknown,
): value is TamagotchiCheckinResponse {
  if (!isTamagotchiStatus(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.newUnlocks === undefined ||
    (Array.isArray(candidate.newUnlocks) &&
      candidate.newUnlocks.every((unlock) => typeof unlock === "string"))
  );
}

type RootHomeShellProps = {
  initialView?: "home" | "all-notes" | "note" | "folder" | "profile";
  initialNote?: InitialNote | null;
  initialFolder?: InitialFolder | null;
  initialNoteUsageCount?: number;
  profile: ProfileViewData;
  schools: ProfileSchoolOption[];
  viewer: ProfileViewerData;
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

const TAMAGOTCHI_DISPLAY: Record<
  string,
  { scale: number; translateY: string }
> = {
  // Special pets
  bear: { scale: 1.869, translateY: "-10%" },
  mewtwo: { scale: 0.74, translateY: "0%" },
  snorlax: { scale: 0.627, translateY: "0%" },
  // Skeleton line
  skeleton_spearman: { scale: 1.0, translateY: "0%" },
  skeleton_warrior: { scale: 1.0, translateY: "0%" },
  skeleton_archer: { scale: 1.0, translateY: "0%" },
  // Wizard line
  lightning_mage: { scale: 1.0, translateY: "0%" },
  fire_wizard: { scale: 1.0, translateY: "0%" },
  wanderer_magician: { scale: 1.0, translateY: "0%" },
  // Ninja line
  kunoichi: { scale: 1.0, translateY: "0%" },
  ninja_monk: { scale: 1.0, translateY: "0%" },
  ninja_peasant: { scale: 1.0, translateY: "0%" },
  // Karasu line
  karasu_tengu: { scale: 1.0, translateY: "0%" },
  kitsune: { scale: 1.0, translateY: "0%" },
  yamabushi_tengu: { scale: 1.0, translateY: "0%" },
  // Samurai line
  samurai: { scale: 1.0, translateY: "0%" },
  samurai_archer: { scale: 1.0, translateY: "0%" },
  samurai_commander: { scale: 1.0, translateY: "0%" },
};

function HomeComponent({
  activeTamagotchi,
  globalXp,
  onTamagotchiClick,
  onRename,
}: {
  activeTamagotchi: OwnedTamagotchi | null;
  globalXp: number;
  onTamagotchiClick: () => void;
  onRename: (name: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [heartVisible, setHeartVisible] = useState(false);
  const heartTimerRef = useRef<number | null>(null);
  const [clickGifUrl, setClickGifUrl] = useState<string | null>(null);
  const [clickKey, setClickKey] = useState(0);
  const clickTimerRef = useRef<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const [pressedKeys, setPressedKeys] = useState<{
    ctrl: boolean;
    shift: boolean;
    letter: string | null;
  }>({
    ctrl: false,
    shift: false,
    letter: null,
  });
  const { user } = useUser();
  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "";

  const [headingGreeting, setHeadingGreeting] = useState("");
  const [headingName, setHeadingName] = useState("");
  const [headingMid, setHeadingMid] = useState("");
  const [headingNoting, setHeadingNoting] = useState("");
  const modifierText = "^ + Shift +";

  useEffect(() => {
    const validLetters = new Set(["H", "A", "N", "F", "M", "S", "L", "D", "T"]);

    const handleKeyDown = (event: KeyboardEvent) => {
      const letter = event.key.toUpperCase();

      setPressedKeys({
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        letter: validLetters.has(letter) ? letter : null,
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const letter = event.key.toUpperCase();

      setPressedKeys((current) => ({
        ctrl: event.ctrlKey,
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

    setHeadingGreeting("");
    setHeadingName("");
    setHeadingMid("");
    setHeadingNoting("");

    const hour = new Date().getHours();
    const timeGreeting =
      hour >= 5 && hour < 12
        ? "Good morning"
        : hour >= 12 && hour < 17
          ? "Good afternoon"
          : "Good evening";

    const run = async () => {
      await sleep(150);
      await typeInto(`${timeGreeting}, `, setHeadingGreeting);
      if (firstName) {
        await typeInto(firstName, setHeadingName);
        await typeInto(", let's get ", setHeadingMid);
      } else {
        await typeInto("let's get ", setHeadingMid);
      }
      await typeInto("noting", setHeadingNoting);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [firstName]);

  return (
    <div className="h-screen overflow-hidden w-full bg-white px-6 py-8">
      <h1 className="text-[40px] font-normal leading-none text-black">
        {headingGreeting}
        <span className="font-bold italic">{headingName}</span>
        {headingMid}
        <span className="font-bold italic">{headingNoting}</span>
        <span className="typewriter-cursor" aria-hidden="true">
          |
        </span>
      </h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
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

        <div className="flex h-full flex-col items-start lg:col-span-2">
          {activeTamagotchi ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setHeartVisible(true);
                  if (heartTimerRef.current)
                    window.clearTimeout(heartTimerRef.current);
                  heartTimerRef.current = window.setTimeout(
                    () => setHeartVisible(false),
                    900,
                  );
                  onTamagotchiClick();

                  const actionGif = getSpeciesClickGif(
                    activeTamagotchi.species,
                  );
                  if (actionGif) {
                    if (clickTimerRef.current)
                      window.clearTimeout(clickTimerRef.current);
                    setClickGifUrl(actionGif);
                    setClickKey((k) => k + 1);
                    clickTimerRef.current = window.setTimeout(() => {
                      setClickGifUrl(null);
                    }, 1400);
                  }
                }}
                className="relative flex h-[80%] w-full flex-col items-center justify-center overflow-hidden rounded-[40px] transition-opacity duration-150 hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={
                    clickGifUrl
                      ? `click-${clickKey}`
                      : `idle-${activeTamagotchi.species}`
                  }
                  src={
                    clickGifUrl ?? getSpeciesIdleGif(activeTamagotchi.species)
                  }
                  alt={
                    activeTamagotchi.displayName ??
                    getSpeciesName(activeTamagotchi.species)
                  }
                  className="h-[98%] w-auto object-contain drop-shadow-lg"
                  style={{
                    imageRendering: "pixelated",
                    transform: `translateY(${(TAMAGOTCHI_DISPLAY[activeTamagotchi.species] ?? { scale: 1, translateY: "0%" }).translateY}) scale(${(TAMAGOTCHI_DISPLAY[activeTamagotchi.species] ?? { scale: 1, translateY: "0%" }).scale})`,
                    transformOrigin: "center",
                  }}
                />
                {heartVisible ? (
                  <span
                    className="pointer-events-none absolute text-4xl"
                    style={{ animation: "floatHeart 900ms ease-out forwards" }}
                  >
                    💗
                  </span>
                ) : null}
              </button>

              {/* Name + stats */}
              <div className="mt-4 w-full px-1">
                <div className="flex items-center gap-2">
                  {isRenaming ? (
                    <form
                      className="flex flex-1 items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onRename(renameValue);
                        setIsRenaming(false);
                      }}
                    >
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setIsRenaming(false);
                        }}
                        onBlur={() => setIsRenaming(false)}
                        className="w-full bg-transparent text-[22px] font-medium text-black outline-none border-b border-black/30 focus:border-black/60"
                        placeholder={getSpeciesName(activeTamagotchi.species)}
                        maxLength={24}
                      />
                    </form>
                  ) : (
                    <>
                      <span className="text-[22px] font-medium text-black">
                        {activeTamagotchi.displayName ??
                          getSpeciesName(activeTamagotchi.species)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameValue(
                            activeTamagotchi.displayName ??
                              getSpeciesName(activeTamagotchi.species),
                          );
                          setIsRenaming(true);
                        }}
                        className="text-[16px] text-black/30 transition-colors hover:text-black/60"
                        title="Rename"
                      >
                        ✎
                      </button>
                    </>
                  )}
                </div>

                {/* Happiness bar (0–10) */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[12px] font-medium text-black/40">
                    <span>💗 Happiness</span>
                    <span>{activeTamagotchi.happiness}/10</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-black/50 transition-all duration-500"
                      style={{
                        width: `${(activeTamagotchi.happiness / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* XP bar (0–1200) */}
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-[12px] font-medium text-black/40">
                    <span>✨ XP</span>
                    <span>
                      {globalXp}/{MAX_XP}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-black/30 transition-all duration-500"
                      style={{ width: `${(globalXp / MAX_XP) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

function MenuOverlay({
  onClose,
  noteUsageCount,
  onSelectOption,
  animationClass = "overlay-enter",
}: {
  onClose: () => void;
  noteUsageCount: number;
  onSelectOption: (option: (typeof MENU_OPTIONS)[number]) => void;
  animationClass?: string;
}) {
  const isExiting = animationClass === "overlay-exit";
  const storageLimit = 250;
  const normalizedNoteUsageCount = Math.max(0, noteUsageCount);
  const storageProgress = Math.min(
    100,
    (normalizedNoteUsageCount / storageLimit) * 100,
  );

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % MENU_OPTIONS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(
          (prev) => (prev - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelectOption(MENU_OPTIONS[focusedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, onSelectOption]);

  return (
    <div
      className="valtest-menu-overlay fixed inset-0 z-50 bg-black/20"
      style={{
        animation: isExiting
          ? "backdropExit 200ms cubic-bezier(0.4, 0, 1, 1) forwards"
          : "backdropEnter 280ms cubic-bezier(0.22, 0.68, 0, 1.05)",
        pointerEvents: isExiting ? "none" : undefined,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div className="flex h-full items-stretch justify-start p-6">
        <div
          className="valtest-menu-panel flex h-full w-full max-w-[420px] flex-col rounded-[40px] bg-white px-8 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
          style={{
            animation: isExiting
              ? "menuPanelExit 200ms cubic-bezier(0.4, 0, 1, 1) forwards"
              : "menuPanelEnter 280ms cubic-bezier(0.22, 0.68, 0, 1.05)",
          }}
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
              {MENU_OPTIONS.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onMouseEnter={() => setFocusedIndex(index)}
                  onClick={() => onSelectOption(option)}
                  className={`flex items-center gap-3 text-left font-medium transition-opacity duration-150 ${
                    focusedIndex === index ? "opacity-100" : "opacity-45"
                  } ${option !== "Account" ? "cursor-default" : ""}`}
                >
                  <span className="w-6 font-mono font-medium text-black">
                    {focusedIndex === index ? ">" : ""}
                  </span>
                  <span className="font-medium">{option}</span>
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

function AppearanceOverlay({
  onClose,
  currentTheme,
  onThemeSelect,
  animationClass = "overlay-enter",
}: {
  onClose: () => void;
  currentTheme: string;
  onThemeSelect: (themeId: string) => void;
  animationClass?: string;
}) {
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      THEMES.findIndex((t) => t.id === currentTheme),
    ),
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cols = 4;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % THEMES.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + THEMES.length) % THEMES.length);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + cols) % THEMES.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(
          (prev) => (prev - cols + THEMES.length) % THEMES.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        onThemeSelect(THEMES[focusedIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, onThemeSelect]);

  const rows = [THEMES.slice(0, 4), THEMES.slice(4, 8)];

  return (
    <div
      className={`valtest-menu-overlay fixed inset-0 z-50 flex h-full flex-col overflow-hidden bg-white px-6 py-8 ${animationClass}`}
      role="dialog"
      aria-modal="true"
      aria-label="Appearance"
    >
      <h1 className="text-[40px] font-bold leading-none text-black">
        Appearance
      </h1>

      <div className="flex flex-1 flex-col justify-evenly">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-evenly">
            {row.map((theme, colIndex) => {
              const index = rowIndex * 4 + colIndex;
              const isSelected = theme.id === currentTheme;
              const isFocused = focusedIndex === index;
              const isActive = isSelected || isFocused;

              return (
                <div key={theme.id} className="flex w-[320px] flex-col gap-3">
                  <button
                    type="button"
                    className="aspect-square w-full overflow-hidden rounded-[28px]"
                    style={{
                      backgroundColor: theme.cardBg,
                      outline: isSelected
                        ? `3px solid ${theme.accent}`
                        : isFocused
                          ? `2px solid ${theme.accent}80`
                          : "2px solid transparent",
                      outlineOffset: "3px",
                      boxShadow: isSelected
                        ? `0 8px 24px ${theme.accent}38`
                        : isFocused
                          ? `0 4px 14px ${theme.accent}22`
                          : "0 2px 6px rgba(0,0,0,0.06)",
                      transition:
                        "box-shadow 180ms ease, outline-color 180ms ease, outline-width 180ms ease",
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onClick={() => onThemeSelect(theme.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={theme.image}
                      alt={theme.name}
                      className="h-full w-full object-contain p-8"
                    />
                  </button>

                  <div
                    className="flex items-center gap-2 px-1 text-[16px] leading-tight"
                    style={{
                      color: isActive ? theme.ink : `${theme.ink}99`,
                      fontWeight: isSelected ? 700 : isFocused ? 600 : 500,
                      transition: "color 180ms ease",
                    }}
                  >
                    {isSelected && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: theme.accent }}
                      >
                        ✓
                      </span>
                    )}
                    {theme.name}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function FontOverlay({
  onClose,
  currentFont,
  onFontSelect,
  animationClass = "overlay-enter",
}: {
  onClose: () => void;
  currentFont: string;
  onFontSelect: (fontId: string) => void;
  animationClass?: string;
}) {
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      FONTS.findIndex((f) => f.id === currentFont),
    ),
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cols = 4;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % FONTS.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + FONTS.length) % FONTS.length);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + cols) % FONTS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - cols + FONTS.length) % FONTS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onFontSelect(FONTS[focusedIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, onFontSelect]);

  const rows = [FONTS.slice(0, 4), FONTS.slice(4, 8)];

  return (
    <div
      className={`valtest-menu-overlay fixed inset-0 z-50 flex h-full flex-col overflow-hidden bg-white px-6 py-8 ${animationClass}`}
      role="dialog"
      aria-modal="true"
      aria-label="Font"
    >
      <h1 className="text-[40px] font-bold leading-none text-black">Font</h1>

      <div className="flex flex-1 flex-col justify-evenly">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-evenly">
            {row.map((font, colIndex) => {
              const index = rowIndex * 4 + colIndex;
              const isSelected = font.id === currentFont;
              const isFocused = focusedIndex === index;
              const isActive = isSelected || isFocused;

              return (
                <div key={font.id} className="flex w-[320px] flex-col gap-3">
                  <button
                    type="button"
                    className="aspect-square w-full overflow-hidden rounded-[28px] bg-[var(--app-card)] flex flex-col items-center justify-center gap-2"
                    style={{
                      outline: isSelected
                        ? "3px solid var(--app-ink)"
                        : isFocused
                          ? "2px solid color-mix(in srgb, var(--app-ink) 50%, transparent)"
                          : "2px solid transparent",
                      outlineOffset: "3px",
                      boxShadow: isSelected
                        ? "0 8px 24px color-mix(in srgb, var(--app-ink) 14%, transparent)"
                        : isFocused
                          ? "0 4px 14px color-mix(in srgb, var(--app-ink) 8%, transparent)"
                          : "0 2px 6px rgba(0,0,0,0.06)",
                      transition:
                        "box-shadow 180ms ease, outline-color 180ms ease, outline-width 180ms ease",
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onClick={() => onFontSelect(font.id)}
                  >
                    <span
                      className="text-[72px] leading-none text-black"
                      style={{ fontFamily: `var(${font.variable})` }}
                    >
                      Aa
                    </span>
                    <span
                      className="text-[13px] text-black/40"
                      style={{ fontFamily: `var(${font.variable})` }}
                    >
                      {font.description}
                    </span>
                  </button>

                  <div
                    className="flex items-center gap-2 px-1 text-[16px] leading-tight text-black"
                    style={{
                      opacity: isActive ? 1 : 0.6,
                      fontWeight: isSelected ? 700 : isFocused ? 600 : 500,
                      transition: "opacity 180ms ease",
                    }}
                  >
                    {isSelected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    {font.name}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TamagotchiPreferencesOverlay({
  onClose,
  status,
  onSelectSpecies,
  onRename,
  animationClass = "overlay-enter",
}: {
  onClose: () => void;
  status: TamagotchiStatus;
  onSelectSpecies: (speciesId: string | null) => void;
  onRename: (species: string, name: string) => void;
  animationClass?: string;
}) {
  const { globalXp } = status;
  const ownedMap = useMemo(
    () => new Map(status.tamagotchis.map((t) => [t.species, t])),
    [status.tamagotchis],
  );
  const lineOwnedMap = useMemo(
    () =>
      new Map(
        status.tamagotchis.filter((t) => t.lineId).map((t) => [t.lineId!, t]),
      ),
    [status.tamagotchis],
  );
  const activeTama = status.tamagotchis.find((t) => t.isActive);

  // Flat ordered list of selectable items (unlocked tiers + owned special pets)
  const navigableItems = useMemo(() => {
    const items: string[] = [];
    for (const line of EVOLUTION_LINES) {
      for (const tier of line.tiers) {
        if (DEV_UNLOCK_ALL || globalXp >= tier.xpThreshold) items.push(tier.id);
      }
    }
    for (const pet of SPECIAL_PETS) {
      if (DEV_UNLOCK_ALL || ownedMap.has(pet.id)) items.push(pet.id);
    }
    return items;
  }, [globalXp, ownedMap]);

  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(0, navigableItems.indexOf(activeTama?.species ?? "")),
  );
  const focusSpecies = useCallback(
    (speciesId: string) => {
      const nextIndex = navigableItems.indexOf(speciesId);
      if (nextIndex >= 0) {
        setFocusedIndex(nextIndex);
      }
    },
    [navigableItems],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Auto-scroll focused card into view
  useEffect(() => {
    const speciesId = navigableItems[focusedIndex];
    if (!speciesId) return;
    const el = cardRefs.current.get(speciesId);
    if (el && scrollRef.current) {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [focusedIndex, navigableItems]);

  const navigableItemsRef = useRef(navigableItems);
  const focusedIndexRef = useRef(focusedIndex);
  const onSelectSpeciesRef = useRef(onSelectSpecies);

  useEffect(() => {
    navigableItemsRef.current = navigableItems;
    focusedIndexRef.current = focusedIndex;
    onSelectSpeciesRef.current = onSelectSpecies;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const items = navigableItemsRef.current;
      const cur = focusedIndexRef.current;
      const tierCount = EVOLUTION_LINES.reduce((n, l) => n + l.tiers.length, 0);
      if (e.key === "ArrowRight") {
        setFocusedIndex(Math.min(items.length - 1, cur + 1));
      } else if (e.key === "ArrowLeft") {
        setFocusedIndex(Math.max(0, cur - 1));
      } else if (e.key === "ArrowDown") {
        if (cur < tierCount && items.length > tierCount) {
          setFocusedIndex(tierCount);
        }
      } else if (e.key === "ArrowUp") {
        if (cur >= tierCount && tierCount > 0) {
          setFocusedIndex(tierCount - 1);
        }
      } else if (e.key === "Enter") {
        const speciesId = items[cur];
        if (speciesId) onSelectSpeciesRef.current(speciesId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [renamingSpecies, setRenamingSpecies] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renamingSpecies && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSpecies]);

  // ── Layout constants ──────────────────────────────────────────────────────
  const SCALE = 5.0; // px per XP unit — determines horizontal spacing
  const PAD_X = 220; // left/right padding in the scrollable canvas
  const CARD_W = 150; // card width
  const CARD_H = 150; // card height
  const IMG_SIZE = 135; // character image size inside card
  const DOT_NEW = 24; // dot diameter for new-line starts
  const DOT_EVO = 16; // dot diameter for evolutions
  const TICK_H = 18; // vertical tick below track before XP label
  const TIMELINE_Y = 340; // y-position of the horizontal track line (px from scroll area top)
  const CANVAS_H = 560; // total height of the scrollable canvas
  const GAP_CARD_TRACK = 28; // gap between card bottom and track line
  const GAP_TRACK_LABEL = 6; // gap between track dot edge and tick start
  const totalW = PAD_X * 2 + MAX_XP * SCALE;

  const xpToX = (xp: number) => PAD_X + xp * SCALE;

  // All 15 evolution checkpoints in XP order
  const checkpoints = EVOLUTION_LINES.flatMap((line) =>
    line.tiers.map((tier, tierIdx) => ({
      tier,
      line,
      isNewLine: tierIdx === 0,
      isUnlocked: DEV_UNLOCK_ALL || globalXp >= tier.xpThreshold,
    })),
  );

  return (
    <div
      className={`valtest-menu-overlay fixed inset-0 z-50 flex flex-col bg-white outline-none ${animationClass}`}
      role="dialog"
      aria-modal="true"
      aria-label="Tamagotchi Preferences"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-black/8 px-8 py-5">
        <div className="flex items-baseline gap-4">
          <h1 className="text-[36px] font-bold leading-none text-black">
            たまごっち
          </h1>
          {status.streak.current > 0 && (
            <span className="text-[18px] font-medium text-black/45">
              🔥 {status.streak.current} day streak
            </span>
          )}
          <div className="ml-auto text-[14px] font-medium text-black/45">
            ✨ {globalXp} / {MAX_XP} XP
          </div>
        </div>

        {/* Global XP bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full bg-black/35 transition-all duration-500"
            style={{ width: `${(globalXp / MAX_XP) * 100}%` }}
          />
        </div>

        {/* Active pet callout */}
        <p className="mt-2 text-[13px] text-black/40">
          {activeTama ? (
            <>
              <span className="font-medium text-black/60">
                {activeTama.displayName ?? getSpeciesName(activeTama.species)}
              </span>
              {" is on your home screen · "}
              <button
                type="button"
                onClick={() => onSelectSpecies(null)}
                className="underline transition-colors hover:text-black/70"
              >
                deselect
              </button>
            </>
          ) : (
            "Select a character below to place it on your home screen"
          )}
        </p>
      </div>

      {/* ── Horizontal scrollable timeline ────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
        }}
      >
        <div
          className="relative select-none"
          style={{ width: totalW, height: CANVAS_H, minHeight: CANVAS_H }}
        >
          {/* ── Track: background (unfilled) */}
          <div
            className="absolute rounded-full bg-black/8"
            style={{
              top: TIMELINE_Y - 1,
              left: PAD_X,
              width: MAX_XP * SCALE,
              height: 3,
            }}
          />
          {/* ── Track: progress fill */}
          <div
            className="absolute rounded-full bg-black/30 transition-all duration-700"
            style={{
              top: TIMELINE_Y - 1,
              left: PAD_X,
              width: Math.min(globalXp, MAX_XP) * SCALE,
              height: 3,
            }}
          />
          {/* ── Current XP position marker */}
          {globalXp > 0 && globalXp < MAX_XP && (
            <div
              className="absolute"
              style={{
                top: TIMELINE_Y - 7,
                left: xpToX(Math.min(globalXp, MAX_XP)),
                transform: "translateX(-50%)",
              }}
            >
              <div className="h-[15px] w-[15px] rounded-full bg-black shadow-lg ring-[3px] ring-white" />
            </div>
          )}

          {/* ── Checkpoint nodes ─────────────────────────────────────────── */}
          {checkpoints.map(({ tier, line, isNewLine, isUnlocked }) => {
            const x = xpToX(tier.xpThreshold);
            const lineOwned = lineOwnedMap.get(line.id);
            const isThisTierActive = activeTama?.species === tier.id;
            const isThisTierSelected = lineOwned?.species === tier.id;
            const dotSize = isNewLine ? DOT_NEW : DOT_EVO;
            const cardTop = TIMELINE_Y - GAP_CARD_TRACK - CARD_H - 36; // extra 36px for name area above card
            const dotTop = TIMELINE_Y - dotSize / 2;
            const tickTop = TIMELINE_Y + dotSize / 2 + GAP_TRACK_LABEL;
            const labelTop = tickTop + TICK_H + 6;

            const isRenaming = renamingSpecies === tier.id;
            const displayName =
              lineOwned?.species === tier.id
                ? (lineOwned.displayName ?? tier.name)
                : tier.name;

            return (
              <div
                key={tier.id}
                className="absolute"
                style={{ left: x, top: 0, width: 0 }}
              >
                {/* ── Card + name ─────────────────────────────────────────── */}
                <div
                  className="absolute flex flex-col items-center gap-3"
                  style={{
                    top: cardTop,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: CARD_W + 40,
                  }}
                >
                  <button
                    ref={(el) => {
                      if (el) cardRefs.current.set(tier.id, el);
                    }}
                    type="button"
                    onClick={() => {
                      if (!isUnlocked) return;
                      focusSpecies(tier.id);
                      onSelectSpecies(tier.id);
                    }}
                    onFocus={() => focusSpecies(tier.id)}
                    onMouseEnter={() => focusSpecies(tier.id)}
                    className="flex items-center justify-center rounded-[22px] transition-all duration-150"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      backgroundColor: isUnlocked
                        ? "var(--app-card)"
                        : "color-mix(in srgb, var(--app-card) 38%, transparent)",
                      outline: isThisTierActive
                        ? "3px solid var(--app-ink)"
                        : navigableItems[focusedIndex] === tier.id
                          ? "3px solid color-mix(in srgb, var(--app-ink) 55%, transparent)"
                          : isThisTierSelected
                            ? "2px solid color-mix(in srgb, var(--app-ink) 40%, transparent)"
                            : "2px solid transparent",
                      outlineOffset: "3px",
                      boxShadow: isThisTierActive
                        ? "0 8px 30px color-mix(in srgb, var(--app-ink) 18%, transparent)"
                        : navigableItems[focusedIndex] === tier.id
                          ? "0 6px 22px color-mix(in srgb, var(--app-ink) 14%, transparent)"
                          : isUnlocked
                            ? "0 3px 12px rgba(0,0,0,0.09)"
                            : "none",
                      cursor:
                        isUnlocked && !isThisTierActive ? "pointer" : "default",
                    }}
                  >
                    {isUnlocked ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={tier.idleGif}
                        alt={tier.name}
                        style={{
                          height: IMG_SIZE,
                          width: IMG_SIZE,
                          objectFit: "contain",
                          imageRendering: "pixelated",
                        }}
                      />
                    ) : (
                      <span className="select-none text-[32px] font-light text-black/12">
                        ?
                      </span>
                    )}
                  </button>

                  {/* Name + rename (unlocked only) */}
                  {isUnlocked && (
                    <>
                      {isRenaming ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            onRename(tier.id, renameValue);
                            setRenamingSpecies(null);
                          }}
                        >
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setRenamingSpecies(null);
                            }}
                            onBlur={() => setRenamingSpecies(null)}
                            className="w-full rounded-md border border-black/20 bg-transparent px-2 py-0.5 text-center text-[14px] text-black outline-none focus:border-black/50"
                            style={{ maxWidth: CARD_W + 20 }}
                            placeholder={tier.name}
                            maxLength={24}
                          />
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-center text-[14px] font-semibold leading-tight text-black/70"
                            style={{ maxWidth: CARD_W + 20 }}
                          >
                            {displayName}
                          </span>
                          {(isThisTierActive || isThisTierSelected) && (
                            <button
                              type="button"
                              onClick={() => {
                                setRenameValue(displayName);
                                setRenamingSpecies(tier.id);
                              }}
                              className="shrink-0 text-[13px] text-black/25 transition-colors hover:text-black/55"
                              title="Rename"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      )}
                      {isThisTierActive && (
                        <span className="rounded-full bg-black px-3 py-0.5 text-[11px] font-bold text-white">
                          ✓ Active
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* ── Timeline dot ─────────────────────────────────────────── */}
                <div
                  className="absolute rounded-full transition-all duration-300"
                  style={{
                    top: dotTop,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: isUnlocked
                      ? isThisTierActive || isThisTierSelected
                        ? "var(--app-ink)"
                        : "color-mix(in srgb, var(--app-ink) 60%, transparent)"
                      : "#d0d0d0",
                    boxShadow:
                      isNewLine && isUnlocked
                        ? "0 0 0 6px color-mix(in srgb, var(--app-ink) 10%, transparent)"
                        : undefined,
                  }}
                />

                {/* ── Vertical tick line below track ────────────────────────── */}
                <div
                  className="absolute"
                  style={{
                    top: tickTop,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 1.5,
                    height: TICK_H,
                    backgroundColor: isNewLine
                      ? "color-mix(in srgb, var(--app-ink) 25%, transparent)"
                      : "color-mix(in srgb, var(--app-ink) 12%, transparent)",
                  }}
                />

                {/* ── XP label ─────────────────────────────────────────────── */}
                <div
                  className="absolute"
                  style={{
                    top: labelTop,
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    className="rounded-full px-3 py-1 font-mono font-bold"
                    style={{
                      fontSize: isNewLine ? 14 : 12,
                      backgroundColor: isNewLine
                        ? "color-mix(in srgb, var(--app-ink) 8%, transparent)"
                        : "transparent",
                      color: isNewLine
                        ? "color-mix(in srgb, var(--app-ink) 65%, transparent)"
                        : "color-mix(in srgb, var(--app-ink) 35%, transparent)",
                    }}
                  >
                    {tier.xpThreshold} xp
                  </span>
                </div>

                {/* ── "New line" badge ─────────────────────────────────────── */}
                {isNewLine && tier.xpThreshold > 0 && (
                  <div
                    className="absolute rounded-full border border-black/10 px-2.5 py-px text-center text-[10px] font-semibold uppercase tracking-widest text-black/35"
                    style={{
                      top: labelTop + 32,
                      left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    new line
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Special pets strip ────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-black/8 px-8 py-5">
        <div className="flex items-center gap-8">
          <div className="flex items-end gap-6">
            {SPECIAL_PETS.map((pet) => {
              const owned = DEV_UNLOCK_ALL
                ? (ownedMap.get(pet.id) ?? {
                    species: pet.id,
                    displayName: null,
                    happiness: 10,
                    isActive: false,
                    lineId: null,
                    lastClickAt: null,
                  })
                : ownedMap.get(pet.id);
              const isActive = activeTama?.species === pet.id;
              const petDisplayName = owned?.displayName ?? pet.name;
              const isRenaming = renamingSpecies === pet.id;
              return (
                <div key={pet.id} className="flex flex-col items-center gap-2">
                  <button
                    ref={(el) => {
                      if (el) cardRefs.current.set(pet.id, el);
                    }}
                    type="button"
                    onClick={() => {
                      if (!owned) return;
                      focusSpecies(pet.id);
                      onSelectSpecies(pet.id);
                    }}
                    onFocus={() => focusSpecies(pet.id)}
                    onMouseEnter={() => focusSpecies(pet.id)}
                    className="flex h-[96px] w-[96px] items-center justify-center rounded-[22px] transition-all duration-150"
                    style={{
                      backgroundColor: owned
                        ? "var(--app-card)"
                        : "color-mix(in srgb, var(--app-card) 38%, transparent)",
                      outline: isActive
                        ? "3px solid var(--app-ink)"
                        : navigableItems[focusedIndex] === pet.id
                          ? "3px solid color-mix(in srgb, var(--app-ink) 55%, transparent)"
                          : "2px solid transparent",
                      outlineOffset: "3px",
                      boxShadow: isActive
                        ? "0 6px 20px color-mix(in srgb, var(--app-ink) 16%, transparent)"
                        : navigableItems[focusedIndex] === pet.id
                          ? "0 4px 16px color-mix(in srgb, var(--app-ink) 14%, transparent)"
                          : owned
                            ? "0 2px 8px rgba(0,0,0,0.07)"
                            : "none",
                      cursor: owned ? "pointer" : "default",
                    }}
                  >
                    {owned ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={pet.idleGif}
                        alt={pet.name}
                        style={{
                          height: 82,
                          width: 82,
                          objectFit: "contain",
                          imageRendering: "pixelated",
                          transform:
                            pet.id === "bear" ? "scale(1.55)" : undefined,
                        }}
                      />
                    ) : (
                      <span className="select-none text-[26px] text-black/12">
                        ?
                      </span>
                    )}
                  </button>
                  {owned && (
                    <>
                      {isRenaming ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            onRename(pet.id, renameValue);
                            setRenamingSpecies(null);
                          }}
                        >
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setRenamingSpecies(null);
                            }}
                            onBlur={() => setRenamingSpecies(null)}
                            className="w-[80px] rounded-md border border-black/20 bg-transparent px-1.5 py-0.5 text-center text-[13px] text-black outline-none"
                            placeholder={pet.name}
                            maxLength={24}
                          />
                        </form>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-semibold text-black/60">
                            {petDisplayName}
                          </span>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setRenameValue(petDisplayName);
                                setRenamingSpecies(pet.id);
                              }}
                              className="text-[13px] text-black/25 transition-colors hover:text-black/55"
                              title="Rename"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      )}
                      {isActive && (
                        <span className="rounded-full bg-black px-2.5 py-px text-[10px] font-bold text-white">
                          ✓ Active
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
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
          : "border-black/10 bg-[var(--app-card)] text-black"
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

function FolderGridCard({
  folder,
  isActive = false,
  animationDelayMs = 0,
  onClick,
  onFocus,
}: {
  folder: FolderSummary;
  isActive?: boolean;
  animationDelayMs?: number;
  onClick: () => void;
  onFocus?: () => void;
}) {
  return (
    <button
      type="button"
      role="gridcell"
      className={`folder-grid-card rounded-[28px] border p-5 text-left border-black/10 bg-[var(--app-card)] text-black ${isActive ? "folder-grid-card--active ring-2 ring-black ring-offset-2" : ""}`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      onClick={onClick}
      onFocus={onFocus}
    >
      <div className="text-[18px] font-semibold leading-none text-black/40 uppercase tracking-[0.12em]">
        Folder
      </div>
      <div className="mt-3 text-[24px] font-bold leading-tight">
        {folder.name}
      </div>
      <div className="mt-5 text-[16px] font-medium leading-none text-black/55">
        {folder.noteCount} {folder.noteCount === 1 ? "note" : "notes"}
      </div>
    </button>
  );
}

function useSavedToast() {
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [savedToastKey, setSavedToastKey] = useState(0);
  const [savedToastText, setSavedToastText] = useState("Saved");
  const hideSavedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideSavedTimerRef.current)
        window.clearTimeout(hideSavedTimerRef.current);
    };
  }, []);

  const triggerSavedToast = useCallback((text = "Saved") => {
    setSavedToastText(text);
    setSavedToastKey((current) => current + 1);
    setShowSavedToast(true);
    if (hideSavedTimerRef.current) {
      window.clearTimeout(hideSavedTimerRef.current);
    }
    hideSavedTimerRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
    }, 1800);
  }, []);

  return { showSavedToast, savedToastKey, savedToastText, triggerSavedToast };
}

function AllItemsComponent({
  onOpenNote,
  onOpenFolder,
}: {
  onOpenNote: (note: InitialNote) => void;
  onOpenFolder: (folder: InitialFolder) => void;
}) {
  const [headingText, setHeadingText] = useState("");
  const [sortMode, setSortMode] = useState<
    "date-desc" | "date-asc" | "alpha-asc" | "alpha-desc" | "size-desc"
  >("date-desc");
  const [activeSection, setActiveSection] = useState<"folders" | "notes">(
    "folders",
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const foldersGridRef = useRef<HTMLDivElement | null>(null);
  const notesGridRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedSection = useRef(false);

  const { data: notesData, isLoading: notesLoading } = useSWR<{
    notes: NoteSummary[];
  }>("/api/notes", swrFetcher);
  const { data: foldersData, isLoading: foldersLoading } = useSWR<{
    folders: FolderSummary[];
  }>("/api/folders?view=folders", swrFetcher);
  const notes = notesData?.notes ?? [];
  const folders = foldersData?.folders ?? [];
  const isLoading = notesLoading || foldersLoading;

  // Set initial active section once data first arrives
  useEffect(() => {
    if (isLoading || hasInitializedSection.current) return;
    hasInitializedSection.current = true;
    if (folders.length > 0) {
      setActiveSection("folders");
      setActiveIndex(0);
    } else if (notes.length > 0) {
      setActiveSection("notes");
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [isLoading, folders.length, notes.length]);

  useEffect(() => {
    let cancelled = false;
    const typingDelay = 38;
    setHeadingText("");

    const run = async () => {
      for (let index = 0; index < "All Items".length; index += 1) {
        if (cancelled) return;
        setHeadingText((prev) => prev + "All Items".charAt(index));
        await new Promise((resolve) => window.setTimeout(resolve, typingDelay));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((left, right) => {
        if (sortMode === "date-desc")
          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        if (sortMode === "date-asc")
          return (
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime()
          );
        if (sortMode === "alpha-asc")
          return left.name.localeCompare(right.name);
        if (sortMode === "alpha-desc")
          return right.name.localeCompare(left.name);
        return stripHtml(right.content).length - stripHtml(left.content).length;
      }),
    [notes, sortMode],
  );

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((left, right) => {
        if (sortMode === "alpha-asc")
          return left.name.localeCompare(right.name);
        if (sortMode === "alpha-desc")
          return right.name.localeCompare(left.name);
        // default: date-desc / date-asc by updatedAt
        if (sortMode === "date-asc")
          return (
            new Date(left.updatedAt).getTime() -
            new Date(right.updatedAt).getTime()
          );
        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      }),
    [folders, sortMode],
  );

  useEffect(() => {
    if (!isLoading) {
      if (activeSection === "folders" && sortedFolders.length > 0) {
        foldersGridRef.current?.focus();
      } else if (activeSection === "notes" && sortedNotes.length > 0) {
        notesGridRef.current?.focus();
      }
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFoldersKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (sortedFolders.length === 0) return;
      const columnCount = 4;

      if (event.key === "Enter") {
        event.preventDefault();
        const folder = sortedFolders[activeIndex];
        if (folder) {
          const selectedNoteIds = notes
            .filter((n) => n.folderId === folder.id)
            .map((n) => n.id);
          onOpenFolder({
            id: folder.id,
            name: folder.name,
            ownerEmail: folder.ownerEmail,
            selectedNoteIds,
          });
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((c) => Math.max(0, c - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((c) => Math.min(sortedFolders.length - 1, c + 1));
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = activeIndex + columnCount;
        if (next < sortedFolders.length) {
          setActiveIndex(next);
        } else if (sortedNotes.length > 0) {
          setActiveSection("notes");
          setActiveIndex(0);
          notesGridRef.current?.focus();
        }
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((c) => Math.max(0, c - columnCount));
      }
    },
    [sortedFolders, sortedNotes, activeIndex, notes, onOpenFolder],
  );

  const handleNotesKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (sortedNotes.length === 0) return;
      const columnCount = 4;

      if (event.key === "Enter") {
        event.preventDefault();
        const note = sortedNotes[activeIndex];
        if (note)
          onOpenNote({
            id: note.id,
            name: note.name,
            content: note.content,
            ownerEmail: note.ownerEmail,
          });
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((c) => Math.max(0, c - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((c) => Math.min(sortedNotes.length - 1, c + 1));
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((c) =>
          Math.min(sortedNotes.length - 1, c + columnCount),
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = activeIndex - columnCount;
        if (prev >= 0) {
          setActiveIndex(prev);
        } else if (sortedFolders.length > 0) {
          setActiveSection("folders");
          setActiveIndex(Math.min(activeIndex, sortedFolders.length - 1));
          foldersGridRef.current?.focus();
        }
      }
    },
    [sortedNotes, sortedFolders, activeIndex, onOpenNote],
  );

  const skeletons = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="folder-skeleton-card rounded-[28px] border border-black/[0.08] bg-[var(--app-card-alt)] p-5"
        >
          <div className="h-7 w-2/3 rounded-full bg-black/[0.08]" />
          <div className="mt-5 space-y-3">
            <div className="h-4 rounded-full bg-black/[0.08]" />
            <div className="h-4 rounded-full bg-black/[0.08]" />
            <div className="h-4 w-4/5 rounded-full bg-black/[0.08]" />
          </div>
          <div className="mt-6 h-4 w-1/3 rounded-full bg-black/[0.08]" />
        </div>
      )),
    [],
  );

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
            htmlFor="items-sort"
            className="mb-2 block text-[16px] font-medium uppercase tracking-[0.12em] text-black/45"
          >
            Sort
          </label>
          <select
            id="items-sort"
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
            className="w-full rounded-[18px] border border-black/10 bg-[var(--app-card)] px-4 py-3 pr-12 text-[18px] font-medium text-black outline-none"
          >
            <option value="date-desc">Date: newest first</option>
            <option value="date-asc">Date: oldest first</option>
            <option value="alpha-asc">Alphabetical: A-Z</option>
            <option value="alpha-desc">Alphabetical: Z-A</option>
            <option value="size-desc">Note size</option>
          </select>
        </div>
      </div>

      {/* Folders section */}
      {isLoading || sortedFolders.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-4 text-[18px] font-semibold uppercase tracking-[0.14em] text-black/40">
            Folders
          </h2>
          <div
            ref={foldersGridRef}
            tabIndex={0}
            role="grid"
            aria-label="Folders"
            className="grid grid-cols-1 gap-5 outline-none sm:grid-cols-2 xl:grid-cols-4"
            onKeyDown={handleFoldersKeyDown}
            onFocus={() => setActiveSection("folders")}
          >
            {isLoading
              ? skeletons
              : sortedFolders.map((folder, index) => (
                  <FolderGridCard
                    key={folder.id}
                    folder={folder}
                    isActive={
                      activeSection === "folders" && index === activeIndex
                    }
                    animationDelayMs={Math.min(index, 11) * 45}
                    onFocus={() => {
                      setActiveSection("folders");
                      setActiveIndex(index);
                    }}
                    onClick={() => {
                      setActiveSection("folders");
                      setActiveIndex(index);
                      foldersGridRef.current?.focus();
                      const selectedNoteIds = notes
                        .filter((n) => n.folderId === folder.id)
                        .map((n) => n.id);
                      onOpenFolder({
                        id: folder.id,
                        name: folder.name,
                        ownerEmail: folder.ownerEmail,
                        selectedNoteIds,
                      });
                    }}
                  />
                ))}
          </div>
        </div>
      ) : null}

      {/* Notes section */}
      {isLoading || sortedNotes.length > 0 ? (
        <div
          className={sortedFolders.length > 0 || isLoading ? "mt-10" : "mt-10"}
        >
          <h2 className="mb-4 text-[18px] font-semibold uppercase tracking-[0.14em] text-black/40">
            Notes
          </h2>
          <div
            ref={notesGridRef}
            tabIndex={0}
            role="grid"
            aria-label="All notes"
            className="grid grid-cols-1 gap-5 outline-none sm:grid-cols-2 xl:grid-cols-4"
            onKeyDown={handleNotesKeyDown}
            onFocus={() => setActiveSection("notes")}
          >
            {isLoading
              ? skeletons
              : sortedNotes.map((note, index) => (
                  <NoteGridCard
                    key={note.id}
                    note={note}
                    isActive={
                      activeSection === "notes" && index === activeIndex
                    }
                    animationDelayMs={Math.min(index, 11) * 45}
                    onFocus={() => {
                      setActiveSection("notes");
                      setActiveIndex(index);
                    }}
                    onClick={() => {
                      setActiveSection("notes");
                      setActiveIndex(index);
                      notesGridRef.current?.focus();
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
        </div>
      ) : null}

      {!isLoading && sortedFolders.length === 0 && sortedNotes.length === 0 ? (
        <div className="mt-10 text-[22px] font-medium text-black/45">
          No items yet.
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
  const [mathEditor, setMathEditor] = useState<MathEditorState | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [title, setTitle] = useState(initialNote?.name ?? "");
  const [noteId, setNoteId] = useState<string | null>(initialNote?.id ?? null);
  const [content, setContent] = useState(initialNote?.content ?? "<p></p>");
  const [titlePlaceholder, setTitlePlaceholder] = useState("");
  const [bodyPlaceholder, setBodyPlaceholder] = useState("");
  const [arePlaceholdersVisible, setArePlaceholdersVisible] = useState(false);
  const { showSavedToast, savedToastKey, savedToastText, triggerSavedToast } =
    useSavedToast();
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
    [
      content,
      noteId,
      onNoteSaved,
      onNoteUsageCountChange,
      title,
      triggerSavedToast,
    ],
  );

  const triggerManualSave = useCallback(() => {
    triggerSavedToast("Saving...");

    if (!title.trim()) {
      triggerSavedToast("Add a title first");
      return;
    }

    void saveNote({ showToastOnNoop: true });
  }, [saveNote, title, triggerSavedToast]);

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
      setBodyPlaceholder(BODY_PLACEHOLDER);
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
        typeMessage(BODY_PLACEHOLDER, setBodyPlaceholder),
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
  const { showSavedToast, savedToastKey, savedToastText, triggerSavedToast } =
    useSavedToast();
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

  const toggleSelectedNote = (noteId: string) => {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId],
    );
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
    [folderId, selectedNoteIds, title, triggerSavedToast],
  );

  const triggerManualFolderSave = useCallback(() => {
    triggerSavedToast("Saving...");

    if (!title.trim()) {
      triggerSavedToast("Add a title first");
      return;
    }

    void saveFolder({ showToastOnNoop: true });
  }, [saveFolder, title, triggerSavedToast]);

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
                className="folder-skeleton-card rounded-[28px] border border-black/[0.08] bg-[var(--app-card-alt)] p-5"
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
                      : "border-black/10 bg-[var(--app-card)] text-black"
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
  schools,
  viewer,
}: RootHomeShellProps) {
  const router = useRouter();
  const [view, setView] = useState<
    "home" | "all-notes" | "note" | "folder" | "profile"
  >(initialView);
  const [activeNote, setActiveNote] = useState<InitialNote | null>(initialNote);
  const [activeFolder, setActiveFolder] = useState<InitialFolder | null>(
    initialFolder,
  );
  const [noteSessionKey, setNoteSessionKey] = useState(0);
  const [folderSessionKey, setFolderSessionKey] = useState(0);
  const [noteReturnView, setNoteReturnView] = useState<"home" | "all-notes">(
    "home",
  );
  const refreshNotesAndFolders = useCallback(() => {
    void swrMutate("/api/notes");
    void swrMutate("/api/folders?view=folders");
  }, []);
  const [noteUsageCount, setNoteUsageCount] = useState(initialNoteUsageCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [isTamagotchiOpen, setIsTamagotchiOpen] = useState(false);
  const [closingOverlay, setClosingOverlay] = useState<
    "menu" | "appearance" | "font" | "tamagotchi" | null
  >(null);
  const closeOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const closeOverlay = useCallback(
    (name: "menu" | "appearance" | "font" | "tamagotchi") => {
      if (closeOverlayTimerRef.current)
        clearTimeout(closeOverlayTimerRef.current);
      setClosingOverlay(name);
      closeOverlayTimerRef.current = setTimeout(() => {
        setClosingOverlay(null);
        if (name === "menu") setIsMenuOpen(false);
        else if (name === "appearance") setIsAppearanceOpen(false);
        else if (name === "font") setIsFontOpen(false);
        else if (name === "tamagotchi") setIsTamagotchiOpen(false);
      }, 200);
    },
    [],
  );

  const [closingView, setClosingView] = useState<
    "all-notes" | "folder" | "profile" | null
  >(null);
  const closeViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeView = useCallback(
    (name: "all-notes" | "folder" | "profile", andThen?: () => void) => {
      if (closeViewTimerRef.current) clearTimeout(closeViewTimerRef.current);
      setClosingView(name);
      closeViewTimerRef.current = setTimeout(() => {
        setClosingView(null);
        setView("home");
        andThen?.();
      }, 200);
    },
    [],
  );
  const [currentTheme, setCurrentTheme] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("noted-theme") ?? "default") : "default",
  );
  const [currentFont, setCurrentFont] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("noted-font") ?? "doto") : "doto",
  );
  const [tamagotchiStatus, setTamagotchiStatus] =
    useState<TamagotchiStatus | null>(null);
  const [newUnlockToast, setNewUnlockToast] = useState<string[]>([]);
  const [noteViewAnimationClass, setNoteViewAnimationClass] = useState("");
  const noteTransitionTimerRef = useRef<number | null>(null);
  const reloadTamagotchiStatus = useCallback(async () => {
    const response = await fetch("/api/tamagotchi", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Failed to reload tamagotchi state.");
    }

    const data: unknown = await response.json();
    if (!isTamagotchiStatus(data)) {
      throw new Error("Invalid tamagotchi status.");
    }

    setTamagotchiStatus(data);
    return data;
  }, []);

  // Init theme + font from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("noted-theme") ?? "default";
    document.documentElement.setAttribute("data-theme", saved);
    setCurrentTheme(saved);

    const savedFont = localStorage.getItem("noted-font") ?? "doto";
    document.body.setAttribute("data-font", savedFont);
    setCurrentFont(savedFont);
  }, []);

  // Daily tamagotchi check-in on mount
  useEffect(() => {
    void fetch("/api/tamagotchi/checkin", { method: "POST" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok || !isTamagotchiCheckinResponse(data)) {
          throw new Error("Invalid tamagotchi response.");
        }

        setTamagotchiStatus(data);
        const newUnlocks = data.newUnlocks ?? [];

        if (newUnlocks.length > 0) {
          setNewUnlockToast(newUnlocks);
        }
      })
      .catch(() => {
        // silent — tamagotchi is non-critical
      });
  }, []);

  const applyTheme = useCallback((themeId: string) => {
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("noted-theme", themeId);
    setCurrentTheme(themeId);
    // Track first style change for Snorlax unlock
    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "hasMadeFirstStyleChange" }),
    }).catch(() => {});
  }, []);

  const applyFont = useCallback((fontId: string) => {
    document.body.setAttribute("data-font", fontId);
    localStorage.setItem("noted-font", fontId);
    setCurrentFont(fontId);
    // Track first font change for Snorlax unlock
    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "hasMadeFirstFontChange" }),
    }).catch(() => {});
  }, []);

  const handleMenuItemSelect = useCallback((option: string) => {
    if (option === "Appearance") {
      setIsMenuOpen(false);
      setIsAppearanceOpen(true);
    } else if (option === "Font") {
      setIsMenuOpen(false);
      setIsFontOpen(true);
    } else if (option === "たまごっち Preferences") {
      setIsMenuOpen(false);
      setIsTamagotchiOpen(true);
    }
    // other menu items: no action yet
  }, []);

  useEffect(() => {
    return () => {
      if (noteTransitionTimerRef.current) {
        window.clearTimeout(noteTransitionTimerRef.current);
      }
      if (closeViewTimerRef.current) {
        clearTimeout(closeViewTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        isAppearanceOpen &&
        closingOverlay !== "appearance"
      ) {
        e.preventDefault();
        closeOverlay("appearance");
        return;
      }

      if (e.key === "Escape" && isFontOpen && closingOverlay !== "font") {
        e.preventDefault();
        closeOverlay("font");
        return;
      }

      if (
        e.key === "Escape" &&
        isTamagotchiOpen &&
        closingOverlay !== "tamagotchi"
      ) {
        e.preventDefault();
        closeOverlay("tamagotchi");
        return;
      }

      if (e.key === "Escape" && isMenuOpen && closingOverlay !== "menu") {
        e.preventDefault();
        closeOverlay("menu");
        return;
      }

      if (e.key === "Escape" && view !== "note" && closingView === null) {
        e.preventDefault();
        if (view === "all-notes" || view === "folder" || view === "profile") {
          closeView(view, () => {
            if (window.location.pathname !== "/") {
              router.push("/");
            }
          });
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
  }, [
    isMenuOpen,
    isAppearanceOpen,
    isFontOpen,
    isTamagotchiOpen,
    view,
    closingOverlay,
    closingView,
    closeOverlay,
    closeView,
    router,
  ]);

  const activeTamagotchi =
    tamagotchiStatus?.tamagotchis?.find((t) => t.isActive) ?? null;

  return (
    <>
      {view === "home" ? (
        <div className="view-enter">
          <HomeComponent
            key={activeTamagotchi?.species ?? "homepage-default"}
            activeTamagotchi={activeTamagotchi}
            globalXp={tamagotchiStatus?.globalXp ?? 0}
            onTamagotchiClick={() => {
              // Fire click API (happiness boost) — non-blocking
              void fetch("/api/tamagotchi/click", { method: "POST" })
                .then(async (res) => {
                  if (!res.ok) return;
                  const data = (await res.json()) as { happiness?: number };
                  if (typeof data.happiness === "number") {
                    setTamagotchiStatus((prev) =>
                      prev
                        ? {
                            ...prev,
                            tamagotchis: prev.tamagotchis.map((t) =>
                              t.isActive
                                ? { ...t, happiness: data.happiness! }
                                : t,
                            ),
                          }
                        : prev,
                    );
                  }
                })
                .catch(() => {});
            }}
            onRename={(name) => {
              const active = activeTamagotchi;
              if (!active) return;
              void fetch("/api/tamagotchi/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ species: active.species, name }),
              }).then(() => {
                setTamagotchiStatus((prev) =>
                  prev
                    ? {
                        ...prev,
                        tamagotchis: prev.tamagotchis.map((t) =>
                          t.isActive ? { ...t, displayName: name || null } : t,
                        ),
                      }
                    : prev,
                );
              });
            }}
          />
        </div>
      ) : null}
      {view === "all-notes" || closingView === "all-notes" ? (
        <div
          className={closingView === "all-notes" ? "view-exit" : "view-enter"}
        >
          <AllItemsComponent
            onOpenNote={(note) => {
              setActiveNote(note);
              setNoteReturnView("all-notes");
              setNoteViewAnimationClass("note-view-shell--enter-from-grid");
              setView("note");
            }}
            onOpenFolder={(folder) => {
              setActiveFolder(folder);
              setView("folder");
            }}
          />
        </div>
      ) : null}
      {view === "note" ? (
        <div className={noteViewAnimationClass}>
          <NoteComponent
            key={activeNote?.id ?? `new-note-${noteSessionKey}`}
            initialNote={activeNote}
            onNoteUsageCountChange={setNoteUsageCount}
            onNoteSaved={() => {
              refreshNotesAndFolders();
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
                refreshNotesAndFolders();
                setNoteViewAnimationClass("");
                if (window.location.pathname !== "/") {
                  router.push("/");
                }
              }, 220);
            }}
          />
        </div>
      ) : null}
      {view === "folder" || closingView === "folder" ? (
        <div className={closingView === "folder" ? "view-exit" : "view-enter"}>
          <FolderComponent
            key={activeFolder?.id ?? `new-folder-${folderSessionKey}`}
            initialFolder={activeFolder}
          />
        </div>
      ) : null}
      {view === "profile" || closingView === "profile" ? (
        <div className={closingView === "profile" ? "view-exit" : "view-enter"}>
          <ProfileView profile={profile} schools={schools} viewer={viewer} />
        </div>
      ) : null}
      {isMenuOpen || closingOverlay === "menu" ? (
        <MenuOverlay
          animationClass={
            closingOverlay === "menu" ? "overlay-exit" : "overlay-enter"
          }
          onClose={() => closeOverlay("menu")}
          noteUsageCount={noteUsageCount}
          onSelectOption={(option) => {
            handleMenuItemSelect(option);

            if (option === "Account") {
              setView("profile");
              closeOverlay("menu");
            }
          }}
        />
      ) : null}
      {isAppearanceOpen || closingOverlay === "appearance" ? (
        <AppearanceOverlay
          animationClass={
            closingOverlay === "appearance" ? "overlay-exit" : "overlay-enter"
          }
          onClose={() => closeOverlay("appearance")}
          currentTheme={currentTheme}
          onThemeSelect={(themeId) => {
            applyTheme(themeId);
            closeOverlay("appearance");
          }}
        />
      ) : null}
      {isFontOpen || closingOverlay === "font" ? (
        <FontOverlay
          animationClass={
            closingOverlay === "font" ? "overlay-exit" : "overlay-enter"
          }
          onClose={() => closeOverlay("font")}
          currentFont={currentFont}
          onFontSelect={(fontId) => {
            applyFont(fontId);
            closeOverlay("font");
          }}
        />
      ) : null}
      {(isTamagotchiOpen || closingOverlay === "tamagotchi") &&
      tamagotchiStatus ? (
        <TamagotchiPreferencesOverlay
          key={activeTamagotchi?.species ?? "tamagotchi-none"}
          animationClass={
            closingOverlay === "tamagotchi" ? "overlay-exit" : "overlay-enter"
          }
          onClose={() => closeOverlay("tamagotchi")}
          status={tamagotchiStatus}
          onSelectSpecies={(speciesId) => {
            if (!speciesId) {
              // Deselect all — show homepage GIF
              void fetch("/api/tamagotchi/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ species: null }),
              })
                .then(async (response) => {
                  if (!response.ok) {
                    return;
                  }

                  await reloadTamagotchiStatus();
                })
                .catch(() => {});
              return;
            }
            // Use upgrade endpoint (creates record if needed, sets active)
            void fetch("/api/tamagotchi/upgrade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ speciesId }),
            })
              .then(async (response) => {
                if (!response.ok) {
                  return;
                }

                await reloadTamagotchiStatus();
              })
              .catch(() => {});
          }}
          onRename={(species, name) => {
            void fetch("/api/tamagotchi/rename", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ species, name }),
            }).then(() => {
              setTamagotchiStatus((prev) =>
                prev
                  ? {
                      ...prev,
                      tamagotchis: prev.tamagotchis.map((t) =>
                        t.species === species
                          ? { ...t, displayName: name || null }
                          : t,
                      ),
                    }
                  : prev,
              );
            });
          }}
        />
      ) : null}
      {newUnlockToast.length > 0 ? (
        <div className="saved-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[20px] bg-black px-5 py-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {newUnlockToast.map((s) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={s}
                  src={getSpeciesIdleGif(s)}
                  alt={getSpeciesName(s)}
                  className="h-10 w-10 rounded-full bg-white/10 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ))}
            </div>
            <div>
              <div className="text-[16px] font-bold leading-tight">
                {newUnlockToast.length === 1
                  ? `${getSpeciesName(newUnlockToast[0] ?? "")} unlocked!`
                  : `${newUnlockToast.length} new companions unlocked!`}
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewUnlockToast([]);
                  setIsTamagotchiOpen(true);
                }}
                className="mt-0.5 text-[13px] text-white/70 underline"
              >
                View in たまごっち Preferences
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewUnlockToast([])}
              className="ml-2 text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
