import GitHubProvider from "next-auth/providers/github";

import { canGitHubUserSignIn, isWebUiTokenAuthorized } from "./access-policy";

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
    async signIn({ account }) {
      if (
        account?.provider !== "github" ||
        !canGitHubUserSignIn(account.providerAccountId)
      ) {
        return "/access-denied";
      }

      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "github") {
        token.githubUserId = account.providerAccountId;

        if (account.access_token) {
          token.accessToken = account.access_token;
        }
      }

      if (!isWebUiTokenAuthorized(token)) {
        delete token.accessToken;
      }

      return token;
    },
    async session({ session, token }) {
      // IMPORTANT: Never expose OAuth access tokens to the browser.
      // Keep tokens only in the server-side JWT and read them in API routes via getToken().
      const isAuthorized = isWebUiTokenAuthorized(token);
      session.hasAccessToken = isAuthorized;
      session.isAuthorized = isAuthorized;
      return session;
    }
  }
} satisfies AuthConfig;
