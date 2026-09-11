/** New passwords (register, reset, change). Login still accepts older hashes. */
export const PASSWORD_MIN_LENGTH = 14;
export const PASSWORD_MAX_LENGTH = 128;

export type NewPasswordIssue = "length" | "classes" | "common" | "personal" | "repeat";

const COMMON = new Set(
  [
    "password123456",
    "password1234567",
    "password12345678",
    "qwertyuiop1234",
    "qwerty12345678",
    "azertyuiop1234",
    "azerty12345678",
    "iloveyou123456",
    "letmein1234567",
    "welcome1234567",
    "admin123456789",
    "monkey12345678",
    "dragon12345678",
    "baseball123456",
    "football123456",
    "abc12345678901",
    "abcd1234567890",
    "1234567890abcd",
    "1234567890abcde",
    "motdepasse1234",
    "motdepasse12345",
    "passwordpassword",
    "qwertyqwerty123",
  ].map((value) => value.toLocaleLowerCase()),
);

function uniqueCharCount(value: string) {
  return new Set([...value]).size;
}

export function validateNewPassword(password: string, email = ""): NewPasswordIssue | null {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return "length";
  }
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
    return "classes";
  }
  if (uniqueCharCount(password) < 4 || /^(.)\1+$/u.test(password)) {
    return "repeat";
  }

  const lower = password.toLocaleLowerCase();
  if (COMMON.has(lower)) return "common";

  const mailbox = email.trim().toLocaleLowerCase();
  const local = mailbox.split("@")[0] ?? "";
  if (mailbox && lower.includes(mailbox)) return "personal";
  if (local.length >= 4 && lower.includes(local)) return "personal";

  return null;
}
