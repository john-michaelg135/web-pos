import { AuthStatePage, linkClass } from "@/components/auth/AuthStatePage";
import { portalUrl } from "@/lib/portal/config";
import { safeReturnTo } from "@/lib/portal/return-to";

export default async function UnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <AuthStatePage
      title="POS is temporarily unavailable"
      actions={
        <>
          <a href={safeReturnTo(returnTo)} className={linkClass}>
            Try again
          </a>
          <a href={portalUrl()} className={linkClass}>
            Return to the Enterprise Portal
          </a>
        </>
      }
    >
      POS could not reach the Enterprise Portal to check your access, so nothing can be opened
      right now. Please try again in a moment.
    </AuthStatePage>
  );
}
