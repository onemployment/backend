-- CreateTable
CREATE TABLE "public"."personal_profile_sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_profile_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personal_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalIdentity" JSONB NOT NULL DEFAULT '{}',
    "coreValues" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_profile_sources_userId_key" ON "public"."personal_profile_sources"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "personal_profiles_userId_key" ON "public"."personal_profiles"("userId");

-- AddForeignKey
ALTER TABLE "public"."personal_profile_sources" ADD CONSTRAINT "personal_profile_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_profiles" ADD CONSTRAINT "personal_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
