"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeLogin } from "@/lib/auth/cognito";
import { Loader } from "@/components/system/Loader";
import { Alert } from "@/components/feedback/Alert";
import { Button } from "@/design-system/components/Button";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const errorDescription = params.get("error_description") || params.get("error");

    if (errorDescription) {
      setError(errorDescription);
      return;
    }

    if (!code) {
      setError("No authorization code was returned");
      return;
    }

    completeLogin(code)
      .then(() => router.replace("/"))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      });
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert variant="error" title="Sign-in failed" description={error} />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push("/")}>
            Back to workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader label="SIGNING IN" sublabel="Completing the authorization code exchange" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader label="SIGNING IN" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
