import { AccessDenied } from "@/components/module-pos/AccessDenied";

export const metadata = {
  title: "Access Denied | ERP System",
  description: "You do not have permission to access this page.",
};

export default function AccessDeniedPage() {
  return <AccessDenied />;
}
