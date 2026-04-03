// ─── Progress keys (first-time unlock conditions) ────────────────────────────

export type ProgressKey =
  | "hasSavedFirstNote"
  | "hasSavedFirstFolder"
  | "hasAddedFirstFriend"
  | "hasAddedFirstCommunity"
  | "hasAddedAnotherSchoolCommunity"
  | "hasMadeFirstStyleChange"
  | "hasMadeFirstFontChange";

export type UserProgressData = {
  globalXp: number;
  hasSavedFirstNote: boolean;
  hasSavedFirstFolder: boolean;
  hasAddedFirstFriend: boolean;
  hasAddedFirstCommunity: boolean;
  hasAddedAnotherSchoolCommunity: boolean;
  hasMadeFirstStyleChange: boolean;
  hasMadeFirstFontChange: boolean;
  hasTriedAllColors: boolean;
  hasTriedAllFonts: boolean;
};

// ─── Special pets (unlocked via first-time actions) ───────────────────────────

export type SpecialPet = {
  id: string;
  name: string;
  idleGif: string;
  unlockRequirements: ProgressKey[];
};

export const SPECIAL_PETS: SpecialPet[] = [
  {
    id: "bear",
    name: "Bear",
    idleGif: "/tamagotchi/bear.gif",
    unlockRequirements: ["hasSavedFirstNote", "hasSavedFirstFolder"],
  },
  {
    id: "mewtwo",
    name: "Mewtwo",
    idleGif: "/tamagotchi/mewtwo.gif",
    unlockRequirements: [
      "hasAddedFirstFriend",
      "hasAddedFirstCommunity",
      "hasAddedAnotherSchoolCommunity",
    ],
  },
  {
    id: "snorlax",
    name: "Snorlax",
    idleGif: "/tamagotchi/snorlax.gif",
    unlockRequirements: ["hasMadeFirstStyleChange", "hasMadeFirstFontChange"],
  },
];

// ─── Evolution lines (XP-gated progression) ───────────────────────────────────

export type EvolutionTier = {
  id: string;        // species ID stored in DB
  name: string;
  xpThreshold: number; // global XP needed to unlock this tier
  idleGif: string;
};

export type EvolutionLine = {
  id: string;        // lineId stored in DB
  name: string;
  tiers: [EvolutionTier, EvolutionTier, EvolutionTier]; // low → high
};

export const EVOLUTION_LINES: EvolutionLine[] = [
  {
    id: "skeleton",
    name: "Skeleton",
    tiers: [
      {
        id: "skeleton_spearman",
        name: "Skeleton Spearman",
        xpThreshold: 0,
        idleGif: "/tamagotchi/skeleton/Skeleton_Spearman/Idle.gif",
      },
      {
        id: "skeleton_warrior",
        name: "Skeleton Warrior",
        xpThreshold: 100,
        idleGif: "/tamagotchi/skeleton/Skeleton_Warrior/Idle.gif",
      },
      {
        id: "skeleton_archer",
        name: "Skeleton Archer",
        xpThreshold: 150,
        idleGif: "/tamagotchi/skeleton/Skeleton_Archer/Idle.gif",
      },
    ],
  },
  {
    id: "wizard",
    name: "Wizard",
    tiers: [
      {
        id: "lightning_mage",
        name: "Lightning Mage",
        xpThreshold: 250,
        idleGif: "/tamagotchi/wizard/Lightning Mage/Idle.gif",
      },
      {
        id: "fire_wizard",
        name: "Fire Wizard",
        xpThreshold: 300,
        idleGif: "/tamagotchi/wizard/Fire Wizard/Idle.gif",
      },
      {
        id: "wanderer_magician",
        name: "Wanderer Magician",
        xpThreshold: 350,
        idleGif: "/tamagotchi/wizard/Wanderer Magican/Idle.gif",
      },
    ],
  },
  {
    id: "ninja",
    name: "Ninja",
    tiers: [
      {
        id: "kunoichi",
        name: "Kunoichi",
        xpThreshold: 450,
        idleGif: "/tamagotchi/ninja/Kunoichi/Idle.gif",
      },
      {
        id: "ninja_monk",
        name: "Ninja Monk",
        xpThreshold: 500,
        idleGif: "/tamagotchi/ninja/Ninja_Monk/Idle.gif",
      },
      {
        id: "ninja_peasant",
        name: "Ninja Peasant",
        xpThreshold: 550,
        idleGif: "/tamagotchi/ninja/Ninja_Peasant/Idle.gif",
      },
    ],
  },
  {
    id: "karasu",
    name: "Karasu",
    tiers: [
      {
        id: "karasu_tengu",
        name: "Karasu Tengu",
        xpThreshold: 650,
        idleGif: "/tamagotchi/karasu/Karasu_tengu/Idle.gif",
      },
      {
        id: "kitsune",
        name: "Kitsune",
        xpThreshold: 750,
        idleGif: "/tamagotchi/karasu/Kitsune/Idle.gif",
      },
      {
        id: "yamabushi_tengu",
        name: "Yamabushi Tengu",
        xpThreshold: 850,
        idleGif: "/tamagotchi/karasu/Yamabushi_tengu/Idle.gif",
      },
    ],
  },
  {
    id: "samurai",
    name: "Samurai",
    tiers: [
      {
        id: "samurai",
        name: "Samurai",
        xpThreshold: 1000,
        idleGif: "/tamagotchi/samurai/Samurai/idle.gif",
      },
      {
        id: "samurai_archer",
        name: "Samurai Archer",
        xpThreshold: 1100,
        idleGif: "/tamagotchi/samurai/Samurai_Archer/Idle.gif",
      },
      {
        id: "samurai_commander",
        name: "Samurai Commander",
        xpThreshold: 1200,
        idleGif: "/tamagotchi/samurai/Samurai_Commander/Idle.gif",
      },
    ],
  },
];

