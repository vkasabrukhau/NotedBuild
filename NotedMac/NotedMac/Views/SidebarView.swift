//
//  SidebarView.swift
//  NotedMac
//
//  Sidebar with quick sections, the folder list (CRUD), and a tamagotchi
//  status footer.
//

import SwiftUI
import SwiftData

struct SidebarView: View {
    @Environment(\.modelContext) private var context
    @Binding var selection: SidebarItem?

    @Query(filter: #Predicate<Folder> { $0.deletedAt == nil },
           sort: \Folder.sortIndex)
    private var folders: [Folder]

    @State private var renamingFolder: Folder?
    @State private var draftName = ""

    var body: some View {
        List(selection: $selection) {
            Section("Library") {
                Label("All Notes", systemImage: "tray.full")
                    .tag(SidebarItem.allNotes)
                Label("Trash", systemImage: "trash")
                    .tag(SidebarItem.trash)
            }

            Section("Folders") {
                ForEach(folders) { folder in
                    Label(folder.name, systemImage: "folder")
                        .tag(SidebarItem.folder(folder.id))
                        .contextMenu {
                            Button("Rename") { beginRename(folder) }
                            Button("Delete", role: .destructive) { deleteFolder(folder) }
                        }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            TamagotchiFooter()
        }
        .toolbar {
            ToolbarItem {
                Button(action: addFolder) {
                    Label("New Folder", systemImage: "folder.badge.plus")
                }
            }
        }
        .alert("Rename Folder", isPresented: Binding(
            get: { renamingFolder != nil },
            set: { if !$0 { renamingFolder = nil } })) {
            TextField("Name", text: $draftName)
            Button("Save") { commitRename() }
            Button("Cancel", role: .cancel) { renamingFolder = nil }
        }
    }

    private func addFolder() {
        let folder = Folder(name: "New Folder")
        folder.sortIndex = (folders.map(\.sortIndex).max() ?? 0) + 1
        context.insert(folder)
        markProgress(\.hasSavedFirstFolder)
        try? context.save()
        selection = .folder(folder.id)
    }

    private func beginRename(_ folder: Folder) {
        draftName = folder.name
        renamingFolder = folder
    }

    private func commitRename() {
        guard let folder = renamingFolder else { return }
        let trimmed = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            folder.name = trimmed
            folder.updatedAt = Date()
            try? context.save()
        }
        renamingFolder = nil
    }

    private func deleteFolder(_ folder: Folder) {
        folder.deletedAt = Date()   // soft delete, matching Prisma
        for note in folder.notes { note.folder = nil }
        try? context.save()
        if selection == .folder(folder.id) { selection = .allNotes }
    }

    private func markProgress(_ keyPath: ReferenceWritableKeyPath<UserProgress, Bool>) {
        guard let progress = try? context.fetch(FetchDescriptor<UserProgress>()).first else { return }
        progress[keyPath: keyPath] = true
        progress.updatedAt = Date()
    }
}

/// Compact tamagotchi/streak readout pinned to the sidebar bottom.
private struct TamagotchiFooter: View {
    @Query private var streaks: [UserStreak]

    var body: some View {
        let streak = streaks.first
        HStack(spacing: 8) {
            Image(systemName: "flame.fill")
                .foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 1) {
                Text("\(streak?.currentStreak ?? 0)-day streak")
                    .font(.callout.weight(.medium))
                Text("Longest: \(streak?.longestStreak ?? 0)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(10)
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 8))
        .padding(8)
    }
}
