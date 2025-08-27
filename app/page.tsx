"use client";
import { useState } from 'react';
import ClickerEmpire from './components/Dash';
import AuthComponent from './components/AuthComponent';
import ScoreDebugger from './components/ScoreDebugger';

export default function Home() {
  const [playerAddress, setPlayerAddress] = useState<string>("");

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
      <AuthComponent onAddressChange={setPlayerAddress} />
      {playerAddress ? (
        <>
          <ClickerEmpire playerAddress={playerAddress} />
          <ScoreDebugger playerAddress={playerAddress} />
        </>
      ) : (
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4 neon-text text-purple-500">
            CLICKER EMPIRE 
          </h1>
          <p className="text-cyan-300 text-lg mb-8">
            Log in with your Monad Games ID and start the game!
          </p>
          <div className="text-cyan-300 text-sm space-y-2">
            <p>🎮 Click idle game
            
          </div>
        </div>
      )}
      
      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
        }
      `}</style>
    </div>
  );
}