import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn, signOut } from "./client";
import { hasGateSessionMarker } from "./gate-session-marker";
import { resolveSignInGateState } from "./sign-in-gate";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 *
 * With auth on, visitors are signed out until they authenticate — in the sandbox
 * live preview too, which does real sign-in. The shared dev user appears only
 * when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
 * While the session is still resolving, gates that care about signed-out state
 * render nothing so there's no signed-out flash on hard reload.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  return user ? <>{children}</> : null;
}
