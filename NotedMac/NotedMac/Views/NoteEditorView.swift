//
//  NoteEditorView.swift
//  NotedMac
//
//  Detail pane: editable title + formatting toolbar + the native rich-text
//  editor. Equivalent to the web app's note route + TipTap editor.
//

import SwiftUI
import SwiftData

struct NoteEditorView: View {
    @Environment(\.modelContext) private var context
    @Bindable var note: Note

    @State private var rtfd: Data?
    @State private var plainText: String = ""
    @State private var pendingCommand: RichTextCommand?
    @State private var loadedNoteID: String?

    var body: some View {
        VStack(spacing: 0) {
            TextField("Title", text: $note.name)
                .textFieldStyle(.plain)
                .font(.largeTitle.weight(.bold))
                .padding(.horizontal, 24)
                .padding(.top, 18)
                .padding(.bottom, 8)
                .onChange(of: note.name) { _, _ in note.updatedAt = Date() }

            EditorToolbar(command: $pendingCommand)

            RichTextEditor(rtfd: $rtfd,
                           plainText: $plainText,
                           pendingCommand: $pendingCommand)
        }
        .navigationTitle(note.name.isEmpty ? "Untitled" : note.name)
        .onAppear { load() }
        .onChange(of: note.id) { _, _ in load() }
        .onChange(of: rtfd) { _, newValue in persist(newValue) }
    }

    private func load() {
        guard loadedNoteID != note.id else { return }
        rtfd = note.contentRTFD
        plainText = note.plainText
        loadedNoteID = note.id
    }

    private func persist(_ data: Data?) {
        guard loadedNoteID == note.id else { return }
        note.contentRTFD = data
        note.plainText = plainText
        note.updatedAt = Date()
        try? context.save()
    }
}
