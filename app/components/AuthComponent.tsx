/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { useEffect, useState } from "react";
import {
  usePrivy,
  CrossAppAccountWithMetadata,
} from "@privy-io/react-auth";
import { useMonadGamesUser } from "../hooks/useMonadGamesUser";

// Separate component for when Privy is not configured
function AuthNotConfigured() {
  return (
    <div className="text-yellow-400 text-sm">
      Authentication not configured
    </div>
  );
}

// Main auth component with Privy hooks
function PrivyAuth({ onAddressChange }: { onAddressChange: (address: string) => void }) {
  const { authenticated, user, ready, logout, login } = usePrivy();
  const [accountAddress, setAccountAddress] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  
  const { 
    user: monadUser, 
    hasUsername, 
    isLoading: isLoadingUser, 
    error: userError 
  } = useMonadGamesUser(accountAddress);

  useEffect(() => {
    console.log('Auth state:', { authenticated, ready, user: !!user });
    
    // Check if privy is ready and user is authenticated
    if (authenticated && user && ready) {
      console.log('User linkedAccounts:', user.linkedAccounts);
      // Check if user has linkedAccounts
      if (user.linkedAccounts.length > 0) {
        // Get the cross app account created using Monad Games ID        
        const crossAppAccount: CrossAppAccountWithMetadata = user.linkedAccounts.filter(account => account.type === "cross_app" && account.providerApp.id === "cmd8euall0037le0my79qpz42")[0] as CrossAppAccountWithMetadata;

        console.log('CrossApp account:', crossAppAccount);
        // The first embedded wallet created using Monad Games ID, is the wallet address
        if (crossAppAccount && crossAppAccount.embeddedWallets.length > 0) {
          const address = crossAppAccount.embeddedWallets[0].address;
          console.log('Setting wallet address:', address);
          setAccountAddress(address);
          onAddressChange(address);
          setMessage("");
          setAuthError("");
        } else {
          setMessage("No embedded wallet found in cross-app account.");
        }
      } else {
        setMessage("You need to link your Monad Games ID account to continue.");
      }
    } else if (ready && !authenticated) {
      // Clear address when not authenticated
      setAccountAddress("");
      onAddressChange("");
      setMessage("");
    }
  }, [authenticated, user, ready, onAddressChange]);

  // Handle login with better error handling
  const handleLogin = async () => {
    try {
      setAuthError("");
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!ready) {
    return <div className="text-white text-sm">Loading authentication...</div>;
  }

  if (authError) {
    return (
      <div className="text-red-400 text-sm">
        <div>Authentication Error:</div>
        <div className="text-xs mt-1">{authError}</div>
        <button 
          onClick={() => setAuthError("")}
          className="bg-blue-600 text-white mt-2 px-4 py-2 rounded text-xs hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="text-center">
        <button 
          onClick={handleLogin}
          className="bg-blue-600 text-white mt-4 px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Login with Monad Games ID
        </button>
        <div className="text-xs text-gray-400 mt-2">
          Development Mode: {process.env.NODE_ENV === 'development' ? 'ON' : 'OFF'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {accountAddress ? (
        <>
          {hasUsername && monadUser ? (
            <span className="bg-white text-black mt-4 px-6 py-3 rounded-lg shadow hover:bg-white transition"> {monadUser.username} </span>
          ) : (
            <a 
              href="https://monad-games-id-site.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yellow-600 text-white mt-4 px-6 py-3 rounded-lg shadow hover:bg-yellow-700 transition"
            >
              Register
            </a>
          )}
        </>
      ) : message ? (
        <span className="text-red-400 text-xs">{message}</span>
      ) : (
        <span className="text-yellow-400 text-xs">Checking...</span>
      )}
      
      <button 
        onClick={logout}
        className="bg-red-600 text-white mt-4 px-6 py-3 rounded-lg shadow hover:bg-red-700 transition"
      >
        Logout
      </button>
    </div>
  );
}

// Main component that conditionally renders based on Privy configuration
export default function AuthComponent({ onAddressChange }: { onAddressChange: (address: string) => void }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  if (!privyAppId) {
    return <AuthNotConfigured />;
  }
  
  return <PrivyAuth onAddressChange={onAddressChange} />;
}