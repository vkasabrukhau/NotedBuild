//
//  Models.swift
//  NotedMac
//
//  SwiftData models ported from the web app's Prisma schema
//  (prisma/schema.prisma). This is the single-user / local-first subset:
//  Folder, Note, and the gamification models (streak, tamagotchi, progress).
//  Multi-user models (User, School, Friendship, NoteLike, NoteComment) are
//  intentionally omitted for the local Mac app and would return when the
//  optional sync layer is added.
//

import Foundation
import SwiftData

// MARK: - Enums

/// Mirrors Prisma `NoteVisibility`. Local app is single-user, so this mostly
/// affects what *would* sync later; PRIVATE is the only meaningful local state.
enum NoteVisibility: String, Codable, CaseIterable {
    case privateNote = "PRIVATE"
    case school = "SCHOOL"
    case publicNote = "PUBLIC"

    var label: String {
        switch self {
        case .privateNote: return "Private"
        case .school: return "School"
        case .publicNote: return "Public"
        }
    }
}

// MARK: - Folder

@Model
final class Folder {
    /// cuid in the web app; UUID locally. Kept as String for sync compatibility.
    @Attribute(.unique) var id: String
    var name: String
    var desc: String?

    var createdAt: Date
    var updatedAt: Date
    /// Soft-delete, matching Prisma `deletedAt`.
    var deletedAt: Date?

    /// Sorting helper for the sidebar.
    var sortIndex: Int

    @Relationship(deleteRule: .nullify, inverse: \Note.folder)
    var notes: [Note] = []

    init(name: String, desc: String? = nil) {
        self.id = UUID().uuidString
        self.name = name
        self.desc = desc
        let now = Date()
        self.createdAt = now
        self.updatedAt = now
        self.deletedAt = nil
        self.sortIndex = 0
    }

    var isDeleted: Bool { deletedAt != nil }
}

// MARK: - Note

@Model
final class Note {
    @Attribute(.unique) var id: String
    var name: String

    /// In the web app `content` is TipTap/ProseMirror HTML stored as text.
    /// Locally we store the editor's attributed string as archived RTFD data,
    /// which is lossless for native editing. `contentHTML` keeps an HTML
    /// projection so the future sync layer can round-trip to the web format.
    @Attribute(.externalStorage) var contentRTFD: Data?
    var contentHTML: String
    /// Plain-text projection for search and list previews.
    var plainText: String

    var visibilityRaw: String
    var publishedAt: Date?

    var createdAt: Date
    var updatedAt: Date
    var deletedAt: Date?

    var folder: Folder?

    init(name: String = "Untitled", folder: Folder? = nil) {
        self.id = UUID().uuidString
        self.name = name
        self.contentRTFD = nil
        self.contentHTML = ""
        self.plainText = ""
        self.visibilityRaw = NoteVisibility.privateNote.rawValue
        self.publishedAt = nil
        let now = Date()
        self.createdAt = now
        self.updatedAt = now
        self.deletedAt = nil
        self.folder = folder
    }

    var visibility: NoteVisibility {
        get { NoteVisibility(rawValue: visibilityRaw) ?? .privateNote }
        set { visibilityRaw = newValue.rawValue }
    }

    var isDeleted: Bool { deletedAt != nil }

    /// Short preview used in the note list.
    var preview: String {
        let trimmed = plainText.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "No additional text" }
        return String(trimmed.prefix(140))
    }
}

// MARK: - Gamification: Streak

@Model
final class UserStreak {
    @Attribute(.unique) var id: String
    var currentStreak: Int
    var longestStreak: Int
    var lastCheckinAt: Date?
    var totalCheckins: Int

    var createdAt: Date
    var updatedAt: Date

    init() {
        self.id = UUID().uuidString
        self.currentStreak = 0
        self.longestStreak = 0
        self.lastCheckinAt = nil
        self.totalCheckins = 0
        let now = Date()
        self.createdAt = now
        self.updatedAt = now
    }
}

// MARK: - Gamification: Tamagotchi pet

@Model
final class UserTamagotchi {
    @Attribute(.unique) var id: String
    /// Species / tier ID, e.g. "skeleton_spearman", "bear".
    var species: String
    /// Evolution line ID ("skeleton" | "wizard" | ...); nil for special pets.
    var lineId: String?
    /// User-customizable name; nil = use species default.
    var displayName: String?
    /// 0...10; drops when days are missed, recovers with daily clicks.
    var happiness: Int
    var isActive: Bool
    var lastClickAt: Date?

    var createdAt: Date
    var updatedAt: Date

    init(species: String, lineId: String? = nil) {
        self.id = UUID().uuidString
        self.species = species
        self.lineId = lineId
        self.displayName = nil
        self.happiness = 10
        self.isActive = false
        self.lastClickAt = nil
        let now = Date()
        self.createdAt = now
        self.updatedAt = now
    }
}

// MARK: - Gamification: Progress

@Model
final class UserProgress {
    @Attribute(.unique) var id: String

    /// Global XP (0...1200) — unlocks evolution line tiers.
    var globalXp: Int

    var hasSavedFirstNote: Bool
    var hasSavedFirstFolder: Bool
    var hasAddedFirstFriend: Bool
    var hasAddedFirstCommunity: Bool
    var hasAddedAnotherSchoolCommunity: Bool
    var hasMadeFirstStyleChange: Bool
    var hasMadeFirstFontChange: Bool
    var hasTriedAllColors: Bool
    var hasTriedAllFonts: Bool

    var updatedAt: Date

    init() {
        self.id = UUID().uuidString
        self.globalXp = 0
        self.hasSavedFirstNote = false
        self.hasSavedFirstFolder = false
        self.hasAddedFirstFriend = false
        self.hasAddedFirstCommunity = false
        self.hasAddedAnotherSchoolCommunity = false
        self.hasMadeFirstStyleChange = false
        self.hasMadeFirstFontChange = false
        self.hasTriedAllColors = false
        self.hasTriedAllFonts = false
        self.updatedAt = Date()
    }
}
