-- Create AccentTheme enum and preferredAccent on User.

CREATE TYPE "AccentTheme" AS ENUM ('emerald', 'sky', 'violet', 'amber', 'rose', 'cyan');

ALTER TABLE "User" ADD COLUMN "preferredAccent" "AccentTheme" NOT NULL DEFAULT 'emerald';
