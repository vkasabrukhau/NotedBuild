import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getSchoolLogoFilePath } from "@/lib/school-logo";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const filePath = getSchoolLogoFilePath(decodeURIComponent(filename));

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileBuffer = await fs.readFile(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
