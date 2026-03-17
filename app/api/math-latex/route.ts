import { NextResponse } from "next/server"

const DEFAULT_MODEL = "google/gemma-3-27b-it:free"
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

type OpenRouterChoice = {
  message?: {
    content?:
      | string
      | Array<{
          type?: string
          text?: string
        }>
  }
}

type OpenRouterResponse = {
  choices?: OpenRouterChoice[]
  error?: {
    message?: string
    code?: string | number
    metadata?: {
      raw?: string
      provider_name?: string
      is_byok?: boolean
    }
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

function extractContent(choice: OpenRouterChoice | undefined) {
  const content = choice?.message?.content

  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("\n")
      .trim()
  }

  return ""
}

async function requestOpenRouter(prompt: string, systemInstruction: string) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: "OPENROUTER_API_KEY is not configured.",
    }
  }

  const makeRequest = async (messages: Array<{ role: "system" | "user"; content: string }>) =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages,
      }),
    })

  let response = await makeRequest([
    {
      role: "system",
      content: systemInstruction,
    },
    {
      role: "user",
      content: prompt,
    },
  ])

  let data = (await response.json().catch(() => null)) as OpenRouterResponse | null

  const rawProviderError = data?.error?.metadata?.raw || ""
  const needsMergedPromptFallback =
    response.status === 400 &&
    /Developer instruction is not enabled/i.test(rawProviderError)

  if (needsMergedPromptFallback) {
    response = await makeRequest([
      {
        role: "user",
        content: `${systemInstruction}\n\nUser request: ${prompt}`,
      },
    ])

    data = (await response.json().catch(() => null)) as OpenRouterResponse | null
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenRouter request failed with status ${response.status}.`

    return {
      ok: false as const,
      status: response.status,
      error: message,
    }
  }

  const latex = sanitizeLatex(extractContent(data?.choices?.[0]))

  return {
    ok: true as const,
    status: response.status,
    latex,
  }
}

async function generateLatex(prompt: string) {
  let lastFailure: { status: number; error: string } | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await requestOpenRouter(prompt, BASE_SYSTEM_INSTRUCTION)

    if (result.ok) {
      if (result.latex && !isPromptEcho(result.latex, prompt)) {
        return { ok: true as const, latex: result.latex }
      }

      const fallback = await requestOpenRouter(prompt, FALLBACK_SYSTEM_INSTRUCTION)

      if (fallback.ok && fallback.latex && !isPromptEcho(fallback.latex, prompt)) {
        return { ok: true as const, latex: fallback.latex }
      }

      lastFailure = {
        status: fallback.status,
        error:
          fallback.ok
            ? "OpenRouter returned low-quality LaTeX for this prompt."
            : fallback.error,
      }
    } else {
      lastFailure = { status: result.status, error: result.error }

      if (RETRYABLE_STATUS_CODES.has(result.status) && attempt < MAX_RETRIES) {
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
          : result.status >= 500
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
