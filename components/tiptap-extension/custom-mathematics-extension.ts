"use client"

import { InputRule } from "@tiptap/core"
import Mathematics, {
  BlockMath,
  InlineMath,
} from "@tiptap/extension-mathematics"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"

const MATH_TRIGGER_REGEX = /\/math\[([^\]]+)\]$/

type CustomMathematicsOptions = {
  endpoint: string
  blockOptions?: Record<string, unknown>
  inlineOptions?: Record<string, unknown>
  katexOptions?: Record<string, unknown>
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

function findPlaceholderRange(
  doc: ProseMirrorNode,
  placeholder: string,
  preferredFrom: number
): { from: number; to: number } | null {
  const matches: Array<{ from: number; to: number; distance: number }> = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return
    }

    let index = node.text.indexOf(placeholder)
    while (index !== -1) {
      const from = pos + index
      const to = from + placeholder.length
      const distance = Math.abs(from - preferredFrom)

      matches.push({ from, to, distance })
      index = node.text.indexOf(placeholder, index + 1)
    }
  })

  const match = matches.sort((a, b) => a.distance - b.distance)[0]

  if (!match) {
    return null
  }

  return { from: match.from, to: match.to }
}

async function convertMathPromptToLatex(endpoint: string, prompt: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null

    throw new Error(data?.error || `Math conversion failed with ${response.status}`)
  }

  const data = (await response.json()) as { latex?: string }
  if (!data.latex?.trim()) {
    return null
  }

  const latex = sanitizeLatex(data.latex)
  return latex || null
}

const InlineMathWithPrompt = InlineMath.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      originalPrompt: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-original-prompt") || null,
        renderHTML: (attributes) =>
          attributes.originalPrompt
            ? { "data-original-prompt": attributes.originalPrompt }
            : {},
      },
    }
  },
})

export const CustomMathematics = Mathematics.extend<CustomMathematicsOptions>({
  addOptions() {
    return {
      endpoint: "/api/math-latex",
      blockOptions: {},
      inlineOptions: {},
      katexOptions: {
        throwOnError: false,
      },
    }
  },

  addExtensions() {
    const { blockOptions, inlineOptions, katexOptions } = this.options

    return [
      BlockMath.configure({ ...blockOptions, katexOptions }),
      InlineMathWithPrompt.configure({ ...inlineOptions, katexOptions }),
    ]
  },

  addInputRules() {
    return [
      new InputRule({
        find: MATH_TRIGGER_REGEX,
        handler: ({ state, range, match }) => {
          const prompt = match[1]?.trim()

          if (!prompt) {
            return null
          }

          const placeholderText = `/math[${prompt}]`
          const placeholderFrom = range.from
          const tr = state.tr.insertText(placeholderText, range.from, range.to)
          const selectionPos = Math.min(
            placeholderFrom + placeholderText.length,
            tr.doc.content.size
          )

          tr.setSelection(TextSelection.create(tr.doc, selectionPos))

          window.setTimeout(async () => {
            try {
              const latex = await convertMathPromptToLatex(
                this.options.endpoint,
                prompt
              )

              if (!latex || this.editor.isDestroyed || !this.editor.isEditable) {
                return
              }

              const { state: currentState } = this.editor
              const inlineMathType = currentState.schema.nodes.inlineMath

              if (!inlineMathType) {
                return
              }

              const placeholderRange = findPlaceholderRange(
                currentState.doc,
                placeholderText,
                placeholderFrom
              )

              if (!placeholderRange) {
                return
              }

              const replaceTr = currentState.tr.replaceWith(
                placeholderRange.from,
                placeholderRange.to,
                inlineMathType.create({
                  latex,
                  originalPrompt: prompt,
                })
              )

              const cursorPos = Math.min(
                placeholderRange.from + 1,
                replaceTr.doc.content.size
              )

              replaceTr.setSelection(
                TextSelection.near(replaceTr.doc.resolve(cursorPos))
              )

              this.editor.view.dispatch(replaceTr)
            } catch (error) {
              console.error("/math conversion failed", error)
            }
          }, 0)
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor
        const { selection } = state

        if (!selection.empty) {
          return false
        }

        const nodeBefore = selection.$from.nodeBefore
        const originalPrompt = nodeBefore?.attrs.originalPrompt

        if (nodeBefore?.type.name !== "inlineMath" || !originalPrompt) {
          return false
        }

        const replacementText = `/math[${originalPrompt}]`
        const from = selection.$from.pos - nodeBefore.nodeSize
        const tr = state.tr.replaceWith(
          from,
          selection.$from.pos,
          state.schema.text(replacementText)
        )

        tr.setSelection(
          TextSelection.create(tr.doc, from + replacementText.length)
        )
        this.editor.view.dispatch(tr)

        return true
      },
    }
  },
})

export default CustomMathematics
