import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getWebUiManagementSessionAuthorization } from "@/auth/authorization";
import { AccessDeniedPanel } from "@/components/ui/feedback/access-denied-panel";

interface AccessDeniedPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AccessDeniedPage({ params }: AccessDeniedPageProps) {
  const [{ locale }, authorization] = await Promise.all([
    params,
    getWebUiManagementSessionAuthorization(),
  ]);
  setRequestLocale(locale);

  if (authorization.status === "authorized") {
    redirect(`/${locale}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <AccessDeniedPanel />
    </main>
  );
}
