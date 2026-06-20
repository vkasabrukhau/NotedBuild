# NotedMac

A native macOS (SwiftUI + SwiftData) port of the **noted** web app. This is
**Milestone 1 — the spine**: a buildable, single-user, local-first notes app
with a native rich-text editor and the data model ported from the web app's
Prisma schema.

It was generated as a starting point for the web → native conversion. It is
**not yet verified to compile** (it was scaffolded outside Xcode), so expect to
fix a few build errors on the first pass — that's the normal next step.

## Open & build

1. Open `NotedMac.xcodeproj` in **Xcode 16 or newer**.
2. Select the **NotedMac** scheme, target **My Mac**.
3. Press **⌘R**.

The project uses Xcode's *file-system synchronized groups*, so every `.swift`
file under `NotedMac/NotedMac/` is compiled automatically — no need to add files
to the target manually.

> If the project file won't open on an older Xcode, regenerate it: install
> [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
> and ask me to emit a `project.yml`, or create a new macOS App project
> (SwiftUI + SwiftData) and drag the `NotedMac/NotedMac/` folder into it.

Deployment target: **macOS 14.0**. Bundle id: `com.noted.NotedMac` (change it
to your own before distributing).

## What works in Milestone 1

- Three-column layout: sidebar → note list → editor.
- Folders: create, rename, soft-delete (matches the Prisma `deletedAt` model).
- Notes: create (⌘N), edit title, search, move to trash, restore, delete.
- Native rich-text editing (NSTextView): bold, italic, underline, strikethrough,
  headings, bullet/numbered lists, code block, clear formatting.
- Local persistence via SwiftData; note bodies stored as RTFD.
- Streak tracking + tamagotchi config fully ported; a streak readout shows in
  the sidebar footer.

## Architecture

```
NotedMac/
  NotedMacApp.swift        App entry, SwiftData ModelContainer
  Models/Models.swift      SwiftData models (ported from prisma/schema.prisma)
  Views/
    RootView.swift         NavigationSplitView shell + bootstrap
    SidebarView.swift      Sections, folder CRUD, streak footer
    NoteListView.swift     Note list, search, trash
    NoteEditorView.swift   Title + toolbar + editor
  Editor/
    RichTextEditor.swift   NSTextView wrapped for SwiftUI (TipTap replacement)
    EditorToolbar.swift    Formatting toolbar
  Tamagotchi/
    TamagotchiConfig.swift Port of lib/tamagotchi-config.ts
    StreakEngine.swift     Daily check-in / streak logic
```

## How this maps to the web app

| Web app | NotedMac |
|---|---|
| Next.js routes (`app/[email]/...`) | `RootView` + split view |
| Prisma models | `Models.swift` (`@Model` classes) |
| Postgres | local SwiftData store (sync layer is future work) |
| TipTap / ProseMirror editor | `RichTextEditor` (NSTextView) |
| Clerk auth | dropped (single-user local app) |
| KaTeX / Gemini `/math` → LaTeX | **not yet** — see roadmap |
| Friends / explore / comments / schools | dropped (multi-user; out of scope) |

## Roadmap (next milestones)

1. **Inline math** — port `lib/math-latex.ts`. Render with SwiftMath or a small
   inline WebView running KaTeX; wire the `/math[...]` shortcut and the Gemini
   API call (it's just an HTTPS request).
2. **Editor depth** — slash menu, bubble menu, links, images, highlight,
   task lists, text alignment — to reach TipTap parity.
3. **Tamagotchi UI** — pet view, evolution lines, XP, daily click, animations
   (the config + streak engine are already in place).
4. **Optional sync** — map the local RTFD/HTML content to the web app's TipTap
   format and sync to your existing backend API, restoring cross-device use and
   (optionally) the social features.

## Notes / known rough edges

- Content is stored as RTFD locally. A faithful TipTap-HTML projection
  (`Note.contentHTML`) is stubbed for the future sync layer but not yet written
  on save.
- The tamagotchi GIF paths in `TamagotchiConfig.swift` still point at the web
  asset paths; bundle the art under `Assets.xcassets` when building the pet UI.
