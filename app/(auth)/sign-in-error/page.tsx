import { AuthStatePage, linkClass } from "@/components/auth/AuthStatePage";
import { LOGIN_PATH } from "@/lib/portal/config";

const MESSAGES: Record<string, { title: string; body: string }> = {
  denied: {
    title: "You don't have access to POS",
    body: "The Enterprise Portal did not grant you access. Ask for a POS Module to be granted to you at the Enterprise Portal.",
  },
  unavailable: {
    title: "Sign-in is temporarily unavailable",
    body: "POS could not reach the Enterprise Portal. Please try again in a moment.",
  },
  failed: {
    title: "Sign-in could not be completed",
    body: "The sign-in link may have expired or already been used. Please sign in again.",
  },
};

export default async function SignInErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason ?? ""] ?? MESSAGES.failed;

  return (
    <AuthStatePage
      title={message.title}
      actions={
        <a href={LOGIN_PATH} className={linkClass}>
          Try signing in again
        </a>
      }
    >
      {message.body}
    </AuthStatePage>
  );
}
