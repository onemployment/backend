-- CreateTable
CREATE TABLE "public"."applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "roleTitle" VARCHAR(255) NOT NULL,
    "jobPostingText" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_user_id_idx" ON "public"."applications"("userId");

-- CreateIndex
CREATE INDEX "application_status_idx" ON "public"."applications"("status");

-- AddForeignKey
ALTER TABLE "public"."applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
