//
//  RichTextEditor.swift
//  NotedMac
//
//  An AppKit NSTextView wrapped for SwiftUI. This is the native replacement for
//  the web app's TipTap/ProseMirror editor. Milestone 1 covers the common
//  inline + block formatting; inline math (KaTeX equivalent) and slash/bubble
//  menus are planned follow-ups (see README roadmap).
//

import SwiftUI
import AppKit

/// Formatting commands the toolbar can send to the editor.
enum RichTextCommand: Equatable {
    case toggleBold
    case toggleItalic
    case toggleUnderline
    case toggleStrikethrough
    case heading(Int)   // 0 = body, 1...3 = heading levels
    case bulletList
    case numberedList
    case codeBlock
    case clearFormatting
}

struct RichTextEditor: NSViewRepresentable {
    /// Archived RTFD data backing the note. Two-way bound.
    @Binding var rtfd: Data?
    /// Plain-text projection kept in sync for search/previews.
    @Binding var plainText: String
    /// One-shot command channel from the toolbar.
    @Binding var pendingCommand: RichTextCommand?

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSTextView.scrollableTextView()
        guard let textView = scrollView.documentView as? NSTextView else {
            return scrollView
        }

        textView.delegate = context.coordinator
        textView.isRichText = true
        textView.allowsUndo = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.font = .systemFont(ofSize: 15)
        textView.textContainerInset = NSSize(width: 24, height: 24)
        textView.drawsBackground = true
        textView.backgroundColor = .textBackgroundColor
        textView.usesFontPanel = false
        textView.typingAttributes = Coordinator.bodyAttributes

        // Load existing content.
        if let data = rtfd,
           let attr = try? NSAttributedString(
            data: data,
            options: [.documentType: NSAttributedString.DocumentType.rtfd],
            documentAttributes: nil) {
            textView.textStorage?.setAttributedString(attr)
        }

        context.coordinator.textView = textView
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = context.coordinator.textView else { return }

        // Apply a pending toolbar command, if any.
        if let command = pendingCommand {
            context.coordinator.apply(command, to: textView)
            DispatchQueue.main.async { self.pendingCommand = nil }
        }
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, NSTextViewDelegate {
        let parent: RichTextEditor
        weak var textView: NSTextView?

        init(_ parent: RichTextEditor) { self.parent = parent }

        static let bodyFont = NSFont.systemFont(ofSize: 15)
        static var bodyAttributes: [NSAttributedString.Key: Any] {
            [.font: bodyFont, .foregroundColor: NSColor.labelColor]
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = textView, let storage = textView.textStorage else { return }
            // Persist as RTFD (lossless for native attributes + attachments).
            let range = NSRange(location: 0, length: storage.length)
            let data = textView.rtfd(from: range)
            DispatchQueue.main.async {
                self.parent.rtfd = data
                self.parent.plainText = storage.string
            }
        }

        // MARK: Command application

        func apply(_ command: RichTextCommand, to textView: NSTextView) {
            switch command {
            case .toggleBold:          toggleTrait(.boldFontMask, in: textView)
            case .toggleItalic:        toggleTrait(.italicFontMask, in: textView)
            case .toggleUnderline:     toggleUnderline(in: textView)
            case .toggleStrikethrough: toggleStrikethrough(in: textView)
            case .heading(let level):  applyHeading(level, in: textView)
            case .bulletList:          applyList(ordered: false, in: textView)
            case .numberedList:        applyList(ordered: true, in: textView)
            case .codeBlock:           applyCodeBlock(in: textView)
            case .clearFormatting:     clearFormatting(in: textView)
            }
            textDidChange(Notification(name: NSText.didChangeNotification))
        }

        private func selectionRange(_ textView: NSTextView) -> NSRange {
            let sel = textView.selectedRange()
            return sel.length > 0 ? sel : NSRange(location: 0, length: textView.textStorage?.length ?? 0)
        }

        private func toggleTrait(_ trait: NSFontTraitMask, in textView: NSTextView) {
            guard let storage = textView.textStorage else { return }
            let range = textView.selectedRange()
            let fm = NSFontManager.shared
            guard range.length > 0 else {
                // Toggle typing attributes for the next keystrokes.
                let current = (textView.typingAttributes[.font] as? NSFont) ?? Coordinator.bodyFont
                let toggled = fm.convert(current, toHaveTrait: trait)
                textView.typingAttributes[.font] = toggled
                return
            }
            storage.enumerateAttribute(.font, in: range) { value, subRange, _ in
                let font = (value as? NSFont) ?? Coordinator.bodyFont
                let hasTrait = fm.traits(of: font).contains(trait)
                let newFont = hasTrait
                    ? fm.convert(font, toNotHaveTrait: trait)
                    : fm.convert(font, toHaveTrait: trait)
                storage.addAttribute(.font, value: newFont, range: subRange)
            }
        }

        private func toggleUnderline(in textView: NSTextView) {
            toggleNumberAttribute(.underlineStyle, on: NSUnderlineStyle.single.rawValue, in: textView)
        }

        private func toggleStrikethrough(in textView: NSTextView) {
            toggleNumberAttribute(.strikethroughStyle, on: NSUnderlineStyle.single.rawValue, in: textView)
        }

        private func toggleNumberAttribute(_ key: NSAttributedString.Key, on onValue: Int, in textView: NSTextView) {
            guard let storage = textView.textStorage else { return }
            let range = selectionRange(textView)
            let existing = storage.attribute(key, at: range.location, effectiveRange: nil) as? Int
            let isOn = (existing ?? 0) != 0
            if isOn {
                storage.removeAttribute(key, range: range)
            } else {
                storage.addAttribute(key, value: onValue, range: range)
            }
        }

        private func applyHeading(_ level: Int, in textView: NSTextView) {
            guard let storage = textView.textStorage else { return }
            let range = paragraphRange(for: textView)
            let size: CGFloat
            switch level {
            case 1: size = 28
            case 2: size = 22
            case 3: size = 18
            default: size = 15
            }
            let font = level == 0
                ? NSFont.systemFont(ofSize: size)
                : NSFont.boldSystemFont(ofSize: size)
            storage.addAttribute(.font, value: font, range: range)
        }

        private func applyList(ordered: Bool, in textView: NSTextView) {
            guard let storage = textView.textStorage else { return }
            let range = paragraphRange(for: textView)
            let list = NSTextList(
                markerFormat: ordered ? .decimal : .disc,
                options: 0)
            let style = NSMutableParagraphStyle()
            style.textLists = [list]
            style.headIndent = 24
            style.firstLineHeadIndent = 8
            storage.addAttribute(.paragraphStyle, value: style, range: range)
        }

        private func applyCodeBlock(in textView: NSTextView) {
            guard let storage = textView.textStorage else { return }
            let range = paragraphRange(for: textView)
            let mono = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
            storage.addAttribute(.font, value: mono, range: range)
            storage.addAttribute(.backgroundColor, value: NSColor.quaternaryLabelColor, range: range)
        }

        private func clearFormatting(in textView: NSTextView) {
            guard let storage = textView.textStorage else { return }
            let range = selectionRange(textView)
            storage.setAttributes(Coordinator.bodyAttributes, range: range)
        }

        /// Expands the current selection to whole paragraphs (for block styles).
        private func paragraphRange(for textView: NSTextView) -> NSRange {
            let text = textView.string as NSString
            return text.paragraphRange(for: textView.selectedRange())
        }
    }
}
