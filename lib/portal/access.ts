import { validateSession, type Validation } from "./client";
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

  return { check };
}
