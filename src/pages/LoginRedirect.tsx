import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSignInModal } from "../lib/signInModal";

// /login from a direct link (2026-11-21, website flow review: it showed the 404 page). Signing in on this
// site is the sign-in box over the home page: this goes home and opens it. Signed in already: just home.
export default function LoginRedirect() {
  const { signedIn, loading } = useAuth();
  const signIn = useSignInModal();
  useEffect(() => {
    if (!loading && !signedIn) signIn.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, signedIn]);
  return loading ? null : <Navigate to="/" replace />;
}
