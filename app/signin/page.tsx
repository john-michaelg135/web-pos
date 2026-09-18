import { Suspense } from "react";
import { RedirectToLogin } from "@/components/shared/RedirectToLogin";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <RedirectToLogin />
    </Suspense>
  );
}
