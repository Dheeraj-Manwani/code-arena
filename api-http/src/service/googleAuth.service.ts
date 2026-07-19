import * as userRepo from "../repositories/user.repository";
import { GoogleEmailUnverifiedError } from "../errors/auth.errors";
import { logger } from "../lib/logger";
import type { User } from "@prisma/client";

/** The fields we take from a Google profile, already normalised. */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  imageUrl?: string | null;
}

/**
 * Resolve a Google identity to a local user, creating or linking as needed.
 *
 * The security rule is the `emailVerified` gate. Google will happily issue a
 * profile for an account whose email it has not verified, and email is what we
 * match on — so without this check, anyone who registers a Google account
 * against someone else's address could sign in as that person and take over
 * their account. Everything else here is bookkeeping; this is the part that
 * matters.
 *
 * Resolution order:
 *  1. Known `googleId` → that user. (Handles a changed email on the Google side.)
 *  2. Same email → link, provided Google verified it.
 *  3. Otherwise → new verified, password-less account.
 */
export const resolveGoogleUser = async (identity: GoogleIdentity): Promise<User> => {
  const existingByGoogleId = await userRepo.getUserFromGoogleId(identity.googleId);
  if (existingByGoogleId) {
    return existingByGoogleId;
  }

  // Below this point we are about to trust `identity.email` to decide which
  // account this is, so it has to be an address Google actually verified.
  if (!identity.emailVerified) {
    logger.warn(
      { googleId: identity.googleId },
      "Rejected Google sign-in: email not verified by Google",
    );
    throw new GoogleEmailUnverifiedError();
  }

  const existingByEmail = await userRepo.getUserFromEmail(identity.email);
  if (existingByEmail) {
    logger.info(
      { userId: existingByEmail.id },
      "Linking Google identity to existing account",
    );
    return await userRepo.linkGoogleToUser(existingByEmail.id, {
      googleId: identity.googleId,
      imageUrl: identity.imageUrl,
    });
  }

  return await userRepo.createGoogleUser({
    name: identity.name,
    email: identity.email,
    googleId: identity.googleId,
    imageUrl: identity.imageUrl,
  });
};
