//
//  NotedMacApp.swift
//  NotedMac
//
//  Native macOS port of the "noted" web app (Next.js + Prisma + TipTap).
//  Milestone 1: single-user, local-first notes with a native rich-text editor.
//

import SwiftUI
import SwiftData

@main
struct NotedMacApp: App {
    /// Local SwiftData store. The schema is the single-user subset of the
    /// web app's Prisma models (see Models.swift).
    let container: ModelContainer

    init() {
        let schema = Schema([
            Folder.self, Note.self,
            UserStreak.self, UserTamagotchi.self, UserProgress.self,
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            container = try ModelContainer(for: schema, configurations: [config])
        } catch {
            // Never crash to a no-window state: log the real error and fall back.
            print("⚠️ SwiftData store failed to load: \(error)")
            let memory = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            container = try! ModelContainer(for: schema, configurations: [memory])
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
        .defaultSize(width: 1000, height: 680)
        .defaultPosition(.center)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Note") {
                    NotificationCenter.default.post(name: .newNoteRequested, object: nil)
                }
                .keyboardShortcut("n", modifiers: .command)
            }
        }
    }
}

extension Notification.Name {
    static let newNoteRequested = Notification.Name("newNoteRequested")
}


