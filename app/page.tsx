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
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
              🏭 CLICKER EMPIRE 🏭
            </h1>
            <p className="text-cyan-300 text-xl mb-8">
              Build your empire from nothing! Click, upgrade, and dominate!
            </p>
            <p className="text-gray-300 text-lg mb-8">
              Log in with your Monad Games ID to start your journey to becoming a billionaire!
            </p>
          </div>

          {/* How to Play Section */}
          <div className="bg-black bg-opacity-50 rounded-lg border border-purple-500 p-8 mb-8">
            <h2 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎮 HOW TO PLAY
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Click Tab */}
              <div className="bg-gradient-to-br from-yellow-900 to-orange-900 p-6 rounded-lg border border-yellow-500">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                  👆 CLICK TAB
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Click the big coin to earn money</li>
                  <li>• Each click gives you coins</li>
                  <li>• Buy auto-workers for passive income</li>
                  <li>• Upgrade your click power</li>
                  <li>• Watch your empire grow!</li>
                </ul>
              </div>

              {/* Shop Tab */}
              <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-lg border border-blue-500">
                <h3 className="text-2xl font-bold text-blue-400 mb-4 flex items-center">
                  🏪 SHOP TAB
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Buy auto-clickers (cursors, grandmas)</li>
                  <li>• Purchase farms, mines, factories</li>
                  <li>• Unlock banks and temples</li>
                  <li>• Get wizard towers for magic power</li>
                  <li>• Each worker earns coins per second</li>
                </ul>
              </div>

              {/* Boosters Tab */}
              <div className="bg-gradient-to-br from-green-900 to-emerald-900 p-6 rounded-lg border border-green-500">
                <h3 className="text-2xl font-bold text-green-400 mb-4 flex items-center">
                  ⚡ BOOSTERS TAB
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Activate temporary power-ups</li>
                  <li>• Click Frenzy: 5x click power</li>
                  <li>• Auto Boost: 3x auto income</li>
                  <li>• Mega Boost: 10x everything!</li>
                  <li>• Stack multiple boosters</li>
                </ul>
              </div>

              {/* Lucky Tab */}
              <div className="bg-gradient-to-br from-purple-900 to-pink-900 p-6 rounded-lg border border-purple-500">
                <h3 className="text-2xl font-bold text-purple-400 mb-4 flex items-center">
                  🍀 LUCKY TAB
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• 🎰 Slots: Spin for big wins</li>
                  <li>• ✈️ Aviator: Cash out before crash</li>
                  <li>• 💣 Minesweeper: Find safe tiles</li>
                  <li>• 🪙 Coin Flip: 50/50 chance to double</li>
                  <li>• Bet 5 to 50,000 coins!</li>
                </ul>
              </div>

              {/* Story Tab */}
              <div className="bg-gradient-to-br from-indigo-900 to-violet-900 p-6 rounded-lg border border-indigo-500">
                <h3 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center">
                  📖 STORY TAB
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Follow your empire&apos;s journey</li>
                  <li>• Unlock new chapters</li>
                  <li>• Beautiful dynamic backgrounds</li>
                  <li>• From humble start to cosmic power</li>
                  <li>• 10 epic chapters to discover</li>
                </ul>
              </div>

              {/* Prestige System */}
              <div className="bg-gradient-to-br from-red-900 to-rose-900 p-6 rounded-lg border border-red-500">
                <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center">
                  ⭐ PRESTIGE SYSTEM
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Reset at 1M coins for prestige</li>
                  <li>• Gain permanent bonuses</li>
                  <li>• Unlock new story chapters</li>
                  <li>• Become even more powerful</li>
                  <li>• Strategic restart for growth</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Game Features */}
          <div className="bg-black bg-opacity-50 rounded-lg border border-cyan-500 p-8 mb-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-cyan-400">
              🌟 GAME FEATURES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Blockchain Integration</h4>
                    <p className="text-gray-400 text-sm">Save your progress to the blockchain leaderboard</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">💾</span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Auto-Save</h4>
                    <p className="text-gray-400 text-sm">Your progress is automatically saved locally</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Beautiful Design</h4>
                    <p className="text-gray-400 text-sm">Modern UI with animations and effects</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Strategic Gameplay</h4>
                    <p className="text-gray-400 text-sm">Plan your upgrades and prestige timing</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🎪</span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Multiple Game Modes</h4>
                    <p className="text-gray-400 text-sm">Clicking, idle income, and gambling games</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h4 className="text-lg font-bold text-white">Competitive</h4>
                    <p className="text-gray-400 text-sm">Compete on the global leaderboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border border-yellow-500 p-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-yellow-400">
              💡 PRO TIPS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="text-gray-300">
                <p>• <strong className="text-yellow-400">Start by clicking:</strong> Build up initial coins manually</p>
                <p>• <strong className="text-yellow-400">Buy cursors first:</strong> Cheapest auto-income source</p>
                <p>• <strong className="text-yellow-400">Use boosters wisely:</strong> Activate during high income periods</p>
              </div>
              <div className="text-gray-300">
                <p>• <strong className="text-yellow-400">Gambling strategy:</strong> Start with small bets to learn</p>
                <p>• <strong className="text-yellow-400">Prestige timing:</strong> Wait until you have good income</p>
                <p>• <strong className="text-yellow-400">Story progression:</strong> Unlocks with total coins earned</p>
              </div>
            </div>
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