import { RedirectsGroupsManager } from "@/components/redirects-groups";

interface RedirectsGroupsPageProps {
  initialView?: "rules" | "settings";
  isReadOnly?: boolean;
}

export function RedirectsGroupsPage({
  initialView = "rules",
  isReadOnly = false,
}: RedirectsGroupsPageProps) {
  return (
    <RedirectsGroupsManager
      initialView={initialView}
      isReadOnly={isReadOnly}
    />
  );
}
