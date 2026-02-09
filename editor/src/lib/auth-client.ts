import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

// Better Auth React client for frontend components
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

// Export commonly used functions for convenience
export const { signIn, signUp, signOut, useSession, organization } = authClient;
