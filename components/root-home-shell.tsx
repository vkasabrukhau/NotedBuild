"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mathematics } from "@tiptap/extension-mathematics";
import { StarterKit } from "@tiptap/starter-kit";
import Image from "next/image";
import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, SetStateAction } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

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

type FolderNoteSummary = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  folderId: string | null;
};

type InitialFolder = {
  id: string;
  name: string;
  ownerEmail: string;
  selectedNoteIds: string[];
};

type RootHomeShellProps = {
  initialView?: "home" | "note" | "folder";
  initialNote?: InitialNote | null;
  initialFolder?: InitialFolder | null;
};

function createNoteSignature(noteId: string | null, title: string, content: string) {
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
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getPreviewText(content: string, maxWords = 48) {
  return stripHtml(content).split(" ").filter(Boolean).slice(0, maxWords).join(" ");
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
    const validLetters = new Set(["H", "N", "F", "M", "S", "L", "D", "T"]);

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
                <div
                  key={keys}
                  className="contents"
                >
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

function MenuOverlay({ onClose }: { onClose: () => void }) {
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
                  className="block text-left font-medium transition-opacity duration-150 hover:opacity-65"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto px-2 pb-2 pt-8">
            <div className="mb-4 flex items-center justify-between text-[22px] font-medium leading-none text-black">
              <span>Cloud Storage</span>
              <span>n/250</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-[42%] rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteComponent({ initialNote }: { initialNote?: InitialNote | null }) {
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

  const triggerSavedToast = () => {
    setShowSavedToast(true);
    if (hideSavedTimerRef.current) {
      window.clearTimeout(hideSavedTimerRef.current);
    }
    hideSavedTimerRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
    }, 1800);
  };

  const saveNote = useEffectEvent(
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

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            note?: InitialNote;
          }
        | null;

      if (!response.ok || !data?.note) {
        throw new Error(data?.error || `Failed to save note with ${response.status}`);
      }

      setNoteId(data.note.id);
      lastSavedSignatureRef.current = createNoteSignature(
        data.note.id,
        data.note.name,
        data.note.content,
      );

      triggerSavedToast();
    } catch (error) {
      console.error("note save failed", error);
    } finally {
      isSavingRef.current = false;
    }
    },
  );

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
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [noteId, title, content]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && (event.key === "S" || event.key === "s")) {
        event.preventDefault();
        if (!title.trim()) {
          return;
        }

        void saveNote({ showToastOnNoop: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, noteId, content]);

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
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 text-black shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
          <Image
            src="/check.gif"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="grayscale"
          />
          <span className="text-[20px] font-medium leading-none">Saved</span>
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
  const [folderId, setFolderId] = useState<string | null>(initialFolder?.id ?? null);
  const [titlePlaceholder, setTitlePlaceholder] = useState("");
  const [arePlaceholdersVisible, setArePlaceholdersVisible] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<FolderNoteSummary[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(
    initialFolder?.selectedNoteIds ?? [],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
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
        const data = (await response.json().catch(() => null)) as
          | {
              notes?: FolderNoteSummary[];
            }
          | null;

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
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
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

  const triggerSavedToast = () => {
    setShowSavedToast(true);
    if (hideSavedTimerRef.current) {
      window.clearTimeout(hideSavedTimerRef.current);
    }
    hideSavedTimerRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
    }, 1800);
  };

  const saveFolder = useEffectEvent(
    async ({ showToastOnNoop = false }: { showToastOnNoop?: boolean } = {}) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle || isSavingRef.current) {
        return;
      }

      const signature = createFolderSignature(folderId, trimmedTitle, selectedNoteIds);
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

        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              folder?: InitialFolder;
            }
          | null;

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
      } finally {
        isSavingRef.current = false;
      }
    },
  );

  useEffect(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const signature = createFolderSignature(folderId, trimmedTitle, selectedNoteIds);
    if (signature === lastSavedSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveFolder();
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [folderId, title, selectedNoteIds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && (event.key === "S" || event.key === "s")) {
        event.preventDefault();
        if (!title.trim()) {
          return;
        }

        void saveFolder({ showToastOnNoop: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, folderId, selectedNoteIds]);

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
      setActiveIndex((current) => Math.min(availableNotes.length - 1, current + 1));
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
        })}
      </div>

      {!isLoadingNotes && availableNotes.length === 0 ? (
        <div className="mt-10 text-[22px] font-medium text-black/45">
          No notes yet. Create a note first, then add it to a folder here.
        </div>
      ) : null}

      {showSavedToast ? (
        <div className="folder-saved-toast fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 text-black shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
          <Image
            src="/check.gif"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="grayscale"
          />
          <span className="text-[20px] font-medium leading-none">Saved</span>
        </div>
      ) : null}
    </div>
  );
}

export default function RootHomeShell({
  initialView = "home",
  initialNote = null,
  initialFolder = null,
}: RootHomeShellProps) {
  const [view, setView] = useState<"home" | "note" | "folder">(initialView);
  const [activeNote, setActiveNote] = useState<InitialNote | null>(initialNote);
  const [activeFolder, setActiveFolder] = useState<InitialFolder | null>(initialFolder);
  const [noteSessionKey, setNoteSessionKey] = useState(0);
  const [folderSessionKey, setFolderSessionKey] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        e.preventDefault();
        setIsMenuOpen(false);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setView("home");
        return;
      }

      if (e.ctrlKey && e.shiftKey) {
        if (e.key === "H" || e.key === "h") {
          e.preventDefault();
          setView("home");
        } else if (e.key === "N" || e.key === "n") {
          e.preventDefault();
          setActiveNote(null);
          setNoteSessionKey((current) => current + 1);
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
  }, [isMenuOpen]);

  return (
    <>
      {view === "home" ? <HomeComponent /> : null}
      {view === "note" ? (
        <NoteComponent
          key={activeNote?.id ?? `new-note-${noteSessionKey}`}
          initialNote={activeNote}
        />
      ) : null}
      {view === "folder" ? (
        <FolderComponent
          key={activeFolder?.id ?? `new-folder-${folderSessionKey}`}
          initialFolder={activeFolder}
        />
      ) : null}
      {isMenuOpen ? <MenuOverlay onClose={() => setIsMenuOpen(false)} /> : null}
    </>
  );
}
