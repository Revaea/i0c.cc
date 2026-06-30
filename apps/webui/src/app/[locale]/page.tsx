import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";

import { SignInPanel } from "@/components/ui/sign-in-panel";
import { authOptions } from "@/auth/config";
import { RedirectsGroupsPage } from "@/components/redirects-groups/redirects-groups-page";

type SessionWithToken = Session & { hasAccessToken: true };

function hasAccessToken(session: Session | null): session is SessionWithToken {
  return (
    !!session &&
    (session as Session & { hasAccessToken?: unknown }).hasAccessToken === true
  );
}

export default async function Home() {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!hasAccessToken(session)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <SignInPanel />
      </main>
    );
  }

  return <RedirectsGroupsPage />;
}
