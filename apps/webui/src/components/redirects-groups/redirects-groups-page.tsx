import { RedirectsGroupsManager } from "@/components/redirects-groups";

interface RedirectsGroupsPageProps {
  isReadOnly?: boolean;
}

export function RedirectsGroupsPage({ isReadOnly = false }: RedirectsGroupsPageProps) {
  return <RedirectsGroupsManager isReadOnly={isReadOnly} />;
}
