import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { env, isGoogleOAuthConfigured } from "../config/env";
import { resolveGoogleUser, type GoogleIdentity } from "../service/googleAuth.service";
import { logger } from "../lib/logger";

/**
 * Passport setup for Google sign-in.
 *
 * `session: false` throughout — this process issues its own JWT access token and
 * httpOnly refresh cookie (see auth.service.ts), so Passport is used only to run
 * the OAuth handshake. There is no `serializeUser`/`deserializeUser` and no
 * `passport.session()`, because there is no session to keep: adding one would
 * mean express-session and a store this deployment deliberately doesn't have.
 *
 * OAuth CSRF is handled by our own state store (auth/oauthStateStore.ts) rather
 * than passport's session-backed one.
 */

/** Pull the one verified email Google vouches for, if any. */
function extractIdentity(profile: Profile): GoogleIdentity | null {
  // passport-google-oauth20 normalises `emails` to [{ value, verified }], but
  // `verified` arrives as a boolean or the string "true" depending on the
  // underlying payload — normalise both.
  const primary = profile.emails?.[0];
  if (!primary?.value) {
    return null;
  }

  const rawVerified = (primary as { verified?: boolean | string }).verified;
  const emailVerified = rawVerified === true || rawVerified === "true";

  return {
    googleId: profile.id,
    email: primary.value.toLowerCase().trim(),
    emailVerified,
    name: profile.displayName?.trim() || primary.value.split("@")[0],
    imageUrl: profile.photos?.[0]?.value ?? null,
  };
}

export function configurePassport(): void {
  if (!isGoogleOAuthConfigured) {
    logger.info("Google OAuth not configured — /api/auth/google is disabled");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL: env.GOOGLE_CALLBACK_URL!,
        scope: ["profile", "email"],
        // Our own state store owns CSRF; passport's would require a session.
        state: false,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const identity = extractIdentity(profile);
          if (!identity) {
            // No email on the profile: nothing to key an account off.
            return done(null, false, { message: "Google profile has no email" });
          }

          const user = await resolveGoogleUser(identity);
          return done(null, user);
        } catch (err) {
          // Includes GoogleEmailUnverifiedError — surfaced to the callback
          // handler, which redirects with an error rather than 500ing.
          return done(err as Error);
        }
      },
    ),
  );

  logger.info("Google OAuth strategy configured");
}

export { passport };
