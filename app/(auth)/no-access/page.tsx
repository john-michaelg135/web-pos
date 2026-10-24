import { AuthStatePage, linkClass } from "@/components/auth/AuthStatePage";
import { portalUrl } from "@/lib/portal/config";

export default function NoAccessPage() {
  return (
    <AuthStatePage
      title="You don't have access to this page"
      actions={
        <a href={portalUrl()} className={linkClass}>
          Return to the Enterprise Portal
        </a>
      }
    >
      Staff need the Module this page belongs to, and yours has not been granted it. Ask an
      administrator to grant it to you at the Enterprise Portal.
    </AuthStatePage>
  );
}
