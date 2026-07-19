-- Google OAuth: federated identity on User.
--
-- Two changes, both additive — no existing row changes meaning and no existing
-- password login is affected.

-- A user who only ever signs in with Google has no password to hash. Widening
-- the column is safe: every existing row already has a value, and the login path
-- explicitly rejects a null password rather than attempting a compare.
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Google's stable subject id. Unique so one Google account cannot be linked to
-- two local users. Nullable: password-only accounts never have one, and Postgres
-- treats NULLs as distinct, so many rows can hold NULL under a UNIQUE index.
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;

CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
