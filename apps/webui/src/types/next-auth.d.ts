import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /**
     * Indicates server-side JWT contains an OAuth access token.
     * The token itself must never be sent to the client.
     */
    hasAccessToken?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
