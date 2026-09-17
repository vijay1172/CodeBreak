import { describe, expect, it } from "vitest";
import { profileViewModel } from "../client/src/components/UserProfile.jsx";
import { findUser } from "../server/routes/user.js";

describe("profile API contract", () => {
  it("returns the requested user from the API", () => {
    expect(findUser("user-1")?.id).toBe("user-1");
  });

  it("shows the user's name from the live API response", () => {
    const profile = profileViewModel(findUser("user-1"));
    expect(profile.displayName).toBe("Priya Sharma");
  });

  it("returns 404 for an unknown user", () => {
    expect(findUser("missing")).toBeNull();
  });
});
