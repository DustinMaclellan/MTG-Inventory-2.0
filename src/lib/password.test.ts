import { describe, expect, it } from "vitest";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "./password";

const ok = "correct-horse-1";

describe("validateNewPassword", () => {
  it("accepts a long mixed password", () => {
    expect(validateNewPassword(ok)).toBeNull();
  });

  it(`rejects fewer than ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(validateNewPassword("Short1pass")).toBe("length");
  });

  it("rejects letters without a number", () => {
    expect(validateNewPassword("abcdefghijklmn")).toBe("classes");
  });

  it("rejects numbers without a letter", () => {
    expect(validateNewPassword("12345678901234")).toBe("classes");
  });

  it("rejects a common password that meets length and classes", () => {
    expect(validateNewPassword("password123456")).toBe("common");
  });

  it("rejects the email local-part inside the password", () => {
    expect(validateNewPassword("dustinmail-abc1", "dustinmail@example.com")).toBe("personal");
  });

  it("rejects a single repeated character", () => {
    expect(validateNewPassword("aaaaaaaaaaaaaa1")).toBe("repeat");
  });
});
