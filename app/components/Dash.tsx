"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { submitPlayerScore } from '../lib/score-api';

interface DashProps {
  playerAddress?: string;
}

interface AutoClicker {
  id: string;
  name: string;
  icon: string;
  basePrice: number;
  currentPrice: number;
  income: number;
  owned: number;
  multiplier: number;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  multiplier: number;
  purchased: boolean;
  category: 'click' | 'auto' | 'special';
}

interface Booster {
  id: string;
  name: string;
  icon: string;
  duration: number;
  multiplier: number;
  price: number;
  active: boolean;
  timeLeft: number;
}

interface SlotResult {
  symbols: string[];
  multiplier: number;
  winAmount: number;
}

interface GameState {
  coins: number;
  clickPower: number;
  totalClicks: number;
  totalCoins: number;
  level: number;
  prestige: number;
  prestigePoints: number;
  autoClickers: AutoClicker[];
  upgrades: Upgrade[];
  boosters: Booster[];
  activeBoosters: Booster[];
  story: {
    chapter: number;
    unlockedChapters: number[];
  };
  slots: {
    totalSpins: number;
    totalWon: number;
    totalLost: number;
    biggestWin: number;
  };
}

export default function Dash({ playerAddress }: DashProps) {
  const [gameState, setGameState] = useState<GameState>({
    coins: 0,
    clickPower: 1,
    totalClicks: 0,
    totalCoins: 0,
    level: 1,
    prestige: 0,
    prestigePoints: 0,
    autoClickers: [
      { id: 'cursor', name: 'Cursors', icon: '👆', basePrice: 15, currentPrice: 15, income: 0.1, owned: 0, multiplier: 1 },
      { id: 'grandma', name: 'Grandmas', icon: '👵', basePrice: 100, currentPrice: 100, income: 1, owned: 0, multiplier: 1 },
      { id: 'farm', name: 'Farms', icon: '🏭', basePrice: 1100, currentPrice: 1100, income: 8, owned: 0, multiplier: 1 },
      { id: 'mine', name: 'Mines', icon: '⛏️', basePrice: 12000, currentPrice: 12000, income: 47, owned: 0, multiplier: 1 },
      { id: 'factory', name: 'Factories', icon: '🏭', basePrice: 130000, currentPrice: 130000, income: 260, owned: 0, multiplier: 1 },
      { id: 'bank', name: 'Banks', icon: '🏦', basePrice: 1400000, currentPrice: 1400000, income: 1400, owned: 0, multiplier: 1 },
      { id: 'temple', name: 'Temples', icon: '🏛️', basePrice: 20000000, currentPrice: 20000000, income: 7800, owned: 0, multiplier: 1 },
      { id: 'wizard', name: 'Wizard Towers', icon: '🧙', basePrice: 330000000, currentPrice: 330000000, income: 44000, owned: 0, multiplier: 1 }
    ],
    upgrades: [],
    boosters: [
      { id: 'click2x', name: 'Click Frenzy', icon: '⚡', duration: 30, multiplier: 2, price: 100, active: false, timeLeft: 0 },
      { id: 'auto2x', name: 'Auto Boost', icon: '🚀', duration: 60, multiplier: 2, price: 500, active: false, timeLeft: 0 },
      { id: 'mega5x', name: 'Mega Boost', icon: '💥', duration: 15, multiplier: 5, price: 2000, active: false, timeLeft: 0 }
    ],
    activeBoosters: [],
    story: {
      chapter: 1,
      unlockedChapters: [1]
    },
    slots: {
      totalSpins: 0,
      totalWon: 0,
      totalLost: 0,
      biggestWin: 0
    }
  });
  const [highScore, setHighScore] = useState(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'main' | 'shop' | 'upgrades' | 'story' | 'lucky'>('main');
  const [clickAnimations, setClickAnimations] = useState<{id: number, x: number, y: number, amount: number}[]>([]);
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedBet, setSelectedBet] = useState(5);
  const [currentGambleGame, setCurrentGambleGame] = useState<'slots' | 'aviator' | 'minesweeper' | 'coinflip'>('slots');
  const [aviatorMultiplier, setAviatorMultiplier] = useState(1.0);
  const [aviatorFlying, setAviatorFlying] = useState(false);
  const [minesweeperGrid, setMinesweeperGrid] = useState<{revealed: boolean, isMine: boolean}[]>([]);
  const [coinflipResult, setCoinflipResult] = useState<'heads' | 'tails' | null>(null);
  const [coinflipFlipping, setCoinflipFlipping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number>(0);

  // Load saved game state
  useEffect(() => {
    const savedGameState = localStorage.getItem('clickerGameState');
    const savedHighScore = localStorage.getItem('gameHighScore');
    
    if (savedGameState) {
      try {
        const parsedState = JSON.parse(savedGameState);
        // Ensure slots property exists for backward compatibility
        if (!parsedState.slots) {
          parsedState.slots = {
            totalSpins: 0,
            totalWon: 0,
            totalLost: 0,
            biggestWin: 0
          };
        }
        setGameState(parsedState);
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    }
    
    if (savedHighScore) {
      const parsedHighScore = parseInt(savedHighScore, 10);
      setHighScore(parsedHighScore);
    }
  }, []);

  // Save game state to localStorage
  useEffect(() => {
    localStorage.setItem('clickerGameState', JSON.stringify(gameState));
  }, [gameState]);

  // Auto income and booster timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setGameState(prevState => {
        const newState = { ...prevState };
        
        // Calculate auto income
        const autoIncome = prevState.autoClickers.reduce((total, clicker) => {
          return total + (clicker.income * clicker.owned * clicker.multiplier);
        }, 0);
        
        // Apply booster multipliers to auto income
        const boostedAutoIncome = prevState.activeBoosters.reduce((income, booster) => {
          return booster.id.includes('auto') ? income * booster.multiplier : income;
        }, autoIncome);
        
        newState.coins += boostedAutoIncome;
        newState.totalCoins += boostedAutoIncome;
        
        // Update booster timers
        newState.activeBoosters = prevState.activeBoosters.map(booster => ({
          ...booster,
          timeLeft: Math.max(0, booster.timeLeft - 1)
        })).filter(booster => booster.timeLeft > 0);
        
        // Update level based on total coins
        newState.level = Math.floor(newState.totalCoins / 1000) + 1;
        
        return newState;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Click animation cleanup
  useEffect(() => {
    const cleanup = () => {
      setClickAnimations(prev => prev.filter(anim => Date.now() - anim.id < 1000));
    };
    
    const interval = setInterval(cleanup, 100);
    return () => clearInterval(interval);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    let clickValue = gameState.clickPower;
    
    // Apply click boosters
    gameState.activeBoosters.forEach(booster => {
      if (booster.id.includes('click')) {
        clickValue *= booster.multiplier;
      }
    });
    
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + clickValue,
      totalClicks: prev.totalClicks + 1,
      totalCoins: prev.totalCoins + clickValue
    }));
    
    // Add click animation
    setClickAnimations(prev => [...prev, {
      id: Date.now(),
      x,
      y,
      amount: clickValue
    }]);
  }, [gameState.clickPower, gameState.activeBoosters]);

  const buyAutoClicker = useCallback((clickerId: string) => {
    setGameState(prev => {
      const clicker = prev.autoClickers.find(c => c.id === clickerId);
      if (!clicker || prev.coins < clicker.currentPrice) return prev;
      
      const newAutoClickers = prev.autoClickers.map(c => {
        if (c.id === clickerId) {
          return {
            ...c,
            owned: c.owned + 1,
            currentPrice: Math.floor(c.basePrice * Math.pow(1.15, c.owned + 1))
          };
        }
        return c;
      });
      
      return {
        ...prev,
        coins: prev.coins - clicker.currentPrice,
        autoClickers: newAutoClickers
      };
    });
  }, []);

  const buyBooster = useCallback((boosterId: string) => {
    setGameState(prev => {
      const booster = prev.boosters.find(b => b.id === boosterId);
      if (!booster || prev.coins < booster.price) return prev;
      
      const newBooster = {
        ...booster,
        active: true,
        timeLeft: booster.duration
      };
      
      return {
        ...prev,
        coins: prev.coins - booster.price,
        activeBoosters: [...prev.activeBoosters.filter(b => b.id !== boosterId), newBooster]
      };
    });
  }, []);

  const prestige = useCallback(() => {
    if (gameState.totalCoins < 1000000) return;
    
    const prestigePointsGained = Math.floor(gameState.totalCoins / 1000000);
    
    setGameState({
      coins: 0,
      clickPower: 1 + (gameState.prestige * 0.1),
      totalClicks: 0,
      totalCoins: 0,
      level: 1,
      prestige: gameState.prestige + 1,
      prestigePoints: gameState.prestigePoints + prestigePointsGained,
      autoClickers: gameState.autoClickers.map(clicker => ({
        ...clicker,
        owned: 0,
        currentPrice: clicker.basePrice,
        multiplier: 1 + (gameState.prestige * 0.05)
      })),
      upgrades: [],
      boosters: gameState.boosters,
      activeBoosters: [],
      story: {
        chapter: Math.min(gameState.story.chapter + 1, 10),
        unlockedChapters: [...gameState.story.unlockedChapters, Math.min(gameState.story.chapter + 1, 10)]
      },
      slots: gameState.slots || { // Preserve slots statistics through prestige with fallback
        totalSpins: 0,
        totalWon: 0,
        totalLost: 0,
        biggestWin: 0
      }
    });
  }, [gameState]);

  const saveScore = useCallback(() => {
    if (playerAddress && gameState.totalCoins > 0) {
      setIsSavingScore(true);
      submitPlayerScore(playerAddress, Math.floor(gameState.totalCoins))
        .then(() => {
          setSaveMessage('Progress saved to blockchain!');
          if (gameState.totalCoins > highScore) {
            setHighScore(Math.floor(gameState.totalCoins));
            localStorage.setItem('gameHighScore', Math.floor(gameState.totalCoins).toString());
          }
        })
        .catch((error) => {
          console.error('Error saving score:', error);
          setSaveMessage('Error saving progress.');
        })
        .finally(() => {
          setIsSavingScore(false);
          setTimeout(() => setSaveMessage(''), 3000);
        });
    }
  }, [playerAddress, gameState.totalCoins, highScore]);

  const playSlots = useCallback((betAmount: number) => {
    if (gameState.coins < betAmount || isSpinning) return;
    
    setIsSpinning(true);
    
    // Deduct bet amount immediately
    setGameState(prev => ({
      ...prev,
      coins: prev.coins - betAmount,
      slots: {
        ...prev.slots,
        totalSpins: prev.slots.totalSpins + 1
      }
    }));
    
    // Simulate spinning animation delay
    setTimeout(() => {
      const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
      const reels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];
      
      let multiplier = 0;
      let winAmount = 0;
      
      // Determine win conditions and multipliers
      if (reels[0] === reels[1] && reels[1] === reels[2]) {
        // Three of a kind
        switch (reels[0]) {
          case '💎': multiplier = 100; break;  // Jackpot!
          case '7️⃣': multiplier = 50; break;
          case '⭐': multiplier = 25; break;
          case '🔔': multiplier = 15; break;
          case '🍇': multiplier = 10; break;
          case '🍊': multiplier = 8; break;
          case '🍋': multiplier = 6; break;
          case '🍒': multiplier = 4; break;
        }
      } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        // Two of a kind
        multiplier = 1;
      } else if (reels.includes('🍒')) {
        // Cherry bonus (any cherry)
        multiplier = 0.5;
      }
      
      winAmount = Math.floor(betAmount * multiplier);
      
      const result: SlotResult = {
        symbols: reels,
        multiplier,
        winAmount
      };
      
      setSlotResult(result);
      
      // Update game state with results
      setGameState(prev => {
        const newCoins = prev.coins + winAmount;
        const totalWon = winAmount > betAmount ? prev.slots.totalWon + (winAmount - betAmount) : prev.slots.totalWon;
        const totalLost = winAmount === 0 ? prev.slots.totalLost + betAmount : prev.slots.totalLost;
        const biggestWin = winAmount > prev.slots.biggestWin ? winAmount : prev.slots.biggestWin;
        
        return {
          ...prev,
          coins: newCoins,
          totalCoins: Math.max(prev.totalCoins, newCoins),
          slots: {
            ...prev.slots,
            totalWon,
            totalLost,
            biggestWin
          }
        };
      });
      
      setIsSpinning(false);
    }, 2000); // 2 second spinning animation
  }, [gameState.coins, isSpinning]);

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return Math.floor(num).toString();
  };

  const getStoryContent = (chapter: number): { title: string; content: string; background: string } => {
    const stories = [
      { title: "The Beginning", content: "You start with nothing but determination. Every click brings you closer to building your empire.", background: "from-blue-900 to-purple-900" },
      { title: "First Steps", content: "Your first helpers join you. Together, you'll achieve great things.", background: "from-purple-900 to-pink-900" },
      { title: "Growing Empire", content: "Your influence spreads. Farms and mines fuel your expansion.", background: "from-green-900 to-blue-900" },
      { title: "Industrial Age", content: "Factories roar to life. Your empire enters the modern era.", background: "from-orange-900 to-red-900" },
      { title: "Financial Power", content: "Banks serve your needs. Money flows like rivers.", background: "from-yellow-900 to-orange-900" },
      { title: "Mystical Realm", content: "Ancient temples unlock mystical powers beyond comprehension.", background: "from-indigo-900 to-purple-900" },
      { title: "Arcane Mastery", content: "Wizard towers channel magical energies to multiply your wealth.", background: "from-violet-900 to-pink-900" },
      { title: "Cosmic Influence", content: "Your empire transcends earthly bounds, reaching into the cosmos.", background: "from-cyan-900 to-blue-900" },
      { title: "Dimensional Conquest", content: "Multiple dimensions bend to your will. Reality itself serves you.", background: "from-emerald-900 to-teal-900" },
      { title: "Ultimate Ascension", content: "You have become one with the universe. Your power knows no limits.", background: "from-rose-900 to-pink-900" }
    ];
    return stories[chapter - 1] || stories[0];
  };

  const currentStory = getStoryContent(gameState.story.chapter);
  const autoIncome = gameState.autoClickers.reduce((total, clicker) => {
    return total + (clicker.income * clicker.owned * clicker.multiplier);
  }, 0);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentStory.background} transition-all duration-1000`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-pulse">
            🏭 CLICKER EMPIRE 🏭
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black bg-opacity-50 p-4 rounded-lg border border-yellow-500">
              <div className="text-yellow-400 text-sm">Coins</div>
              <div className="text-2xl font-bold text-white">{formatNumber(gameState.coins)}</div>
            </div>
            <div className="bg-black bg-opacity-50 p-4 rounded-lg border border-green-500">
              <div className="text-green-400 text-sm">Per Second</div>
              <div className="text-2xl font-bold text-white">{formatNumber(autoIncome)}</div>
            </div>
            <div className="bg-black bg-opacity-50 p-4 rounded-lg border border-blue-500">
              <div className="text-blue-400 text-sm">Level</div>
              <div className="text-2xl font-bold text-white">{gameState.level}</div>
            </div>
            <div className="bg-black bg-opacity-50 p-4 rounded-lg border border-purple-500">
              <div className="text-purple-400 text-sm">Prestige</div>
              <div className="text-2xl font-bold text-white">{gameState.prestige}</div>
            </div>
          </div>
        </div>

        {/* Active Boosters */}
        {gameState.activeBoosters.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {gameState.activeBoosters.map(booster => (
                <div key={booster.id} className="bg-orange-500 bg-opacity-80 px-4 py-2 rounded-full text-white font-bold animate-bounce">
                  {booster.icon} {booster.name} ({booster.timeLeft}s)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-black bg-opacity-50 p-2 rounded-lg flex gap-2">
            {(['main', 'shop', 'upgrades', 'lucky', 'story'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  currentTab === tab
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {tab === 'main' && '👆 Click'}
                {tab === 'shop' && '🏪 Shop'}
                {tab === 'upgrades' && '⚡ Boosters'}
                {tab === 'lucky' && '🍀 Lucky'}
                {tab === 'story' && '📖 Story'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Game Tab */}
        {currentTab === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Clicking Area */}
            <div className="text-center">
              <div className="relative">
                <button
                  onClick={handleClick}
                  className="w-80 h-80 mx-auto bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-150 text-6xl font-bold text-white border-8 border-white animate-pulse"
                >
                  💰
                </button>
                {/* Click Animations */}
                {clickAnimations.map(anim => (
                  <div
                    key={anim.id}
                    className="absolute pointer-events-none text-yellow-400 font-bold text-2xl animate-bounce"
                    style={{
                      left: anim.x,
                      top: anim.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    +{formatNumber(anim.amount)}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-white text-xl">
                Click Power: <span className="text-yellow-400 font-bold">{formatNumber(gameState.clickPower)}</span>
              </div>
              <div className="mt-2 text-gray-300">
                Total Clicks: {formatNumber(gameState.totalClicks)}
              </div>
            </div>

            {/* Auto Clickers */}
            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-blue-500">
              <h2 className="text-3xl font-bold text-blue-400 mb-6 text-center">🤖 Auto Workers</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {gameState.autoClickers.map(clicker => (
                  <div key={clicker.id} className="bg-gray-800 bg-opacity-80 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{clicker.icon}</span>
                        <div>
                          <div className="text-white font-bold">{clicker.name}</div>
                          <div className="text-gray-400 text-sm">
                            Owned: {clicker.owned} | Income: {formatNumber(clicker.income * clicker.multiplier)}/s each
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => buyAutoClicker(clicker.id)}
                        disabled={gameState.coins < clicker.currentPrice}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-4 py-2 rounded font-bold text-white transition-colors"
                      >
                        {formatNumber(clicker.currentPrice)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {currentTab === 'shop' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-green-500">
              <h2 className="text-3xl font-bold text-green-400 mb-6 text-center">🏪 Auto Clicker Shop</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {gameState.autoClickers.map(clicker => {
                  const canAfford = gameState.coins >= clicker.currentPrice;
                  const totalIncome = clicker.income * clicker.multiplier * clicker.owned;
                  
                  return (
                    <div key={clicker.id} className={`p-4 rounded-lg border-2 transition-all ${
                      canAfford ? 'border-green-500 bg-gray-800' : 'border-gray-600 bg-gray-900'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{clicker.icon}</span>
                          <div>
                            <div className="text-white font-bold text-lg">{clicker.name}</div>
                            <div className="text-gray-400 text-sm">
                              Income: {formatNumber(clicker.income * clicker.multiplier)}/s each
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold">{formatNumber(clicker.currentPrice)}</div>
                          <div className="text-green-400 text-sm">Owned: {clicker.owned}</div>
                        </div>
                      </div>
                      {clicker.owned > 0 && (
                        <div className="text-blue-400 text-sm mb-2">
                          Total Income: {formatNumber(totalIncome)}/s
                        </div>
                      )}
                      <button
                        onClick={() => buyAutoClicker(clicker.id)}
                        disabled={!canAfford}
                        className={`w-full py-2 px-4 rounded font-bold transition-all ${
                          canAfford 
                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? '💰 Buy' : '❌ Too Expensive'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-purple-500">
              <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center">🎆 Special Items</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-yellow-500 bg-gray-800">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎆</div>
                    <div className="text-yellow-400 font-bold text-lg">Golden Touch</div>
                    <div className="text-gray-300 text-sm mb-3">Permanently increase click power by 50%</div>
                    <div className="text-yellow-400 mb-3">Cost: {formatNumber(1000000)}</div>
                    <button 
                      disabled={gameState.coins < 1000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-red-500 bg-gray-800">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔥</div>
                    <div className="text-red-400 font-bold text-lg">Legendary Multiplier</div>
                    <div className="text-gray-300 text-sm mb-3">All auto clickers 2x more efficient</div>
                    <div className="text-red-400 mb-3">Cost: {formatNumber(10000000)}</div>
                    <button 
                      disabled={gameState.coins < 10000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boosters Tab */}
        {currentTab === 'upgrades' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-orange-500">
              <h2 className="text-3xl font-bold text-orange-400 mb-6 text-center">⚡ Power Boosters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {gameState.boosters.map(booster => {
                  const canAfford = gameState.coins >= booster.price;
                  const isActive = gameState.activeBoosters.some(b => b.id === booster.id);
                  
                  return (
                    <div key={booster.id} className={`p-6 rounded-lg border-2 text-center transition-all ${
                      isActive ? 'border-orange-500 bg-orange-900 bg-opacity-50' :
                      canAfford ? 'border-green-500 bg-gray-800' : 'border-gray-600 bg-gray-900'
                    }`}>
                      <div className="text-5xl mb-3">{booster.icon}</div>
                      <div className="text-white font-bold text-xl mb-2">{booster.name}</div>
                      <div className="text-gray-300 text-sm mb-3">
                        {booster.multiplier}x multiplier for {booster.duration} seconds
                      </div>
                      <div className="text-yellow-400 mb-4 font-bold">
                        Cost: {formatNumber(booster.price)}
                      </div>
                      {isActive ? (
                        <div className="bg-orange-500 px-4 py-2 rounded font-bold text-white">
                          ⏱️ Active ({gameState.activeBoosters.find(b => b.id === booster.id)?.timeLeft}s)
                        </div>
                      ) : (
                        <button
                          onClick={() => buyBooster(booster.id)}
                          disabled={!canAfford}
                          className={`w-full py-2 px-4 rounded font-bold transition-all ${
                            canAfford 
                              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? '🚀 Activate' : '❌ Too Expensive'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Lucky Tab */}
        {currentTab === 'lucky' && (
          <div className="max-w-6xl mx-auto">
            {/* Game Selection */}
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-yellow-400 mb-6">🍀 LUCKY GAMES 🍀</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <button
                  onClick={() => setCurrentGambleGame('slots')}
                  className={`p-4 rounded-lg font-bold transition-all ${
                    currentGambleGame === 'slots'
                      ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                      : 'bg-gray-700 text-white hover:bg-gray-600 border-2 border-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">🎰</div>
                  <div>Slots</div>
                </button>
                <button
                  onClick={() => setCurrentGambleGame('aviator')}
                  className={`p-4 rounded-lg font-bold transition-all ${
                    currentGambleGame === 'aviator'
                      ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                      : 'bg-gray-700 text-white hover:bg-gray-600 border-2 border-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">✈️</div>
                  <div>Aviator</div>
                </button>
                <button
                  onClick={() => setCurrentGambleGame('minesweeper')}
                  className={`p-4 rounded-lg font-bold transition-all ${
                    currentGambleGame === 'minesweeper'
                      ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                      : 'bg-gray-700 text-white hover:bg-gray-600 border-2 border-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">💣</div>
                  <div>Minesweeper</div>
                </button>
                <button
                  onClick={() => setCurrentGambleGame('coinflip')}
                  className={`p-4 rounded-lg font-bold transition-all ${
                    currentGambleGame === 'coinflip'
                      ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                      : 'bg-gray-700 text-white hover:bg-gray-600 border-2 border-gray-600'
                  }`}
                >
                  <div className="text-3xl mb-2">🪙</div>
                  <div>Coin Flip</div>
                </button>
              </div>
            </div>

            {/* Slots Game */}
            {currentGambleGame === 'slots' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Slot Machine */}
                <div className="lg:col-span-2 bg-black bg-opacity-60 p-8 rounded-lg border border-yellow-500">
                  <h2 className="text-4xl font-bold text-yellow-400 mb-6 text-center">🎰 LUCKY SLOTS 🎰</h2>
                  
                  {/* Slot Display */}
                  <div className="bg-gray-900 p-8 rounded-lg mb-6 border-4 border-yellow-600">
                    <div className="flex justify-center items-center gap-4 mb-6">
                      {isSpinning ? (
                        // Spinning animation
                        <>
                          <div className="w-24 h-24 bg-gray-800 rounded-lg border-4 border-yellow-500 flex items-center justify-center animate-spin">
                            <span className="text-4xl">🎲</span>
                          </div>
                          <div className="w-24 h-24 bg-gray-800 rounded-lg border-4 border-yellow-500 flex items-center justify-center animate-spin" style={{animationDelay: '0.1s'}}>
                            <span className="text-4xl">🎲</span>
                          </div>
                          <div className="w-24 h-24 bg-gray-800 rounded-lg border-4 border-yellow-500 flex items-center justify-center animate-spin" style={{animationDelay: '0.2s'}}>
                            <span className="text-4xl">🎲</span>
                          </div>
                        </>
                      ) : (
                        // Result display
                        <>
                          <div className="w-24 h-24 bg-gray-800 rounded-lg border-4 border-yellow-500 flex items-center justify-center">
                            <span className="text-4xl">{slotResult?.symbols[0] || '🍒'}</span>
                          </div>
                          <div className="w-24 h-24 bg-gray-800 rounded-lg border-4 border-yellow-500 flex items-center justify-center">
                            <span className="text-4xl">{slotResult?.symbols[1] || '🍋'}</span>
                          </div>
                          <div className="w-24 h-24 bg-gray-800 rounded-lg border-4 border-yellow-500 flex items-center justify-center">
                            <span className="text-4xl">{slotResult?.symbols[2] || '🍊'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  
                  {/* Result Message */}
                  {slotResult && !isSpinning && (
                    <div className="text-center mb-4">
                      {slotResult.winAmount > 0 ? (
                        <div className="text-green-400 text-xl font-bold animate-pulse">
                          🎉 YOU WON {formatNumber(slotResult.winAmount)} COINS! 🎉
                          {slotResult.multiplier > 10 && <div className="text-yellow-400 text-lg">MEGA WIN! {slotResult.multiplier}x MULTIPLIER!</div>}
                        </div>
                      ) : (
                        <div className="text-red-400 text-xl font-bold">
                          😔 Better luck next time!
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Bet Selection */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">Select Your Bet</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {[5, 50, 500, 5000, 50000].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        disabled={gameState.coins < bet}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet
                            ? 'bg-yellow-500 text-black border-2 border-yellow-300'
                            : gameState.coins >= bet
                            ? 'bg-gray-700 text-white hover:bg-gray-600 border-2 border-gray-600'
                            : 'bg-gray-800 text-gray-500 border-2 border-gray-700 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-sm">{formatNumber(bet)}</div>
                        <div className="text-xs opacity-75">coins</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Spin Button */}
                <div className="text-center">
                  <button
                    onClick={() => playSlots(selectedBet)}
                    disabled={gameState.coins < selectedBet || isSpinning}
                    className={`w-full py-4 px-8 rounded-lg font-bold text-xl transition-all ${
                      gameState.coins >= selectedBet && !isSpinning
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSpinning ? 'SPINNING...' : gameState.coins >= selectedBet ? `SPIN (${formatNumber(selectedBet)} coins)` : 'INSUFFICIENT COINS'}
                  </button>
                </div>
                </div>
                
                {/* Slots Right Sidebar */}
                <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-yellow-500">
                  <h4 className="text-xl font-bold text-yellow-400 mb-4">Payouts</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <div className="flex justify-between">
                      <span>🍒🍒🍒 (Triple Cherry)</span>
                      <span className="text-green-400">100x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🍋🍋🍋 (Triple Lemon)</span>
                      <span className="text-green-400">50x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🍊🍊🍊 (Triple Orange)</span>
                      <span className="text-green-400">25x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🍇🍇🍇 (Triple Grape)</span>
                      <span className="text-green-400">15x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🍒🍒X (Cherry Bonus)</span>
                      <span className="text-yellow-400">0.5x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Any Pair</span>
                      <span className="text-blue-400">1x</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aviator Game */}
            {currentGambleGame === 'aviator' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-black bg-opacity-60 p-8 rounded-lg border border-blue-500">
                  <h3 className="text-3xl font-bold text-blue-400 mb-6 text-center">✈️ AVIATOR</h3>
                  <div className="bg-gradient-to-b from-blue-900 to-blue-600 p-8 rounded-lg mb-6 border-4 border-blue-400 relative overflow-hidden">
                    <div className="text-center">
                      <div className="text-6xl mb-4">✈️</div>
                      <div className="text-4xl font-bold text-white mb-4">{aviatorMultiplier.toFixed(2)}x</div>
                      {aviatorFlying ? (
                        <div className="text-green-400 text-xl">Flying... Cash out now!</div>
                      ) : (
                        <div className="text-gray-300">Waiting for next flight...</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {[5, 50, 500, 5000, 50000].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        disabled={gameState.coins < bet}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        {formatNumber(bet)}
                      </button>
                    ))}
                  </div>
                  <button className="w-full py-4 px-8 rounded-lg font-bold text-xl bg-blue-500 hover:bg-blue-600 text-white">
                    ✈️ Start Flight ({formatNumber(selectedBet)} coins)
                  </button>
                </div>
                <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-blue-400">
                  <h4 className="text-xl font-bold text-blue-400 mb-4">How to Play</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>• Place your bet before the plane takes off</p>
                    <p>• The multiplier increases as the plane flies</p>
                    <p>• Cash out before the plane crashes</p>
                    <p>• The longer you wait, the higher the risk!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Minesweeper Game */}
            {currentGambleGame === 'minesweeper' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-black bg-opacity-60 p-8 rounded-lg border border-red-500">
                  <h3 className="text-3xl font-bold text-red-400 mb-6 text-center">💣 MINESWEEPER</h3>
                  <div className="bg-gray-900 p-6 rounded-lg mb-6 border-4 border-red-400">
                    <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
                      {Array.from({length: 25}, (_, i) => (
                        <button
                          key={i}
                          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded border-2 border-gray-500 text-white font-bold"
                        >
                          ?
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {[5, 50, 500, 5000, 50000].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        {formatNumber(bet)}
                      </button>
                    ))}
                  </div>
                  <button className="w-full py-4 px-8 rounded-lg font-bold text-xl bg-red-500 hover:bg-red-600 text-white">
                    💣 Start Game ({formatNumber(selectedBet)} coins)
                  </button>
                </div>
                <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-red-400">
                  <h4 className="text-xl font-bold text-red-400 mb-4">How to Play</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>• Choose your bet amount</p>
                    <p>• Click tiles to reveal them</p>
                    <p>• Avoid the mines (💣)</p>
                    <p>• Each safe tile multiplies your bet</p>
                    <p>• Cash out anytime or risk it all!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Coin Flip Game */}
            {currentGambleGame === 'coinflip' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-black bg-opacity-60 p-8 rounded-lg border border-yellow-500">
                  <h3 className="text-3xl font-bold text-yellow-400 mb-6 text-center">🪙 COIN FLIP</h3>
                  <div className="bg-gray-900 p-8 rounded-lg mb-6 border-4 border-yellow-400">
                    <div className="text-center">
                      <div className={`text-8xl mb-4 ${coinflipFlipping ? 'animate-spin' : ''}`}>
                        {coinflipFlipping ? '🪙' : coinflipResult === 'heads' ? '👑' : coinflipResult === 'tails' ? '🪙' : '🪙'}
                      </div>
                      {coinflipResult && !coinflipFlipping && (
                        <div className="text-2xl font-bold text-white">
                          {coinflipResult === 'heads' ? 'HEADS!' : 'TAILS!'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <button className="py-4 px-6 rounded-lg font-bold text-xl bg-blue-500 hover:bg-blue-600 text-white border-4 border-blue-400">
                      👑 Heads (2x)
                    </button>
                    <button className="py-4 px-6 rounded-lg font-bold text-xl bg-orange-500 hover:bg-orange-600 text-white border-4 border-orange-400">
                      🪙 Tails (2x)
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {[5, 50, 500, 5000, 50000].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        {formatNumber(bet)}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-white">
                    Selected Bet: <span className="font-bold text-yellow-400">{formatNumber(selectedBet)} coins</span>
                  </div>
                </div>
                <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-yellow-400">
                  <h4 className="text-xl font-bold text-yellow-400 mb-4">How to Play</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>• Choose Heads (👑) or Tails (🪙)</p>
                    <p>• Select your bet amount</p>
                    <p>• Win 2x your bet if you guess correctly</p>
                    <p>• 50/50 chance - pure luck!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Shared Statistics */}
            <div className="mt-8 bg-black bg-opacity-50 p-6 rounded-lg border border-green-500">
              <h3 className="text-2xl font-bold text-green-400 mb-4 text-center">📊 Gambling Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-white font-bold">{gameState.slots?.totalSpins || 0}</div>
                  <div className="text-gray-300 text-sm">Total Games</div>
                </div>
                <div>
                  <div className="text-green-400 font-bold">{formatNumber(gameState.slots?.totalWon || 0)}</div>
                  <div className="text-gray-300 text-sm">Total Won</div>
                </div>
                <div>
                  <div className="text-red-400 font-bold">{formatNumber(gameState.slots?.totalLost || 0)}</div>
                  <div className="text-gray-300 text-sm">Total Lost</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-bold">{formatNumber(gameState.slots?.biggestWin || 0)}</div>
                  <div className="text-gray-300 text-sm">Biggest Win</div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-6 bg-red-900 bg-opacity-50 p-4 rounded-lg border border-red-500">
              <p className="text-red-300 text-center text-sm">
                ⚠️ <strong>Gambling Warning:</strong> Play responsibly! All games are based on chance. Only gamble what you can afford to lose.
              </p>
            </div>
          </div>
        )}

        {/* Story Tab */}
        {currentTab === 'story' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-black bg-opacity-60 p-8 rounded-lg border border-indigo-500">
              <h2 className="text-4xl font-bold text-indigo-400 mb-6 text-center">📖 Empire Chronicles</h2>
              
              <div className="bg-gray-900 bg-opacity-80 p-6 rounded-lg mb-6 border border-indigo-400">
                <h3 className="text-2xl font-bold text-white mb-4">Chapter {gameState.story.chapter}: {currentStory.title}</h3>
                <p className="text-gray-300 text-lg leading-relaxed">{currentStory.content}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Array.from({length: 10}, (_, i) => i + 1).map(chapter => {
                  const isUnlocked = gameState.story.unlockedChapters.includes(chapter);
                  const isCurrent = gameState.story.chapter === chapter;
                  
                  return (
                    <div key={chapter} className={`p-3 rounded-lg text-center border-2 transition-all ${
                      isCurrent ? 'border-indigo-400 bg-indigo-900 bg-opacity-50' :
                      isUnlocked ? 'border-gray-500 bg-gray-800' : 'border-gray-700 bg-gray-900'
                    }`}>
                      <div className="text-2xl mb-1">
                        {isUnlocked ? '📜' : '🔒'}
                      </div>
                      <div className={`text-sm font-bold ${
                        isCurrent ? 'text-indigo-400' :
                        isUnlocked ? 'text-white' : 'text-gray-500'
                      }`}>
                        Ch. {chapter}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer with Prestige and Blockchain */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-red-500">
            <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">⭐ Prestige System</h3>
            <div className="text-center">
              <div className="text-gray-300 mb-4">
                Requirement: {formatNumber(1000000)} total coins
              </div>
              <div className="text-yellow-400 mb-4">
                Current Progress: {formatNumber(gameState.totalCoins)}
              </div>
              <button
                onClick={prestige}
                disabled={gameState.totalCoins < 1000000}
                className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg transition-all font-bold shadow-lg"
              >
                {gameState.totalCoins >= 1000000 ? '⭐ Ascend to Prestige' : '🔒 Not Ready'}
              </button>
            </div>
          </div>

          <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-yellow-500">
            <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">🔗 Blockchain Hall of Fame</h3>
            <div className="text-center">
              <div className="text-gray-300 mb-2">Your Best: {formatNumber(highScore)}</div>
              <div className="text-green-400 mb-4">Current Score: {formatNumber(gameState.totalCoins)}</div>
              <button
                onClick={saveScore}
                disabled={isSavingScore || gameState.totalCoins === 0}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg transition-all font-bold shadow-lg"
              >
                {isSavingScore ? '💾 Saving...' : '💾 Save to Leaderboard'}
              </button>
            </div>
          </div>
        </div>

        {saveMessage && (
          <div className={`mt-6 p-4 rounded-lg font-semibold text-center shadow-lg ${
            saveMessage.includes('blockchain') || saveMessage.includes('successfully') 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
}