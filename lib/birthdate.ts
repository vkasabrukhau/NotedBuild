export function calculateAgeFromBirthdate(
  birthdate: string,
  now: Date = new Date(),
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate.trim());

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  let age = currentYear - year;

  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  if (age < 1 || age > 120) {
    return null;
  }

  return age;
}
