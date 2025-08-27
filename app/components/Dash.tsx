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
      { id: 'mega5x', name: 'Mega Boost', icon: '💥', duration: 15, multiplier: 5, price: 2000, active: false, timeLeft: 0 },
      { id: 'tornado10x', name: 'Tornado Boost', icon: '🌪️', duration: 10, multiplier: 10, price: 10000, active: false, timeLeft: 0 },
      { id: 'cosmic25x', name: 'Cosmic Storm', icon: '🌌', duration: 20, multiplier: 25, price: 5000000, active: false, timeLeft: 0 },
      { id: 'godmode50x', name: 'God Mode', icon: '👑', duration: 30, multiplier: 50, price: 100000000, active: false, timeLeft: 0 }
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
  const [currentTab, setCurrentTab] = useState<'main' | 'shop' | 'story' | 'lucky'>('main');
  const [clickAnimations, setClickAnimations] = useState<{id: number, x: number, y: number, amount: number}[]>([]);
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedBet, setSelectedBet] = useState(5);
  const [currentGambleGame, setCurrentGambleGame] = useState<'slots' | 'aviator' | 'minesweeper' | 'coinflip'>('slots');
  
  // Aviator game state
  const [aviatorMultiplier, setAviatorMultiplier] = useState(1.0);
  const [aviatorFlying, setAviatorFlying] = useState(false);
  const [aviatorBet, setAviatorBet] = useState(0);
  const [aviatorGameActive, setAviatorGameActive] = useState(false);
  
  // Minesweeper game state
  const [minesweeperGrid, setMinesweeperGrid] = useState<{revealed: boolean, isMine: boolean, value: number}[]>([]);
  const [minesweeperGameActive, setMinesweeperGameActive] = useState(false);
  const [minesweeperBet, setMinesweeperBet] = useState(0);
  const [minesweeperMultiplier, setMinesweeperMultiplier] = useState(1.0);
  
  // Coin flip game state
  const [coinflipResult, setCoinflipResult] = useState<'heads' | 'tails' | null>(null);
  const [coinflipFlipping, setCoinflipFlipping] = useState(false);
  const [coinflipChoice, setCoinflipChoice] = useState<'heads' | 'tails' | null>(null);
  
  // Box opening game state
  const [boxOpeningState, setBoxOpeningState] = useState<{
    isOpening: boolean;
    spinningItems: {icon: string, name: string}[];
    lastReward: {icon: string, name: string, description: string, rarity: string} | null;
  }>({
    isOpening: false,
    spinningItems: [],
    lastReward: null
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const aviatorIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        
        // Ensure all boosters exist for backward compatibility
        const defaultBoosters = [
          { id: 'click2x', name: 'Click Frenzy', icon: '⚡', duration: 30, multiplier: 2, price: 100, active: false, timeLeft: 0 },
          { id: 'auto2x', name: 'Auto Boost', icon: '🚀', duration: 60, multiplier: 2, price: 500, active: false, timeLeft: 0 },
          { id: 'mega5x', name: 'Mega Boost', icon: '💥', duration: 15, multiplier: 5, price: 2000, active: false, timeLeft: 0 },
          { id: 'tornado10x', name: 'Tornado Boost', icon: '🌪️', duration: 10, multiplier: 10, price: 10000, active: false, timeLeft: 0 },
          { id: 'cosmic25x', name: 'Cosmic Storm', icon: '🌌', duration: 20, multiplier: 25, price: 5000000, active: false, timeLeft: 0 },
          { id: 'godmode50x', name: 'God Mode', icon: '👑', duration: 30, multiplier: 50, price: 100000000, active: false, timeLeft: 0 }
        ];
        
        // Merge existing boosters with new ones
        if (!parsedState.boosters || parsedState.boosters.length < 6) {
          const existingBoosterIds = parsedState.boosters ? parsedState.boosters.map((b: { id: string }) => b.id) : [];
          const newBoosters = defaultBoosters.filter(b => !existingBoosterIds.includes(b.id));
          parsedState.boosters = [...(parsedState.boosters || []), ...newBoosters];
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
      if (aviatorIntervalRef.current) {
        clearInterval(aviatorIntervalRef.current);
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

  const openBox = useCallback((cost: number) => {
    console.log('openBox called with cost:', cost, 'current coins:', gameState.coins, 'isOpening:', boxOpeningState.isOpening);
    
    if (gameState.coins < cost || boxOpeningState.isOpening) {
      console.log('Cannot open box - insufficient coins or already opening');
      return;
    }
    
    // Deduct cost
    setGameState(prev => ({
      ...prev,
      coins: prev.coins - cost
    }));
    
    // Define all possible rewards with their probabilities
    const rewards = [
      // Ultra Rare (0.01%)
      { icon: '👑', name: 'God Mode', description: '50x multiplier for 30 seconds', rarity: 'Ultra Rare', probability: 0.0001 },
      { icon: '👑', name: 'Royal Crown', description: 'Unlock exclusive royal theme', rarity: 'Ultra Rare', probability: 0.0001 },
      
      // Rare (1.09%)
      { icon: '💎', name: 'Diamond Prestige', description: 'Reduce prestige requirement by 50%', rarity: 'Rare', probability: 0.0109 },
      { icon: '🌟', name: 'Lucky Star', description: 'Double all gambling wins for 1 hour', rarity: 'Rare', probability: 0.0109 },
      { icon: '🌌', name: 'Cosmic Storm', description: '25x multiplier for 20 seconds', rarity: 'Rare', probability: 0.0109 },
      
      // Uncommon (3%)
      { icon: '🔥', name: 'Legendary Multiplier', description: 'All auto clickers 2x more efficient', rarity: 'Uncommon', probability: 0.03 },
      { icon: '🎆', name: 'Golden Touch', description: 'Permanently increase click power by 50%', rarity: 'Uncommon', probability: 0.03 },
      
      // Common (95.9%)
      { icon: '⚡', name: 'Click Frenzy', description: '2x multiplier for 30 seconds', rarity: 'Common', probability: 0.2398 },
      { icon: '🚀', name: 'Auto Boost', description: '2x multiplier for 60 seconds', rarity: 'Common', probability: 0.2398 },
      { icon: '💥', name: 'Mega Boost', description: '5x multiplier for 15 seconds', rarity: 'Common', probability: 0.2398 },
      { icon: '🌪️', name: 'Tornado Boost', description: '10x multiplier for 10 seconds', rarity: 'Common', probability: 0.2396 }
    ];
    
    // Create spinning items array (more items for CSGO-style animation)
    const spinningItems = [];
    for (let i = 0; i < 15; i++) {
      const randomItem = rewards[Math.floor(Math.random() * rewards.length)];
      spinningItems.push({ icon: randomItem.icon, name: randomItem.name });
    }
    
    // Start spinning
    setBoxOpeningState({
      isOpening: true,
      spinningItems,
      lastReward: null
    });
    
    // Determine final reward based on probability
    setTimeout(() => {
      const random = Math.random();
      let cumulativeProbability = 0;
      let selectedReward = rewards[rewards.length - 1]; // Default to last item
      
      for (const reward of rewards) {
        cumulativeProbability += reward.probability;
        if (random <= cumulativeProbability) {
          selectedReward = reward;
          break;
        }
      }
      
      setBoxOpeningState({
        isOpening: false,
        spinningItems: [],
        lastReward: selectedReward
      });
      
      // If it's a booster, add it to active boosters
      if (['Click Frenzy', 'Auto Boost', 'Mega Boost', 'Tornado Boost', 'Cosmic Storm', 'God Mode'].includes(selectedReward.name)) {
        const boosterMap: {[key: string]: string} = {
          'Click Frenzy': 'click2x',
          'Auto Boost': 'auto2x',
          'Mega Boost': 'mega5x',
          'Tornado Boost': 'tornado10x',
          'Cosmic Storm': 'cosmic25x',
          'God Mode': 'godmode50x'
        };
        
        const boosterId = boosterMap[selectedReward.name];
        if (boosterId) {
          setGameState(prevState => {
            const booster = prevState.boosters.find(b => b.id === boosterId);
            if (booster) {
              const newBooster = {
                ...booster,
                active: true,
                timeLeft: booster.duration
              };
              
              return {
                ...prevState,
                activeBoosters: [...prevState.activeBoosters.filter(b => b.id !== boosterId), newBooster]
              };
            }
            return prevState;
          });
        }
      }
    }, 7000); // 7 seconds of spinning
  }, [gameState.coins, boxOpeningState.isOpening]);

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
      
      // Limit score to maximum allowed per request (1000)
      const MAX_SCORE_PER_REQUEST = 1000;
      const scoreToSubmit = Math.min(Math.floor(gameState.totalCoins), MAX_SCORE_PER_REQUEST);
      
      console.log('Saving score:', {
        originalScore: Math.floor(gameState.totalCoins),
        scoreToSubmit,
        playerAddress
      });
      
      submitPlayerScore(playerAddress, scoreToSubmit)
        .then((result) => {
          console.log('Save score result:', result);
          if (result.success) {
            setSaveMessage('Progress saved to blockchain!');
            if (gameState.totalCoins > highScore) {
              setHighScore(Math.floor(gameState.totalCoins));
              localStorage.setItem('gameHighScore', Math.floor(gameState.totalCoins).toString());
            }
          } else {
            console.error('Save failed:', result.error);
            setSaveMessage(`Error: ${result.error || 'Failed to save progress'}`);
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

  // Aviator Game Function
  const startAviator = useCallback((betAmount: number) => {
    if (gameState.coins < betAmount || aviatorGameActive) return;
    
    setAviatorBet(betAmount);
    setAviatorGameActive(true);
    setAviatorFlying(true);
    setAviatorMultiplier(1.0);
    
    // Deduct bet amount
    setGameState(prev => ({
      ...prev,
      coins: prev.coins - betAmount,
      slots: {
        ...prev.slots,
        totalSpins: prev.slots.totalSpins + 1
      }
    }));
    
    // Start the flight with weighted probability favoring lower multipliers
    // 60% chance to crash between 1.00x-1.50x
    // 25% chance to crash between 1.50x-2.00x  
    // 10% chance to crash between 2.00x-2.50x
    // 4% chance to crash between 2.50x-3.00x
    // 1% chance to crash between 3.00x-4.00x
    const rand = Math.random();
    let crashPoint;
    
    if (rand < 0.6) {
      crashPoint = 1.0 + Math.random() * 0.5; // 1.00x - 1.50x
    } else if (rand < 0.85) {
      crashPoint = 1.5 + Math.random() * 0.5; // 1.50x - 2.00x
    } else if (rand < 0.95) {
      crashPoint = 2.0 + Math.random() * 0.5; // 2.00x - 2.50x
    } else if (rand < 0.99) {
      crashPoint = 2.5 + Math.random() * 0.5; // 2.50x - 3.00x
    } else {
      crashPoint = 3.0 + Math.random() * 1.0; // 3.00x - 4.00x (very rare)
    }
    let currentMultiplier = 1.0;
    
    aviatorIntervalRef.current = setInterval(() => {
      currentMultiplier += 0.01;
      setAviatorMultiplier(currentMultiplier);
      
      if (currentMultiplier >= crashPoint) {
        // Plane crashed - player loses
        setAviatorFlying(false);
        setAviatorGameActive(false);
        
        setGameState(prev => ({
          ...prev,
          slots: {
            ...prev.slots,
            totalLost: prev.slots.totalLost + betAmount
          }
        }));
        
        if (aviatorIntervalRef.current) {
          clearInterval(aviatorIntervalRef.current);
        }
        
        // Start new round after 3 seconds
        setTimeout(() => {
          setAviatorMultiplier(1.0);
        }, 3000);
      }
    }, 100);
  }, [gameState.coins, aviatorGameActive]);
  
  const cashoutAviator = useCallback(() => {
    if (!aviatorGameActive || !aviatorFlying) return;
    
    const winAmount = Math.floor(aviatorBet * aviatorMultiplier);
    
    setAviatorFlying(false);
    setAviatorGameActive(false);
    
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + winAmount,
      totalCoins: Math.max(prev.totalCoins, prev.coins + winAmount),
      slots: {
        ...prev.slots,
        totalWon: prev.slots.totalWon + (winAmount - aviatorBet),
        biggestWin: winAmount > prev.slots.biggestWin ? winAmount : prev.slots.biggestWin
      }
    }));
    
    if (aviatorIntervalRef.current) {
      clearInterval(aviatorIntervalRef.current);
    }
    
    // Start new round after 3 seconds
    setTimeout(() => {
      setAviatorMultiplier(1.0);
    }, 3000);
  }, [aviatorBet, aviatorMultiplier, aviatorGameActive, aviatorFlying]);

  // Minesweeper Game Function
  const startMinesweeper = useCallback((betAmount: number) => {
    if (gameState.coins < betAmount || minesweeperGameActive) return;
    
    setMinesweeperBet(betAmount);
    setMinesweeperGameActive(true);
    setMinesweeperMultiplier(1.0);
    
    // Deduct bet amount
    setGameState(prev => ({
      ...prev,
      coins: prev.coins - betAmount,
      slots: {
        ...prev.slots,
        totalSpins: prev.slots.totalSpins + 1
      }
    }));
    
    // Generate grid with 5 mines out of 25 tiles
    const grid = Array.from({length: 25}, (_, i) => ({
      revealed: false,
      isMine: false,
      value: 0
    }));
    
    // Place 5 random mines
    const minePositions = new Set<number>();
    while (minePositions.size < 5) {
      minePositions.add(Math.floor(Math.random() * 25));
    }
    
    minePositions.forEach(pos => {
      grid[pos].isMine = true;
    });
    
    setMinesweeperGrid(grid);
  }, [gameState.coins, minesweeperGameActive]);
  
  const revealTile = useCallback((index: number) => {
    if (!minesweeperGameActive || minesweeperGrid[index].revealed) return;
    
    const newGrid = [...minesweeperGrid];
    newGrid[index].revealed = true;
    
    if (newGrid[index].isMine) {
      // Hit a mine - game over
      setMinesweeperGameActive(false);
      setGameState(prev => ({
        ...prev,
        slots: {
          ...prev.slots,
          totalLost: prev.slots.totalLost + minesweeperBet
        }
      }));
    } else {
      // Safe tile - increase multiplier
      const newMultiplier = minesweeperMultiplier + 0.2;
      setMinesweeperMultiplier(newMultiplier);
    }
    
    setMinesweeperGrid(newGrid);
  }, [minesweeperGameActive, minesweeperGrid, minesweeperBet, minesweeperMultiplier]);
  
  const cashoutMinesweeper = useCallback(() => {
    if (!minesweeperGameActive) return;
    
    const winAmount = Math.floor(minesweeperBet * minesweeperMultiplier);
    
    setMinesweeperGameActive(false);
    
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + winAmount,
      totalCoins: Math.max(prev.totalCoins, prev.coins + winAmount),
      slots: {
        ...prev.slots,
        totalWon: prev.slots.totalWon + (winAmount - minesweeperBet),
        biggestWin: winAmount > prev.slots.biggestWin ? winAmount : prev.slots.biggestWin
      }
    }));
  }, [minesweeperBet, minesweeperMultiplier, minesweeperGameActive]);

  // Coin Flip Game Function
  const playCoinFlip = useCallback((betAmount: number, choice: 'heads' | 'tails') => {
    if (gameState.coins < betAmount || coinflipFlipping) return;
    
    setCoinflipChoice(choice);
    setCoinflipFlipping(true);
    setCoinflipResult(null);
    
    // Deduct bet amount
    setGameState(prev => ({
      ...prev,
      coins: prev.coins - betAmount,
      slots: {
        ...prev.slots,
        totalSpins: prev.slots.totalSpins + 1
      }
    }));
    
    // Simulate coin flip after 2 seconds
    setTimeout(() => {
      const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinflipResult(result);
      setCoinflipFlipping(false);
      
      if (result === choice) {
        // Player won - 2x payout
        const winAmount = betAmount * 2;
        setGameState(prev => ({
          ...prev,
          coins: prev.coins + winAmount,
          totalCoins: Math.max(prev.totalCoins, prev.coins + winAmount),
          slots: {
            ...prev.slots,
            totalWon: prev.slots.totalWon + betAmount,
            biggestWin: winAmount > prev.slots.biggestWin ? winAmount : prev.slots.biggestWin
          }
        }));
      } else {
        // Player lost
        setGameState(prev => ({
          ...prev,
          slots: {
            ...prev.slots,
            totalLost: prev.slots.totalLost + betAmount
          }
        }));
      }
    }, 2000);
  }, [gameState.coins, coinflipFlipping]);

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
    <div className="min-h-screen" style={{backgroundColor: '#8668ae'}}>
      <div className="min-h-screen border-l-8 border-r-8 border-black" style={{backgroundColor: '#8668ae'}}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-orange-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
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
          <div className="bg-black bg-opacity-50 p-2 rounded-lg flex flex-wrap gap-2 justify-center">
            {(['main', 'shop', 'lucky', 'story'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`px-4 py-3 rounded-lg font-bold transition-all text-sm md:text-base whitespace-nowrap ${
                  currentTab === tab
                    ? 'bg-purple-500 text-black'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {tab === 'main' && '👆 Click'}
                {tab === 'shop' && '🏪 Shop'}
                {tab === 'lucky' && '🍀 Lucky'}
                {tab === 'story' && '📖 Story'}
              </button>
            ))}
            
            {/* External Leaderboard Button */}
            <a
              href="https://monad-games-id-site.vercel.app/leaderboard?page=1&gameId=109"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-lg font-bold transition-all text-sm md:text-base whitespace-nowrap bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              🏆 Leaderboard 🔗
            </a>
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
                  className="w-80 h-80 mx-auto rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-150 text-6xl font-bold text-white border-8 border-white animate-pulse flex items-center justify-center"
                  style={{backgroundColor: '#342650'}}
                >
                  <img src="/monad.png" alt="Monad" className="w-32 h-32" />
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
              <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center">🤖 Auto Workers</h2>
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
          <div className="space-y-8">
            {/* Special Items */}
            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-purple-500">
              <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center">🎆 Special Items</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
                <div className="p-4 rounded-lg border border-yellow-500 bg-gray-800 h-full">
                  <div className="text-center h-full flex flex-col justify-between">
                    <div className="min-h-[120px]">
                      <div className="text-4xl mb-2">🎆</div>
                      <div className="text-yellow-400 font-bold text-lg">Golden Touch</div>
                      <div className="text-gray-300 text-sm mb-3">Permanently increase click power by 50%</div>
                      <div className="text-yellow-400 mb-3">Cost: {formatNumber(1000000)}</div>
                    </div>
                    <button 
                      disabled={gameState.coins < 1000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold text-xs"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-red-500 bg-gray-800 h-full">
                  <div className="text-center h-full flex flex-col justify-between">
                    <div className="min-h-[120px]">
                      <div className="text-4xl mb-2">🔥</div>
                      <div className="text-red-400 font-bold text-lg">Legendary Multiplier</div>
                      <div className="text-gray-300 text-sm mb-3">All auto clickers 2x more efficient</div>
                      <div className="text-red-400 mb-3">Cost: {formatNumber(10000000)}</div>
                    </div>
                    <button 
                      disabled={gameState.coins < 10000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold text-xs"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-blue-500 bg-gray-800 h-full">
                  <div className="text-center h-full flex flex-col justify-between">
                    <div className="min-h-[120px]">
                      <div className="text-4xl mb-2">💎</div>
                      <div className="text-blue-400 font-bold text-lg">Diamond Prestige</div>
                      <div className="text-gray-300 text-sm mb-3">Reduce prestige requirement by 50%</div>
                      <div className="text-blue-400 mb-3">Cost: {formatNumber(50000000)}</div>
                    </div>
                    <button 
                      disabled={gameState.coins < 50000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold text-xs"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-green-500 bg-gray-800 h-full">
                  <div className="text-center h-full flex flex-col justify-between">
                    <div className="min-h-[120px]">
                      <div className="text-4xl mb-2">🌟</div>
                      <div className="text-green-400 font-bold text-lg">Lucky Star</div>
                      <div className="text-gray-300 text-sm mb-3">Double all gambling wins for 1 hour</div>
                      <div className="text-green-400 mb-3">Cost: {formatNumber(25000000)}</div>
                    </div>
                    <button 
                      disabled={gameState.coins < 25000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold text-xs"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-pink-500 bg-gray-800 h-full">
                  <div className="text-center h-full flex flex-col justify-between">
                    <div className="min-h-[120px]">
                      <div className="text-4xl mb-2">👑</div>
                      <div className="text-pink-400 font-bold text-lg">Royal Crown</div>
                      <div className="text-gray-300 text-sm mb-3">Unlock exclusive royal theme</div>
                      <div className="text-pink-400 mb-3">Cost: {formatNumber(100000000)}</div>
                    </div>
                    <button 
                      disabled={gameState.coins < 100000000}
                      className="w-full bg-gray-600 text-gray-400 cursor-not-allowed py-2 px-4 rounded font-bold text-xs"
                    >
                      🔒 Too Expensive
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Power Boosters */}
            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-orange-500">
              <h2 className="text-3xl font-bold text-orange-400 mb-6 text-center">⚡ Power Boosters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameState.boosters.map(booster => {
                  const canAfford = gameState.coins >= booster.price;
                  const isActive = gameState.activeBoosters.some(b => b.id === booster.id);
                  
                  return (
                    <div key={booster.id} className={`p-3 rounded-lg border-2 text-center transition-all ${
                      isActive ? 'border-orange-500 bg-orange-900 bg-opacity-50' :
                      canAfford ? 'border-green-500 bg-gray-800' : 'border-gray-600 bg-gray-900'
                    }`}>
                      <div className="text-3xl mb-1">{booster.icon}</div>
                      <div className="text-white font-bold text-base mb-1">{booster.name}</div>
                      <div className="text-gray-300 text-xs mb-2">
                        {booster.multiplier}x multiplier for {booster.duration} seconds
                      </div>
                      <div className="text-yellow-400 mb-3 font-bold text-sm">
                        Cost: {formatNumber(booster.price)}
                      </div>
                      {isActive ? (
                        <div className="bg-orange-500 px-3 py-1 rounded font-bold text-white text-xs">
                          ⏱️ Active ({gameState.activeBoosters.find(b => b.id === booster.id)?.timeLeft}s)
                        </div>
                      ) : (
                        <button
                          onClick={() => buyBooster(booster.id)}
                          disabled={!canAfford}
                          className={`w-full py-1 px-3 rounded font-bold transition-all text-xs ${
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

            {/* Box Opening Game */}
            <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-yellow-500">
              <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center"></h2>
              
              {/* Box Opening Area */}
              <div className="bg-gray-900 p-8 rounded-lg mb-6 border-4 border-yellow-600">
                <div className="text-center mb-6">
                  <div className="text-8xl mb-4">🎁</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Open Mystery Boxes!</h3>
                  <p className="text-gray-300">Spend coins to get random items with spinning animation</p>
                </div>
                
                {boxOpeningState.isOpening ? (
                  <div className="mb-6">
                    <div className="text-xl font-bold text-yellow-400 mb-4">Opening surprise box...</div>
                    <div className="relative overflow-hidden bg-gray-900 rounded-lg p-4 border-4 border-yellow-500">
                      <div className="flex gap-3" style={{
                        animation: 'csgoSlide 7s ease-out infinite',
                        width: 'fit-content'
                      }}>
                        {[...boxOpeningState.spinningItems, ...boxOpeningState.spinningItems].map((item, index) => (
                          <div key={index} className="min-w-[80px] h-20 bg-gray-800 rounded-lg border-2 border-yellow-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">{item.icon}</span>
                          </div>
                        ))}
                      </div>
                      {/* Center indicator */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-red-500 opacity-80"></div>
                    </div>
                    <style jsx>{`
                      @keyframes csgoSlide {
                        0% { transform: translateX(0); }
                        57% { transform: translateX(-${boxOpeningState.spinningItems.length * 80}px); }
                        71% { transform: translateX(-${boxOpeningState.spinningItems.length * 87}px); }
                        86% { transform: translateX(-${boxOpeningState.spinningItems.length * 90}px); }
                        100% { transform: translateX(-${boxOpeningState.spinningItems.length * 92}px); }
                      }
                    `}</style>
                  </div>
                ) : boxOpeningState.lastReward ? (
                  <div className="mb-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{boxOpeningState.lastReward.icon}</div>
                      <div className="text-2xl font-bold text-green-400 mb-2">
                        🎉 You got: {boxOpeningState.lastReward.name}!
                      </div>
                      <div className="text-lg text-gray-300">{boxOpeningState.lastReward.description}</div>
                    </div>
                  </div>
                ) : null}
                
                {/* Box Opening Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => openBox(5000000)}
                    disabled={gameState.coins < 5000000 || boxOpeningState.isOpening}
                    className={`py-6 px-8 rounded-lg font-bold text-xl transition-all ${
                      gameState.coins >= 5000000 && !boxOpeningState.isOpening
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black shadow-lg'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    🎆 Open Surprise Box<br />
                    <span className="text-lg">Cost: {formatNumber(5000000)} coins</span>
                  </button>
                </div>
              </div>
              
              {/* Drop Rates */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-lg font-bold text-white mb-3 text-center">Drop Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-red-400 font-bold mb-2">Ultra Rare (0.01%)</div>
                    <div className="text-gray-300 mb-1">👑 God Mode, 👑 Royal Crown</div>
                    
                    <div className="text-purple-400 font-bold mb-2 mt-3">Rare (1.09%)</div>
                    <div className="text-gray-300 mb-1">💎 Diamond Prestige, 🌟 Lucky Star, 🌌 Cosmic Storm</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold mb-2">Uncommon (3%)</div>
                    <div className="text-gray-300 mb-1">🔥 Legendary Multiplier, 🎆 Golden Touch</div>
                    
                    <div className="text-green-400 font-bold mb-2 mt-3">Common (95.9%)</div>
                    <div className="text-gray-300 mb-1">⚡ Click Frenzy, 🚀 Auto Boost, 💥 Mega Boost, 🌪️ Tornado Boost</div>
                  </div>
                </div>
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
                      <div className={`text-6xl mb-4 ${aviatorFlying ? 'animate-bounce' : ''}`}>✈️</div>
                      <div className="text-4xl font-bold text-white mb-4">{aviatorMultiplier.toFixed(2)}x</div>
                      {aviatorFlying ? (
                        <div className="text-green-400 text-xl">Flying... Cash out now!</div>
                      ) : aviatorGameActive ? (
                        <div className="text-red-400 text-xl">CRASHED!</div>
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
                        disabled={gameState.coins < bet || aviatorGameActive}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                        } ${gameState.coins < bet || aviatorGameActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {formatNumber(bet)}
                      </button>
                    ))}
                  </div>
                  {aviatorFlying ? (
                    <button 
                      onClick={cashoutAviator}
                      className="w-full py-4 px-8 rounded-lg font-bold text-xl bg-green-500 hover:bg-green-600 text-white animate-pulse"
                    >
                      💰 Cash Out ({formatNumber(Math.floor(aviatorBet * aviatorMultiplier))} coins)
                    </button>
                  ) : (
                    <button 
                      onClick={() => startAviator(selectedBet)}
                      disabled={gameState.coins < selectedBet || aviatorGameActive}
                      className="w-full py-4 px-8 rounded-lg font-bold text-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white"
                    >
                      ✈️ Start Flight ({formatNumber(selectedBet)} coins)
                    </button>
                  )}
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
                  {minesweeperGameActive && (
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-yellow-400">
                        Current Multiplier: {minesweeperMultiplier.toFixed(1)}x
                      </div>
                      <div className="text-lg text-white">
                        Potential Win: {formatNumber(Math.floor(minesweeperBet * minesweeperMultiplier))} coins
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-900 p-6 rounded-lg mb-6 border-4 border-red-400">
                    <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
                      {Array.from({length: 25}, (_, i) => {
                        const tile = minesweeperGrid[i];
                        return (
                          <button
                            key={i}
                            onClick={() => revealTile(i)}
                            disabled={!minesweeperGameActive || (tile && tile.revealed)}
                            className={`w-12 h-12 rounded border-2 text-white font-bold transition-all ${
                              tile && tile.revealed
                                ? tile.isMine
                                  ? 'bg-red-500 border-red-300'
                                  : 'bg-green-500 border-green-300'
                                : 'bg-gray-700 hover:bg-gray-600 border-gray-500'
                            } ${!minesweeperGameActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {tile && tile.revealed ? (tile.isMine ? '💣' : '✨') : '?'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {[5, 50, 500, 5000, 50000].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        disabled={gameState.coins < bet || minesweeperGameActive}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                        } ${gameState.coins < bet || minesweeperGameActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {formatNumber(bet)}
                      </button>
                    ))}
                  </div>
                  {minesweeperGameActive ? (
                    <button 
                      onClick={cashoutMinesweeper}
                      className="w-full py-4 px-8 rounded-lg font-bold text-xl bg-green-500 hover:bg-green-600 text-white"
                    >
                      💰 Cash Out ({formatNumber(Math.floor(minesweeperBet * minesweeperMultiplier))} coins)
                    </button>
                  ) : (
                    <button 
                      onClick={() => startMinesweeper(selectedBet)}
                      disabled={gameState.coins < selectedBet}
                      className="w-full py-4 px-8 rounded-lg font-bold text-xl bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white"
                    >
                      💣 Start Game ({formatNumber(selectedBet)} coins)
                    </button>
                  )}
                </div>
                <div className="bg-black bg-opacity-50 p-6 rounded-lg border border-red-400">
                  <h4 className="text-xl font-bold text-red-400 mb-4">How to Play</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>• Choose your bet amount and start the game</p>
                    <p>• Click tiles to reveal them</p>
                    <p>• Avoid the mines (💣) - there are 5 on the grid</p>
                    <p>• Each safe tile increases your multiplier by 0.2x</p>
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
                        <div className="text-2xl font-bold text-white mb-2">
                          {coinflipResult === 'heads' ? 'HEADS!' : 'TAILS!'}
                        </div>
                      )}
                      {coinflipResult && !coinflipFlipping && coinflipChoice && (
                        <div className={`text-xl font-bold ${
                          coinflipResult === coinflipChoice ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {coinflipResult === coinflipChoice ? '🎉 YOU WON!' : '😔 YOU LOST!'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <button 
                      onClick={() => playCoinFlip(selectedBet, 'heads')}
                      disabled={gameState.coins < selectedBet || coinflipFlipping}
                      className="py-4 px-6 rounded-lg font-bold text-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white border-4 border-blue-400"
                    >
                      👑 Heads (2x)
                    </button>
                    <button 
                      onClick={() => playCoinFlip(selectedBet, 'tails')}
                      disabled={gameState.coins < selectedBet || coinflipFlipping}
                      className="py-4 px-6 rounded-lg font-bold text-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white border-4 border-orange-400"
                    >
                      🪙 Tails (2x)
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    {[5, 50, 500, 5000, 50000].map(bet => (
                      <button
                        key={bet}
                        onClick={() => setSelectedBet(bet)}
                        disabled={gameState.coins < bet || coinflipFlipping}
                        className={`py-3 px-4 rounded-lg font-bold transition-all ${
                          selectedBet === bet ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'
                        } ${gameState.coins < bet || coinflipFlipping ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {formatNumber(bet)}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-white">
                    Selected Bet: <span className="font-bold text-yellow-400">{formatNumber(selectedBet)} coins</span>
                    {coinflipFlipping && (
                      <div className="mt-2 text-lg font-bold text-yellow-400 animate-pulse">
                        Flipping coin...
                      </div>
                    )}
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
    </div>
  );
}