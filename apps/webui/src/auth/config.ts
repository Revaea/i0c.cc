import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

type NextAuthHandler = typeof import("next-auth/next")["default"];
type AuthConfig = Parameters<NextAuthHandler>[2];

export const authOptions = {
  secret: requireEnv("NEXTAUTH_SECRET"),
  providers: [
    GitHubProvider({
      clientId: requireEnv("GITHUB_CLIENT_ID"),
      clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
      authorization: {
        params: {
          // Default GitHub OAuth scopes are usually "read:user user:email".
          // We additionally need repo contents access for reading/writing redirects config.
          // Use the narrowest scope possible for your use case.
          scope: readOptionalEnv("GITHUB_OAUTH_SCOPE") ?? "read:user user:email public_repo"
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        (token as JWT & { accessToken?: string }).accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // IMPORTANT: Never expose OAuth access tokens to the browser.
      // Keep tokens only in the server-side JWT and read them in API routes via getToken().
      const accessToken = (token as JWT & { accessToken?: unknown }).accessToken;
      if (typeof accessToken === "string" && accessToken.length > 0) {
        (session as Session & { hasAccessToken?: boolean }).hasAccessToken = true;
      }
      return session;
    }
  }
} satisfies AuthConfig;
