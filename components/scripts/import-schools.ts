import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

type SchoolCsvRow = {
  INSTNM?: string;
  CITY?: string;
  STABBR?: string;
};

const prisma = new PrismaClient();
const BATCH_SIZE = 1000;

function findCsvPath() {
  const candidates = [
    path.join(process.cwd(), "components", "data", "schools.csv"),
    path.join(process.cwd(), "data", "schools.csv"),
  ];

  const csvPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!csvPath) {
    throw new Error(
      "Could not find schools.csv in components/data or data.",
    );
  }

  return csvPath;
}

function toSchoolRecord(row: SchoolCsvRow) {
  const name = row.INSTNM?.trim();

  if (!name) {
    return null;
  }

  const city = row.CITY?.trim();
  const state = row.STABBR?.trim();
  const location = [city, state].filter(Boolean).join(", ") || null;

  return {
    name,
    location,
  };
}

async function main() {
  const csvPath = findCsvPath();
  const csv = fs.readFileSync(csvPath, "utf8");

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }) as SchoolCsvRow[];

  const schools = rows
    .map(toSchoolRecord)
    .filter((school): school is { name: string; location: string | null } =>
      Boolean(school),
    );

  let importedCount = 0;

  for (let index = 0; index < schools.length; index += BATCH_SIZE) {
    const batch = schools.slice(index, index + BATCH_SIZE);

    const result = await prisma.school.createMany({
      data: batch,
      skipDuplicates: true,
    });

    importedCount += result.count;
    console.log(
      `Imported batch ${Math.floor(index / BATCH_SIZE) + 1}: ${result.count} rows`,
    );
  }

  console.log(`Finished. Imported ${importedCount} school rows from ${csvPath}`);
}

main()
  .catch((error) => {
    console.error("School import failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
