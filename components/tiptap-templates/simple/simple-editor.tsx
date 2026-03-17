"use client"

import { useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { Editor as TiptapEditor } from "@tiptap/core"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"
import { CustomMathematics } from "@/components/tiptap-extension/custom-mathematics-extension"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

import content from "@/components/tiptap-templates/simple/data/content.json"

type MathEditorState = {
  left: number
  top: number
  pos: number
  latex: string
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
    .trim()
}

function isMathNode(
  node: ProseMirrorNode | null | undefined
): node is ProseMirrorNode {
  return node?.type.name === "inlineMath" || node?.type.name === "blockMath"
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor() {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const [mathEditor, setMathEditor] = useState<MathEditorState | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const mathInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)

  const openMathEditor = (pos: number, node: ProseMirrorNode) => {
    const activeEditor = editorRef.current
    if (!activeEditor) {
      return
    }

    const coords = activeEditor.view.coordsAtPos(pos)
    setMathEditor({
      pos,
      latex: node.attrs.latex ?? "",
      left: coords.left,
      top: coords.bottom + 8,
    })
  }

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      CustomMathematics.configure({
        endpoint: "/api/math-latex",
        katexOptions: {
          throwOnError: false,
        },
      }),
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handleMathClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const wrapper = target?.closest(
        "[data-type=\"inline-math\"], [data-type=\"block-math\"]"
      ) as HTMLElement | null

      if (!wrapper) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      let pos = -1

      try {
        pos = editor.view.posAtDOM(wrapper, 0)
      } catch {
        pos = -1
      }

      const candidatePositions = [pos, pos - 1, pos + 1].filter(
        (value) => value >= 0
      )

      for (const candidatePos of candidatePositions) {
        const node = editor.state.doc.nodeAt(candidatePos)
        if (isMathNode(node)) {
          openMathEditor(candidatePos, node)
          return
        }
      }
    }

    const dom = editor.view.dom
    dom.addEventListener("click", handleMathClick, true)

    return () => {
      dom.removeEventListener("click", handleMathClick, true)
    }
  }, [editor])

  useEffect(() => {
    if (!mathEditor) {
      return
    }

    mathInputRef.current?.focus()
    mathInputRef.current?.setSelectionRange(
      mathInputRef.current.value.length,
      mathInputRef.current.value.length
    )
  }, [mathEditor])

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handleSelectionChange = () => {
      setMathEditor((current) => {
        if (!current) {
          return current
        }

        const node = editor.state.doc.nodeAt(current.pos)
        if (!isMathNode(node)) {
          return null
        }

        return current
      })
    }
    editor.on("selectionUpdate", handleSelectionChange)

    return () => {
      editor.off("selectionUpdate", handleSelectionChange)
    }
  }, [editor])

  const closeMathEditor = () => {
    setMathEditor(null)
  }

  const saveMathEditor = () => {
    if (!editor || !mathEditor) {
      return
    }

    const node = editor.state.doc.nodeAt(mathEditor.pos)
    if (!isMathNode(node)) {
      setMathEditor(null)
      return
    }

    const latex = sanitizeLatex(mathEditor.latex)
    const tr = editor.state.tr

    if (!latex) {
      tr.delete(mathEditor.pos, mathEditor.pos + node.nodeSize)
    } else if (latex !== node.attrs.latex) {
      tr.setNodeMarkup(mathEditor.pos, node.type, {
        ...node.attrs,
        latex,
      })
    }

    editor.view.dispatch(tr)
    editor.view.focus()
    setMathEditor(null)
  }

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
        {mathEditor ? (
          <div
            className="tiptap-math-popover"
            style={{
              left: mathEditor.left,
              top: mathEditor.top,
              position: "fixed",
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
                    : current
                )
              }
              onBlur={saveMathEditor}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  closeMathEditor()
                  editor?.view.focus()
                }

                if (event.key === "Enter") {
                  event.preventDefault()
                  saveMathEditor()
                }
              }}
              className="tiptap-math-editor-input"
              aria-label="Edit LaTeX math"
              spellCheck={false}
            />
          </div>
        ) : null}
      </EditorContext.Provider>
    </div>
  )
}
