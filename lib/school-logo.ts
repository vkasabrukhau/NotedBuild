import "server-only";

import fs from "node:fs";
import path from "node:path";

const SCHOOL_LOGO_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "img_transparent",
);

let cachedLogoFilenames: string[] | null = null;
let cachedNormalizedLogoMap: Map<string, string> | null = null;

function normalizeSchoolName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replaceAll("&", " and ")
    .replaceAll("'", "")
    .replaceAll("’", "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/\busa\b/g, " ")
    .replace(/\buniversity of california\s*,\s*/g, "university of california ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLogoFilenames() {
  if (cachedLogoFilenames) {
    return cachedLogoFilenames;
  }

  if (!fs.existsSync(SCHOOL_LOGO_DIRECTORY)) {
    cachedLogoFilenames = [];
    return cachedLogoFilenames;
  }

  cachedLogoFilenames = fs
    .readdirSync(SCHOOL_LOGO_DIRECTORY)
    .filter((entry) => entry.toLowerCase().endsWith(".png"));

  return cachedLogoFilenames;
}

function getNormalizedLogoMap() {
  if (cachedNormalizedLogoMap) {
    return cachedNormalizedLogoMap;
  }

  cachedNormalizedLogoMap = new Map<string, string>();

  for (const filename of getLogoFilenames()) {
    const stem = path.parse(filename).name;
    const normalized = normalizeSchoolName(stem);

    if (!cachedNormalizedLogoMap.has(normalized)) {
      cachedNormalizedLogoMap.set(normalized, filename);
    }
  }

  return cachedNormalizedLogoMap;
}

export function getMatchedSchoolLogoFilename(schoolName: string | null) {
  if (!schoolName) {
    return null;
  }

  const exactFilename = `${schoolName}.png`;

  if (getLogoFilenames().includes(exactFilename)) {
    return exactFilename;
  }

  const normalizedMatch = getNormalizedLogoMap().get(
    normalizeSchoolName(schoolName),
  );

  return normalizedMatch ?? null;
}

export function getMatchedSchoolLogoUrl(schoolName: string | null) {
  const filename = getMatchedSchoolLogoFilename(schoolName);

  if (!filename) {
    return null;
  }

  return `/api/school-logos/${encodeURIComponent(filename)}`;
}

export function getSchoolLogoFilePath(filename: string) {
  const safeFilename = path.basename(filename);

  if (!getLogoFilenames().includes(safeFilename)) {
    return null;
  }

  return path.join(SCHOOL_LOGO_DIRECTORY, safeFilename);
}
