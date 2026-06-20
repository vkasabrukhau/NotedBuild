//
//  RootView.swift
//  NotedMac
//
//  Three-column layout: sidebar (sections + folders) | note list | editor.
//  Replaces the web app's app/[email]/ route shell.
//

import SwiftUI
import SwiftData

/// Sidebar selection.
enum SidebarItem: Hashable {
    case allNotes
    case folder(String)   // folder id
    case trash
}

struct RootView: View {
    @Environment(\.modelContext) private var context

    @State private var selection: SidebarItem? = .allNotes
    @State private var selectedNoteID: String?

    var body: some View {
        NavigationSplitView {
            SidebarView(selection: $selection)
                .navigationSplitViewColumnWidth(min: 200, ideal: 220)
        } content: {
            NoteListView(sidebarItem: selection ?? .allNotes,
                         selectedNoteID: $selectedNoteID)
                .navigationSplitViewColumnWidth(min: 260, ideal: 300)
        } detail: {
            if let id = selectedNoteID,
               let note = fetchNote(id) {
                NoteEditorView(note: note)
            } else {
                ContentUnavailableView(
                    "No Note Selected",
                    systemImage: "note.text",
                    description: Text("Select a note or press ⌘N to create one."))
            }
        }
        .onAppear(perform: bootstrap)
    }

    private func fetchNote(_ id: String) -> Note? {
        let descriptor = FetchDescriptor<Note>(predicate: #Predicate { $0.id == id })
        return try? context.fetch(descriptor).first
    }

    /// Seed the gamification singletons on first launch.
    private func bootstrap() {
        let streakCount = (try? context.fetchCount(FetchDescriptor<UserStreak>())) ?? 0
        if streakCount == 0 { context.insert(UserStreak()) }

        let progressCount = (try? context.fetchCount(FetchDescriptor<UserProgress>())) ?? 0
        if progressCount == 0 { context.insert(UserProgress()) }

        try? context.save()
    }
}
