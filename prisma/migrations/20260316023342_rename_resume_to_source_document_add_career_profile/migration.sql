/*
  Warnings:

  - You are about to drop the `resumes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."resumes" DROP CONSTRAINT "resumes_userId_fkey";

-- DropTable
DROP TABLE "public"."resumes";

-- CreateTable
CREATE TABLE "public"."source_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."career_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "extractionStatus" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "lastExtractedAt" TIMESTAMP(3),
    "sourceDocumentId" TEXT,
    "experiences" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_documents_userId_key" ON "public"."source_documents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "career_profiles_userId_key" ON "public"."career_profiles"("userId");

-- AddForeignKey
ALTER TABLE "public"."source_documents" ADD CONSTRAINT "source_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."career_profiles" ADD CONSTRAINT "career_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
