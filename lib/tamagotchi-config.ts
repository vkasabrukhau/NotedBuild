export type TamagotchiSpecies = {
  id: string;
  name: string;
  gif: string;
  /** null = always available (Bear) */
  unlockStreakDays: number | null;
  startingHealth: number;
  startingThreshold: number;
  healthUpgradeBump: number;
};

export const TAMAGOTCHI_SPECIES: TamagotchiSpecies[] = [
  {
    id: "bear",
    name: "Bear",
    gif: "/tamagotchi/bear.gif",
    unlockStreakDays: null,
    startingHealth: 7,
    startingThreshold: 7,
    healthUpgradeBump: 1,
  },
  {
    id: "ghost",
    name: "Ghost",
    gif: "/tamagotchi/ghost.gif",
    unlockStreakDays: 10,
    startingHealth: 10,
    startingThreshold: 10,
    healthUpgradeBump: 2,
  },
  {
    id: "bonely",
    name: "Bonely",
    gif: "/tamagotchi/bonely.gif",
    unlockStreakDays: 15,
    startingHealth: 10,
    startingThreshold: 10,
    healthUpgradeBump: 2,
  },
  {
    id: "lugia",
    name: "Lugia",
    gif: "/tamagotchi/lugia.gif",
    unlockStreakDays: 30,
    startingHealth: 15,
    startingThreshold: 15,
    healthUpgradeBump: 3,
  },
  {
    id: "mewtwo",
    name: "Mewtwo",
    gif: "/tamagotchi/mewtwo.gif",
    unlockStreakDays: 40,
    startingHealth: 20,
    startingThreshold: 20,
    healthUpgradeBump: 4,
  },
  {
    id: "charizard",
    name: "Charizard",
    gif: "/tamagotchi/charizard.gif",
    unlockStreakDays: 45,
    startingHealth: 30,
    startingThreshold: 30,
    healthUpgradeBump: 5,
  },
  {
    id: "snorlax",
    name: "Snorlax",
    gif: "/tamagotchi/snorlax.gif",
    unlockStreakDays: 50,
    startingHealth: 35,
    startingThreshold: 35,
    healthUpgradeBump: 6,
  },
];

export function getSpecies(id: string): TamagotchiSpecies | undefined {
  return TAMAGOTCHI_SPECIES.find((s) => s.id === id);
}

/** UTC date string "YYYY-MM-DD" */
export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
