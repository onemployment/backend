/*
  Authentication Schema Migration - Destructive
  
  This migration drops and recreates the users table with the complete
  authentication schema. Data loss is acceptable as only test data exists.
*/

-- Drop existing users table and all related objects
DROP TABLE IF EXISTS "public"."users" CASCADE;

-- Create new users table with complete authentication schema
CREATE TABLE "public"."users" (
    -- Primary identifier
    "id" TEXT NOT NULL,
    
    -- Authentication fields
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" VARCHAR(255), -- nullable for OAuth-only users
    
    -- Personal information
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(200), -- optional, set post-registration
    
    -- OAuth provider linking
    "googleId" VARCHAR(255), -- nullable
    
    -- Account status
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit trail fields
    "accountCreationMethod" VARCHAR(20) NOT NULL, -- "local" or "google"
    "lastPasswordChange" TIMESTAMP(3),
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- Create performance indexes
CREATE INDEX "user_email_idx" ON "public"."users"("email");
CREATE INDEX "user_username_idx" ON "public"."users"("username");
CREATE INDEX "user_created_at_idx" ON "public"."users"("createdAt");
CREATE INDEX "user_last_login_idx" ON "public"."users"("lastLoginAt");
CREATE INDEX "user_active_idx" ON "public"."users"("isActive");
CREATE INDEX "user_creation_method_idx" ON "public"."users"("accountCreationMethod");
