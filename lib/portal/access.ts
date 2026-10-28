import { validateSession, type Staff, type Validation } from "./client";
import { MODULES } from "./modules";
import { DEV_STAFF, devBypassEnabled } from "./dev-bypass";

// How long a Portal answer for one session and Module is reused across page loads. Every
// navigation used to wait on several Portal round trips; a revoked grant or Role change
// now takes effect within this window. Only "allowed" and "denied" are remembered.
const REMEMBER_MS = 30_000;
const remembered = new Map<string, { at: number; answer: Validation }>();

function rememberedAnswer(sessionHandle: string, module: string): Promise<Validation> {
  const key = `${sessionHandle}|${module}`;
  const hit = remembered.get(key);
  if (hit && Date.now() - hit.at < REMEMBER_MS) return Promise.resolve(hit.answer);

  return validateSession(sessionHandle, module).then((answer) => {
    if (answer.decision === "allowed" || answer.decision === "denied") {
      remembered.set(key, { at: Date.now(), answer });
      // Keep the map small: drop anything already expired.
      if (remembered.size > 500) {
        for (const [k, v] of remembered) if (Date.now() - v.at >= REMEMBER_MS) remembered.delete(k);
      }
    } else {
      remembered.delete(key);
    }
    return answer;
  });
}

/**
 * Access for one page load. The Enterprise Portal is asked once per Module; the answer is
 * reused for the rest of the load and, briefly, for the next loads (see REMEMBER_MS).
 */
export function accessFor(
  sessionHandle: string | undefined,
  { bypass = devBypassEnabled() }: { bypass?: boolean } = {},
) {
  const answers = new Map<string, Promise<Validation>>();

  function check(module: string): Promise<Validation> {
    if (bypass) {
      return Promise.resolve({ decision: "allowed", staff: DEV_STAFF });
    }

    if (!sessionHandle) {
      return Promise.resolve({ decision: "invalid" });
    }

    let answer = answers.get(module);

    if (!answer) {
      answer = rememberedAnswer(sessionHandle, module);
      answers.set(module, answer);
    }

    return answer;
  }

  /**
   * The Enterprise Portal returns the Role only with a positive answer for a Module, so it
   * is read from the first Module in sidebar order the Staff member holds. Staff holding
   * none have no readable Role.
   */
  async function role(): Promise<
    { decision: "allowed"; role: string; staff: Staff } | Exclude<Validation, { decision: "allowed" }>
  > {
    for (const { name } of MODULES) {
      const answer = await check(name);

      if (answer.decision === "allowed") return { decision: "allowed", role: answer.staff.role, staff: answer.staff };
      if (answer.decision !== "denied") return answer;
    }

    return { decision: "denied" };
  }

  return { check, role };
}
