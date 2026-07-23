import { redirect } from "next/navigation";

import { getWebUiReadSessionAuthorization } from "@/auth/authorization";
import { SignInPanel } from "@/components/ui/feedback/sign-in-panel";
import { RedirectsGroupsPage } from "@/components/redirects-groups/redirects-groups-page";

interface HomeProps {
  searchParams: Promise<{
    view?: string | string[];
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const [authorization, query] = await Promise.all([
    getWebUiReadSessionAuthorization(),
    searchParams,
  ]);

  if (authorization.status === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <SignInPanel />
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
