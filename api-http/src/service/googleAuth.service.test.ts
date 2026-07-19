/**
 * Google account resolution / linking rules.
 *
 * The load-bearing test here is the unverified-email one. We match a Google
 * profile to a local account *by email*, so if we trusted an email Google hasn't
 * verified, anyone able to register a Google account against someone else's
 * address could sign in as them. Everything else is bookkeeping.
 *
 * The repository is mocked — DB-free unit test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/user.repository", () => ({
  getUserFromGoogleId: vi.fn(),
  getUserFromEmail: vi.fn(),
  createGoogleUser: vi.fn(),
  linkGoogleToUser: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import * as userRepo from "../repositories/user.repository";
import { resolveGoogleUser, type GoogleIdentity } from "./googleAuth.service";
import { GoogleEmailUnverifiedError } from "../errors/auth.errors";

const identity: GoogleIdentity = {
  googleId: "google-sub-123",
  email: "alice@example.com",
  emailVerified: true,
  name: "Alice",
  imageUrl: "https://img/a.png",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(userRepo.getUserFromGoogleId).mockResolvedValue(null);
  vi.mocked(userRepo.getUserFromEmail).mockResolvedValue(null);
  vi.mocked(userRepo.createGoogleUser).mockResolvedValue({ id: 9 } as never);
  vi.mocked(userRepo.linkGoogleToUser).mockResolvedValue({ id: 5 } as never);
});

describe("resolveGoogleUser — returning user", () => {
  it("returns the user matched by googleId without touching email lookup", async () => {
    vi.mocked(userRepo.getUserFromGoogleId).mockResolvedValue({ id: 7 } as never);

    const user = await resolveGoogleUser(identity);

    expect(user.id).toBe(7);
    // googleId is the stable key: a user who changed their Google email must
    // still land on their own account rather than a new one.
    expect(userRepo.getUserFromEmail).not.toHaveBeenCalled();
    expect(userRepo.createGoogleUser).not.toHaveBeenCalled();
  });

  it("matches by googleId even when Google reports the email unverified", async () => {
    vi.mocked(userRepo.getUserFromGoogleId).mockResolvedValue({ id: 7 } as never);

    // Already linked, so we aren't trusting the email to decide anything.
    await expect(
      resolveGoogleUser({ ...identity, emailVerified: false }),
    ).resolves.toMatchObject({ id: 7 });
  });
});

describe("resolveGoogleUser — unverified Google email (account-takeover guard)", () => {
  it("rejects rather than linking to an existing account", async () => {
    vi.mocked(userRepo.getUserFromEmail).mockResolvedValue({ id: 5 } as never);

    await expect(
      resolveGoogleUser({ ...identity, emailVerified: false }),
    ).rejects.toBeInstanceOf(GoogleEmailUnverifiedError);

    expect(userRepo.linkGoogleToUser).not.toHaveBeenCalled();
  });

  it("rejects rather than creating a new account", async () => {
    await expect(
      resolveGoogleUser({ ...identity, emailVerified: false }),
    ).rejects.toBeInstanceOf(GoogleEmailUnverifiedError);

    expect(userRepo.createGoogleUser).not.toHaveBeenCalled();
  });

  it("does not even look up the email before checking verification", async () => {
    await expect(
      resolveGoogleUser({ ...identity, emailVerified: false }),
    ).rejects.toBeInstanceOf(GoogleEmailUnverifiedError);

    expect(userRepo.getUserFromEmail).not.toHaveBeenCalled();
  });
});

describe("resolveGoogleUser — linking a verified email", () => {
  it("links to the existing account with that email", async () => {
    vi.mocked(userRepo.getUserFromEmail).mockResolvedValue({ id: 5 } as never);

    const user = await resolveGoogleUser(identity);

    expect(userRepo.linkGoogleToUser).toHaveBeenCalledWith(5, {
      googleId: identity.googleId,
      imageUrl: identity.imageUrl,
    });
    expect(user.id).toBe(5);
    expect(userRepo.createGoogleUser).not.toHaveBeenCalled();
  });
});

describe("resolveGoogleUser — new user", () => {
  it("creates a verified, password-less account", async () => {
    await resolveGoogleUser(identity);

    expect(userRepo.createGoogleUser).toHaveBeenCalledWith({
      name: identity.name,
      email: identity.email,
      googleId: identity.googleId,
      imageUrl: identity.imageUrl,
    });
  });
});