// ─── Flat lookup helpers ───────────────────────────────────────────────────────

/** All evolution tiers across all lines (flat list) */
export const ALL_TIERS: EvolutionTier[] = EVOLUTION_LINES.flatMap((l) => l.tiers);

/** Find the evolution line a tier belongs to */
export function getLineForTier(speciesId: string): EvolutionLine | undefined {
  return EVOLUTION_LINES.find((l) => l.tiers.some((t) => t.id === speciesId));
}

/** Get a specific tier by species ID */
export function getTier(speciesId: string): EvolutionTier | undefined {
  return ALL_TIERS.find((t) => t.id === speciesId);
}

/** Get a special pet by ID */
export function getSpecialPet(id: string): SpecialPet | undefined {
  return SPECIAL_PETS.find((p) => p.id === id);
}

/** Click/action GIF for each evolution tier — played on tap, then reverts to idle */
const SPECIES_CLICK_GIFS: Record<string, string> = {
  // Skeleton line
  skeleton_spearman: "/tamagotchi/skeleton/Skeleton_Spearman/Run+attack.gif",
  skeleton_warrior:  "/tamagotchi/skeleton/Skeleton_Warrior/Run+attack.gif",
  skeleton_archer:   "/tamagotchi/skeleton/Skeleton_Archer/Shot_1.gif",
  // Wizard line
  lightning_mage:    "/tamagotchi/wizard/Lightning Mage/Light_ball.gif",
  fire_wizard:       "/tamagotchi/wizard/Fire Wizard/Fireball.gif",
  wanderer_magician: "/tamagotchi/wizard/Wanderer Magican/Magic_sphere.gif",
  // Ninja line
  kunoichi:          "/tamagotchi/ninja/Kunoichi/Attack_1.gif",
  ninja_monk:        "/tamagotchi/ninja/Ninja_Monk/Attack_1.gif",
  ninja_peasant:     "/tamagotchi/ninja/Ninja_Peasant/Attack_1.gif",
  // Karasu line
  karasu_tengu:      "/tamagotchi/karasu/Karasu_tengu/Attack_1.gif",
  kitsune:           "/tamagotchi/karasu/Kitsune/Attack_1.gif",
  yamabushi_tengu:   "/tamagotchi/karasu/Yamabushi_tengu/Attack_1.gif",
  // Samurai line
  samurai:           "/tamagotchi/samurai/Samurai/attack1.gif",
  samurai_archer:    "/tamagotchi/samurai/Samurai_Archer/Attack_1.gif",
  samurai_commander: "/tamagotchi/samurai/Samurai_Commander/Attack_1.gif",
};

/**
 * Returns the click/action GIF for a species, or null if the species only
 * has a single GIF (e.g. special pets bear/mewtwo/snorlax).
 */
export function getSpeciesClickGif(speciesId: string): string | null {
  return SPECIES_CLICK_GIFS[speciesId] ?? null;
}

/** Resolve the idle GIF path for any species ID (evolution tier or special pet) */
export function getSpeciesIdleGif(speciesId: string): string {
  const tier = getTier(speciesId);
  if (tier) return tier.idleGif;
  const pet = getSpecialPet(speciesId);
  if (pet) return pet.idleGif;
  return `/tamagotchi/${speciesId}.gif`; // legacy fallback
}

/** Resolve the display name for any species ID */
export function getSpeciesName(speciesId: string): string {
  const tier = getTier(speciesId);
  if (tier) return tier.name;
  const pet = getSpecialPet(speciesId);
  if (pet) return pet.name;
  return speciesId;
}

/** Return all tiers unlocked at a given globalXp value */
export function getUnlockedTiers(globalXp: number): EvolutionTier[] {
  return ALL_TIERS.filter((t) => globalXp >= t.xpThreshold);
}

/** Check if a special pet's unlock requirements are all met */
export function isSpecialPetUnlocked(
  pet: SpecialPet,
  progress: UserProgressData,
): boolean {
  return pet.unlockRequirements.every((key) => progress[key]);
}

// ─── Legacy compat (keep TAMAGOTCHI_SPECIES export used by existing imports) ──

/** @deprecated Use SPECIAL_PETS + EVOLUTION_LINES instead */
export const TAMAGOTCHI_SPECIES = SPECIAL_PETS.map((p) => ({
  id: p.id,
  name: p.name,
  gif: p.idleGif,
  unlockRequirements: p.unlockRequirements as ProgressKey[],
}));

/** @deprecated Use isSpecialPetUnlocked instead */
export function isSpeciesUnlocked(
  species: { unlockRequirements: ProgressKey[] | null },
  progress: UserProgressData,
): boolean {
  if (!species.unlockRequirements) return false;
  return species.unlockRequirements.every((key) => progress[key]);
}

// ─── XP constants ─────────────────────────────────────────────────────────────

export const MAX_XP = 1200;

/** Set true to bypass all XP/ownership gates during development. */
export const DEV_UNLOCK_ALL = true;

/** UTC date string "YYYY-MM-DD" */
export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
