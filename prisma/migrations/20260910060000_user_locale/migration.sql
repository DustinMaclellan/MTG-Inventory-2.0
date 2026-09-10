-- Create AppLocale enum and preferredLocale on User.

CREATE TYPE "AppLocale" AS ENUM ('en', 'fr');

ALTER TABLE "User" ADD COLUMN "preferredLocale" "AppLocale" NOT NULL DEFAULT 'en';
