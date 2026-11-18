// The visitor's name, mobile and email, kept in this browser (localStorage "ta_profile") so the sign-in box can fill them in next time.
// Other keys in the same object (e.g. origin, lib/origin.ts) are left untouched.
const KEY = "ta_profile";

export type Profile = { name?: string; phone?: string; email?: string; [k: string]: unknown };

export function readProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : {};
    return p && typeof p === "object" ? (p as Profile) : {};
  } catch {
    return {};
  }
}

/** Name and mobile only fill what is empty (never overwrite what is there); the email is the latest one used, so switching accounts
 *  is remembered. Never throws (storage can be blocked). */
export function mergeProfile(patch: { name?: string; phone?: string; email?: string }) {
  try {
    const p = readProfile();
    let changed = false;
    if (patch.name && !p.name) {
      p.name = patch.name;
      changed = true;
    }
    if (patch.phone && !p.phone) {
      p.phone = patch.phone;
      changed = true;
    }
    const email = (patch.email ?? "").trim().toLowerCase();
    if (email && p.email !== email) {
      p.email = email;
      changed = true;
    }
    if (changed) localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
