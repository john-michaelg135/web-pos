import { validateSession, type Staff, type Validation } from "./client";
import { MODULES } from "./modules";
import { DEV_STAFF, devBypassEnabled } from "./dev-bypass";

/**
 * Access for one page load. The Enterprise Portal is asked once per Module and the answer
 * is reused for the rest of the load; nothing is remembered beyond it.
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
      answer = validateSession(sessionHandle, module);
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
