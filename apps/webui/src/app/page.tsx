import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { localeCookieName, resolveAppLocale } from "@/i18n/routing";

export default async function RootPage() {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(localeCookieName)?.value);

  redirect(`/${locale}`);
}
