"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mathematics } from "@tiptap/extension-mathematics";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

const MATH_TRIGGER_REGEX = /\/math\[([^\]]+)\]$/;

type MathEditorState = {
  pos: number;
  left: number;
  top: number;
  latex: string;
};

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

function isMathNode(node: ProseMirrorNode | null | undefined): node is ProseMirrorNode {
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
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(data?.error || `Math conversion failed with ${response.status}`);
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
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="text-black text-4xl font-bold">home</div>
    </div>
  );
}

function NoteComponent() {
  const isConvertingMathRef = useRef(false);
  const [mathEditor, setMathEditor] = useState<MathEditorState | null>(null);
  const mathInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Note editor",
        class: "w-full min-h-[60vh] focus:outline-none text-left",
      },
      handleKeyDown: (view, event) => {
        if (event.key !== "]") {
          return false;
        }

        window.setTimeout(async () => {
          if (isConvertingMathRef.current) {
            return;
          }

          const { state } = view;
          const { $from } = state.selection;

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
    content: "<p>Start typing your note...</p>",
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleMathClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const wrapper = target?.closest(
        "[data-type=\"inline-math\"], [data-type=\"block-math\"]",
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
        <input
          type="text"
          placeholder="Title"
          className="w-full text-4xl font-bold text-black placeholder:text-gray-400 bg-transparent border-0 outline-none"
          aria-label="Note title"
        />
      </div>

      <EditorContent editor={editor} className="w-full text-black" />
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
    </div>
  );
}

function FolderComponent() {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="text-black text-4xl font-bold">folder</div>
    </div>
  );
}

export default function ValtestPage() {
  const [view, setView] = useState<"home" | "note" | "folder" | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === "H" || e.key === "h") {
          e.preventDefault();
          setView("home");
        } else if (e.key === "N" || e.key === "n") {
          e.preventDefault();
          setView("note");
        } else if (e.key === "F" || e.key === "f") {
          e.preventDefault();
          setView("folder");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (view === "home") return <HomeComponent />;
  if (view === "note") return <NoteComponent />;
  if (view === "folder") return <FolderComponent />;

  return (
    <div className="min-h-screen bg-white">
      {/* Test your components here */}
    </div>
  );
}
