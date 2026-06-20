//
//  EditorToolbar.swift
//  NotedMac
//
//  Formatting toolbar that drives RichTextEditor via the pendingCommand binding.
//  Mirrors the TipTap toolbar in the web app (components/tiptap-ui-primitive).
//

import SwiftUI

struct EditorToolbar: View {
    @Binding var command: RichTextCommand?

    var body: some View {
        HStack(spacing: 6) {
            group {
                button("bold", "Bold", .toggleBold)
                button("italic", "Italic", .toggleItalic)
                button("underline", "Underline", .toggleUnderline)
                button("strikethrough", "Strikethrough", .toggleStrikethrough)
            }
            divider
            group {
                button("textformat.size.larger", "Heading 1", .heading(1))
                button("textformat.size", "Heading 2", .heading(2))
                button("textformat", "Body", .heading(0))
            }
            divider
            group {
                button("list.bullet", "Bullet list", .bulletList)
                button("list.number", "Numbered list", .numberedList)
                button("chevron.left.forwardslash.chevron.right", "Code block", .codeBlock)
            }
            divider
            button("eraser", "Clear formatting", .clearFormatting)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(.bar)
    }

    private var divider: some View {
        Divider().frame(height: 18).padding(.horizontal, 2)
    }

    private func group<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        HStack(spacing: 2) { content() }
    }

    private func button(_ systemImage: String, _ help: String, _ cmd: RichTextCommand) -> some View {
        Button {
            command = cmd
        } label: {
            Image(systemName: systemImage)
                .frame(width: 26, height: 24)
        }
        .buttonStyle(.borderless)
        .help(help)
    }
}
