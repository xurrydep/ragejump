"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // During build time or when no app ID is provided, render children without Privy
  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy authentication will not be available.');
    return <>{children}</>;
  }

  // Determine the current environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  console.log('Privy configuration:', {
    isDevelopment,
    isLocalhost,
    privyAppId,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
  });

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        loginMethodsAndOrder: {
          // Don't forget to enable Monad Games ID support in:
          // Global Wallet > Integrations > Monad Games ID (click on the slide to enable)
          primary: ["privy:cmd8euall0037le0my79qpz42"], // This is the Cross App ID, DO NOT CHANGE THIS
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // Ensure proper origin validation
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'eoaOnly',
          },
        },
        // Add development-specific configuration
        ...(isDevelopment && {
          // Additional dev config can go here if needed
        }),
      }}
    >
      {children}
    </PrivyProvider>
  );
}