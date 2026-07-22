import GitHubProvider from "next-auth/providers/github";

import { bootstrapConfig } from "@i0c/config";

import {
  applyWebUiTokenAuthorization,
  canGitHubUserSignIn,
  isWebUiTokenAuthorized,
} from "./access-policy";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
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
          scope: bootstrapConfig.webui.githubOAuthScope
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
        !await canGitHubUserSignIn(account.providerAccountId)
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

      await applyWebUiTokenAuthorization(token);

      return token;
    },
    async session({ session, token }) {
      // IMPORTANT: Never expose OAuth access tokens to the browser.
      // Keep tokens only in the server-side JWT and read them in API routes via getToken().
      const isAuthorized = await isWebUiTokenAuthorized(token);
      session.hasAccessToken = isAuthorized;
      session.isAuthorized = isAuthorized;
      return session;
    }
  }
} satisfies AuthConfig;
