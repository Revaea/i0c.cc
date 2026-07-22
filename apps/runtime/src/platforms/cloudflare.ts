import { createCloudflareWorker } from "@i0c/plugin-runtime-cloudflare/runtime";

import { handleRedirectRequest } from "@/lib/handler";

const worker = createCloudflareWorker(
  (request, context) => handleRedirectRequest(request, {
    ...context,
    provider: "cloudflare"
  }),
  {
    useDefaultCache: true
  }
);

export default worker;
