//
//  TamagotchiConfig.swift
//  NotedMac
//
//  Direct port of lib/tamagotchi-config.ts. GIF asset paths are kept as the
//  original web paths for reference; the Mac app will map these to bundled
//  assets (or animated images) when the tamagotchi UI is fully built out.
//

import Foundation

enum ProgressKey: String, CaseIterable {
    case hasSavedFirstNote
    case hasSavedFirstFolder
    case hasAddedFirstFriend
    case hasAddedFirstCommunity
    case hasAddedAnotherSchoolCommunity
    case hasMadeFirstStyleChange
    case hasMadeFirstFontChange
}

struct SpecialPet: Identifiable {
    let id: String
    let name: String
    let idleGif: String
    let unlockRequirements: [ProgressKey]
}

struct EvolutionTier: Identifiable {
    let id: String
    let name: String
    let xpThreshold: Int
    let idleGif: String
}

struct EvolutionLine: Identifiable {
    let id: String
    let name: String
    let tiers: [EvolutionTier] // low -> high
}

enum TamagotchiConfig {

    static let maxXP = 1200

    /// Set true to bypass all XP/ownership gates during development.
    static let devUnlockAll = true

    static let specialPets: [SpecialPet] = [
        SpecialPet(id: "bear", name: "Bear", idleGif: "/tamagotchi/bear.gif",
                   unlockRequirements: [.hasSavedFirstNote, .hasSavedFirstFolder]),
        SpecialPet(id: "mewtwo", name: "Mewtwo", idleGif: "/tamagotchi/mewtwo.gif",
                   unlockRequirements: [.hasAddedFirstFriend, .hasAddedFirstCommunity, .hasAddedAnotherSchoolCommunity]),
        SpecialPet(id: "snorlax", name: "Snorlax", idleGif: "/tamagotchi/snorlax.gif",
                   unlockRequirements: [.hasMadeFirstStyleChange, .hasMadeFirstFontChange]),
    ]

    static let evolutionLines: [EvolutionLine] = [
        EvolutionLine(id: "skeleton", name: "Skeleton", tiers: [
            EvolutionTier(id: "skeleton_spearman", name: "Skeleton Spearman", xpThreshold: 0, idleGif: "/tamagotchi/skeleton/Skeleton_Spearman/Idle.gif"),
            EvolutionTier(id: "skeleton_warrior", name: "Skeleton Warrior", xpThreshold: 100, idleGif: "/tamagotchi/skeleton/Skeleton_Warrior/Idle.gif"),
            EvolutionTier(id: "skeleton_archer", name: "Skeleton Archer", xpThreshold: 150, idleGif: "/tamagotchi/skeleton/Skeleton_Archer/Idle.gif"),
        ]),
        EvolutionLine(id: "wizard", name: "Wizard", tiers: [
            EvolutionTier(id: "lightning_mage", name: "Lightning Mage", xpThreshold: 250, idleGif: "/tamagotchi/wizard/Lightning Mage/Idle.gif"),
            EvolutionTier(id: "fire_wizard", name: "Fire Wizard", xpThreshold: 300, idleGif: "/tamagotchi/wizard/Fire Wizard/Idle.gif"),
            EvolutionTier(id: "wanderer_magician", name: "Wanderer Magician", xpThreshold: 350, idleGif: "/tamagotchi/wizard/Wanderer Magican/Idle.gif"),
        ]),
        EvolutionLine(id: "ninja", name: "Ninja", tiers: [
            EvolutionTier(id: "kunoichi", name: "Kunoichi", xpThreshold: 450, idleGif: "/tamagotchi/ninja/Kunoichi/Idle.gif"),
            EvolutionTier(id: "ninja_monk", name: "Ninja Monk", xpThreshold: 500, idleGif: "/tamagotchi/ninja/Ninja_Monk/Idle.gif"),
            EvolutionTier(id: "ninja_peasant", name: "Ninja Peasant", xpThreshold: 550, idleGif: "/tamagotchi/ninja/Ninja_Peasant/Idle.gif"),
        ]),
        EvolutionLine(id: "karasu", name: "Karasu", tiers: [
            EvolutionTier(id: "karasu_tengu", name: "Karasu Tengu", xpThreshold: 650, idleGif: "/tamagotchi/karasu/Karasu_tengu/Idle.gif"),
            EvolutionTier(id: "kitsune", name: "Kitsune", xpThreshold: 750, idleGif: "/tamagotchi/karasu/Kitsune/Idle.gif"),
            EvolutionTier(id: "yamabushi_tengu", name: "Yamabushi Tengu", xpThreshold: 850, idleGif: "/tamagotchi/karasu/Yamabushi_tengu/Idle.gif"),
        ]),
        EvolutionLine(id: "samurai", name: "Samurai", tiers: [
            EvolutionTier(id: "samurai", name: "Samurai", xpThreshold: 1000, idleGif: "/tamagotchi/samurai/Samurai/idle.gif"),
            EvolutionTier(id: "samurai_archer", name: "Samurai Archer", xpThreshold: 1100, idleGif: "/tamagotchi/samurai/Samurai_Archer/Idle.gif"),
            EvolutionTier(id: "samurai_commander", name: "Samurai Commander", xpThreshold: 1200, idleGif: "/tamagotchi/samurai/Samurai_Commander/Idle.gif"),
        ]),
    ]

    static var allTiers: [EvolutionTier] { evolutionLines.flatMap(\.tiers) }

    static func line(forTier speciesId: String) -> EvolutionLine? {
        evolutionLines.first { $0.tiers.contains { $0.id == speciesId } }
    }

    static func tier(_ speciesId: String) -> EvolutionTier? {
        allTiers.first { $0.id == speciesId }
    }

    static func specialPet(_ id: String) -> SpecialPet? {
        specialPets.first { $0.id == id }
    }

    static func speciesIdleGif(_ speciesId: String) -> String {
        if let t = tier(speciesId) { return t.idleGif }
        if let p = specialPet(speciesId) { return p.idleGif }
        return "/tamagotchi/\(speciesId).gif"
    }

    static func speciesName(_ speciesId: String) -> String {
        if let t = tier(speciesId) { return t.name }
        if let p = specialPet(speciesId) { return p.name }
        return speciesId
    }

    static func unlockedTiers(globalXp: Int) -> [EvolutionTier] {
        allTiers.filter { globalXp >= $0.xpThreshold }
    }

    static func isSpecialPetUnlocked(_ pet: SpecialPet, progress: UserProgress) -> Bool {
        pet.unlockRequirements.allSatisfy { key in
            switch key {
            case .hasSavedFirstNote: return progress.hasSavedFirstNote
            case .hasSavedFirstFolder: return progress.hasSavedFirstFolder
            case .hasAddedFirstFriend: return progress.hasAddedFirstFriend
            case .hasAddedFirstCommunity: return progress.hasAddedFirstCommunity
            case .hasAddedAnotherSchoolCommunity: return progress.hasAddedAnotherSchoolCommunity
            case .hasMadeFirstStyleChange: return progress.hasMadeFirstStyleChange
            case .hasMadeFirstFontChange: return progress.hasMadeFirstFontChange
            }
        }
    }
}
