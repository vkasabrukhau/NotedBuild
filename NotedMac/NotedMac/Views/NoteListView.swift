//
//  NoteListView.swift
//  NotedMac
//
//  Middle column: the list of notes for the current sidebar selection, with
//  search, create, and delete/restore.
//

import SwiftUI
import SwiftData

struct NoteListView: View {
    @Environment(\.modelContext) private var context
    let sidebarItem: SidebarItem
    @Binding var selectedNoteID: String?

    @Query private var notes: [Note]
    @State private var searchText = ""
    private let folderID: String?

    init(sidebarItem: SidebarItem, selectedNoteID: Binding<String?>) {
        self.sidebarItem = sidebarItem
        self._selectedNoteID = selectedNoteID

        // Predicate only handles the soft-delete state. Folder membership is
        // filtered in memory below, since #Predicate traversal across an
        // optional relationship is unreliable.
        let predicate: Predicate<Note>
        switch sidebarItem {
        case .trash:
            predicate = #Predicate { $0.deletedAt != nil }
            folderID = nil
        case .allNotes:
            predicate = #Predicate { $0.deletedAt == nil }
            folderID = nil
        case .folder(let id):
            predicate = #Predicate { $0.deletedAt == nil }
            folderID = id
        }
        _notes = Query(filter: predicate, sort: \Note.updatedAt, order: .reverse)
    }

    private var filteredNotes: [Note] {
        var result = notes
        if let folderID {
            result = result.filter { $0.folder?.id == folderID }
        }
        if !searchText.isEmpty {
            let q = searchText.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(q) || $0.plainText.lowercased().contains(q)
            }
        }
        return result
    }

    var body: some View {
        List(selection: $selectedNoteID) {
            ForEach(filteredNotes) { note in
                NoteRow(note: note)
                    .tag(note.id)
                    .contextMenu { rowMenu(for: note) }
            }
        }
        .searchable(text: $searchText, placement: .sidebar, prompt: "Search notes")
        .overlay {
            if filteredNotes.isEmpty {
                ContentUnavailableView("No Notes", systemImage: "note.text",
                                       description: Text(emptyMessage))
            }
        }
        .navigationTitle(title)
        .toolbar {
            if !isTrash {
                ToolbarItem {
                    Button(action: createNote) {
                        Label("New Note", systemImage: "square.and.pencil")
                    }
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .newNoteRequested)) { _ in
            if case .trash = sidebarItem { return }
            createNote()
        }
    }

    @ViewBuilder
    private func rowMenu(for note: Note) -> some View {
        if note.isDeleted {
            Button("Restore") { note.deletedAt = nil; try? context.save() }
            Button("Delete Permanently", role: .destructive) {
                context.delete(note); try? context.save()
            }
        } else {
            Button("Move to Trash", role: .destructive) {
                note.deletedAt = Date(); try? context.save()
                if selectedNoteID == note.id { selectedNoteID = nil }
            }
        }
    }

    private func createNote() {
        var folder: Folder?
        if case .folder(let id) = sidebarItem {
            folder = try? context.fetch(
                FetchDescriptor<Folder>(predicate: #Predicate { $0.id == id })).first
        }
        let note = Note(name: "Untitled", folder: folder)
        context.insert(note)
        markFirstNote()
        try? context.save()
        selectedNoteID = note.id
    }

    private func markFirstNote() {
        guard let progress = try? context.fetch(FetchDescriptor<UserProgress>()).first else { return }
        progress.hasSavedFirstNote = true
        progress.updatedAt = Date()
    }

    private var title: String {
        switch sidebarItem {
        case .allNotes: return "All Notes"
        case .trash: return "Trash"
        case .folder: return "Folder"
        }
    }

    private var isTrash: Bool {
        if case .trash = sidebarItem { return true }
        return false
    }

    private var emptyMessage: String {
        switch sidebarItem {
        case .trash: return "Deleted notes appear here."
        default: return "Press the compose button or ⌘N to start."
        }
    }
}

private struct NoteRow: View {
    let note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(note.name.isEmpty ? "Untitled" : note.name)
                .font(.headline)
                .lineLimit(1)
            Text(note.preview)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)
            Text(note.updatedAt, format: .dateTime.month().day().hour().minute())
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}
