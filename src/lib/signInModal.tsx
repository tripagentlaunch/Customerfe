import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Shared open/close state for the sign-in modal (js/account.js's
// openSignIn()) — the header "Sign in" link lives in Header, the modal
// itself is mounted once in Layout, so both need a common toggle. `message`
// mirrors openSignIn(afterMsg)'s single optional argument (e.g. "Sign in to
// save it to your year.") shown as the modal's headline.
type SignInModalContextValue = {
  isOpen: boolean;
  message: string | null;
  /** `prefill.email`: an address the visitor already typed on this page (e.g. the request form), so the box opens with it filled in. */
  prefill: { email?: string } | null;
  open: (message?: string, prefill?: { email?: string }) => void;
  close: () => void;
};

const SignInModalContext = createContext<SignInModalContextValue | null>(null);

export function SignInModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{ email?: string } | null>(null);

  const value = useMemo<SignInModalContextValue>(
    () => ({
      isOpen,
      message,
      prefill,
      open: (msg, pre) => {
        setMessage(msg ?? null);
        setPrefill(pre ?? null);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [isOpen, message, prefill]
  );

  return <SignInModalContext.Provider value={value}>{children}</SignInModalContext.Provider>;
}

export function useSignInModal() {
  const ctx = useContext(SignInModalContext);
  if (!ctx) throw new Error("useSignInModal() must be used inside <SignInModalProvider>");
  return ctx;
}
