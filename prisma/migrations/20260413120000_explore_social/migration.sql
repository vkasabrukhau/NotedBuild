-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'SCHOOL', 'PUBLIC');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "NoteLike" (
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteLike_pkey" PRIMARY KEY ("noteId","userId")
);

-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteLike_userId_createdAt_idx" ON "NoteLike"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteLike_noteId_createdAt_idx" ON "NoteLike"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteComment_noteId_createdAt_idx" ON "NoteComment"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteComment_authorId_createdAt_idx" ON "NoteComment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteComment_deletedAt_idx" ON "NoteComment"("deletedAt");

-- CreateIndex
CREATE INDEX "Note_ownerId_visibility_updatedAt_idx" ON "Note"("ownerId", "visibility", "updatedAt");

-- CreateIndex
CREATE INDEX "Note_visibility_publishedAt_idx" ON "Note"("visibility", "publishedAt");

-- AddForeignKey
ALTER TABLE "NoteLike" ADD CONSTRAINT "NoteLike_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLike" ADD CONSTRAINT "NoteLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
