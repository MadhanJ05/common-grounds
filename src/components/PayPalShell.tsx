"use client";

import { createContext, useContext } from "react";
import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";

const Configured = createContext(false);
const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

/** Loads the PayPal JS SDK (v6) for the buttons inside. */
export function PayPalShell({ children }: { children: React.ReactNode }) {
  if (!clientId) return <Configured.Provider value={false}>{children}</Configured.Provider>;
  return (
    <Configured.Provider value={true}>
      <PayPalProvider
        clientId={clientId}
        environment={process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox"}
        components={["paypal-payments"]}
        pageType="checkout"
      >
        {children}
      </PayPalProvider>
    </Configured.Provider>
  );
}

type ButtonProps = React.ComponentProps<typeof PayPalOneTimePaymentButton>;

/** The PayPal button, or a clear note if this deployment has no PayPal client id. */
export function PayPalButton(props: ButtonProps) {
  const configured = useContext(Configured);
  if (!configured) {
    return (
      <p className="rounded-xl bg-surface-2 p-3 text-center text-sm text-warn">
        PayPal isn&apos;t configured on this server yet (set NEXT_PUBLIC_PAYPAL_CLIENT_ID).
      </p>
    );
  }
  return <PayPalOneTimePaymentButton {...props} />;
}
