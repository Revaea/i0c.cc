import { redirect } from "next/navigation";

import { getWebUiReadSessionAuthorization } from "@/auth/authorization";
import { SignInPanel } from "@/components/ui/sign-in-panel";
import { RedirectsGroupsPage } from "@/components/redirects-groups/redirects-groups-page";

export default async function Home() {
  const authorization = await getWebUiReadSessionAuthorization();

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

  return <RedirectsGroupsPage isReadOnly={authorization.isReadOnly} />;
}
