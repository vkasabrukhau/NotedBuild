import { NextResponse } from "next/server"

const DEFAULT_MODEL = "gemini-2.5-flash"
const MAX_RETRIES = 2
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const BASE_SYSTEM_INSTRUCTION =
  "Convert user-described math into valid KaTeX-compatible LaTeX only. Return only LaTeX, with no markdown, no explanations, no code fences, and no dollar signs."
const FALLBACK_SYSTEM_INSTRUCTION = [
  BASE_SYSTEM_INSTRUCTION,
  "If the user names a theorem, identity, law, or formula, return the single most canonical compact mathematical statement for it.",
  "Never echo the prompt back as plain text or wrap the concept name in \\text{...}.",
  "Prefer a single equation that can render inline.",
].join(" ")

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
  error?: {
    message?: string
    status?: string
    code?: number
  }
}

function sanitizeLatex(output: string) {
  return output
    .trim()
    .replace(/^```(?:latex)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .trim()
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function isPromptEcho(latex: string, prompt: string) {
  const normalizedLatex = normalizeText(
    latex
      .replace(/^\\text\s*\{/, "")
      .replace(/\}$/, "")
      .trim()
  )

  return normalizedLatex.length > 0 && normalizedLatex === normalizeText(prompt)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableProviderFailure(status: number, error: string) {
  return (
    RETRYABLE_STATUS_CODES.has(status) ||
    /upstream|timed out|timeout|temporar|unavailable|overloaded|capacity|quota|rate limit|internal/i.test(
      error
    )
  )
}

function extractContent(data: GeminiResponse | null) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""
  )
}

async function requestGemini(prompt: string, systemInstruction: string) {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: "GEMINI_API_KEY is not configured.",
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          topK: 1,
          topP: 1,
        },
      }),
    }
  )

  const data = (await response.json().catch(() => null)) as GeminiResponse | null

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error:
        data?.error?.message?.trim() ||
        `Gemini request failed with status ${response.status}.`,
    }
  }

  const latex = sanitizeLatex(extractContent(data))

  return {
    ok: true as const,
    status: response.status,
    latex,
  }
}

async function generateLatex(prompt: string) {
  let lastFailure: { status: number; error: string } | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await requestGemini(prompt, BASE_SYSTEM_INSTRUCTION)

    if (result.ok) {
      if (result.latex && !isPromptEcho(result.latex, prompt)) {
        return { ok: true as const, latex: result.latex }
      }

      const fallback = await requestGemini(prompt, FALLBACK_SYSTEM_INSTRUCTION)

      if (fallback.ok && fallback.latex && !isPromptEcho(fallback.latex, prompt)) {
        return { ok: true as const, latex: fallback.latex }
      }

      lastFailure = {
        status: fallback.status,
        error:
          fallback.ok
            ? "Gemini returned low-quality LaTeX for this prompt."
            : fallback.error,
      }

      if (
        !fallback.ok &&
        isRetryableProviderFailure(fallback.status, fallback.error) &&
        attempt < MAX_RETRIES
      ) {
        await sleep(250 * (attempt + 1))
        continue
      }
    } else {
      lastFailure = { status: result.status, error: result.error }

      if (
        isRetryableProviderFailure(result.status, result.error) &&
        attempt < MAX_RETRIES
      ) {
        await sleep(250 * (attempt + 1))
        continue
      }
    }
  }

  return {
    ok: false as const,
    status: lastFailure?.status ?? 502,
    error: lastFailure?.error ?? "Failed to generate LaTeX.",
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string }
    const trimmedPrompt = prompt?.trim()

    if (!trimmedPrompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
    }

    const result = await generateLatex(trimmedPrompt)

    if (!result.ok) {
      const status =
        result.status === 429 || result.status === 503
          ? result.status
          : isRetryableProviderFailure(result.status, result.error) ||
              result.status >= 500
            ? 502
            : 422

      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ latex: result.latex })
  } catch {
    return NextResponse.json(
      { error: "Failed to convert prompt to LaTeX." },
      { status: 500 }
    )
  }
}
