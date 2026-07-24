import { redirect } from "next/navigation";

import { getWebUiReadSessionAuthorization } from "@/auth/authorization";
import { SignInPanel } from "@/components/ui/feedback/sign-in-panel";
import { RedirectsGroupsPage } from "@/components/redirects-groups/redirects-groups-page";

interface HomeProps {
  searchParams: Promise<{
    error?: string | string[];
    view?: string | string[];
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const [authorization, query] = await Promise.all([
    getWebUiReadSessionAuthorization(),
    searchParams,
  ]);

  if (authorization.status === "unauthenticated") {
    const error = Array.isArray(query.error) ? query.error[0] : query.error;
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <SignInPanel hasError={Boolean(error)} />
      </main>
    );
  }

  if (authorization.status === "forbidden") {
    redirect("/access-denied");
  }

  const view = Array.isArray(query.view) ? query.view[0] : query.view;

  return (
    <RedirectsGroupsPage
      initialView={view === "settings" ? "settings" : "rules"}
      isReadOnly={authorization.isReadOnly}
    />
  );
}
