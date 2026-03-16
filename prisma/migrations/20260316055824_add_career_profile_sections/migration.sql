-- AlterTable
ALTER TABLE "public"."career_profiles" ADD COLUMN     "certifications" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "education" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "professionalDevelopment" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "projects" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "skills" JSONB NOT NULL DEFAULT '{}';
