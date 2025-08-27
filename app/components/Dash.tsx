"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { submitPlayerScore } from '../lib/score-api';

// Game interfaces
interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  color: string;
  direction: number; // angle in radians for facing direction
}

interface Orb {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  pulsePhase: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  type: 'wanderer' | 'chaser' | 'spinner' | 'bouncer';
  color: string;
  rotation?: number;
  moveTimer?: number;
  targetX?: number;
  targetY?: number;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface GameState {
  player: Player;
  orbs: Orb[];
  enemies: Enemy[];
  particles: Particle[];
  score: number;
  highScore: number;
  isRunning: boolean;
  isPaused: boolean;
  keys: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    escape: boolean;
  };
  lastOrbSpawn: number;
  lastEnemySpawn: number;
  difficulty: number;
}

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const ORB_SIZE = 12;
const PLAYER_SPEED = 4;
const ORB_SPAWN_RATE = 2000;
const ENEMY_SPAWN_RATE = 1500;
const FRICTION = 0.85;
const MAX_SPEED = 6;

// Utility functions
const random = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Collision detection
const checkCollision = (rect1: any, rect2: any): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

// Create particle effects
const createParticles = (gameState: GameState, x: number, y: number, count: number, color: string, type: 'orb' | 'explosion') => {
  for (let i = 0; i < count; i++) {
    const velocityX = random(-5, 5);
    const velocityY = random(type === 'orb' ? -8 : -6, type === 'orb' ? -2 : 2);
    const size = random(2, type === 'orb' ? 6 : 4);
    const life = random(0.4, 0.8);
    
    gameState.particles.push({
      x: x + random(-5, 5),
      y: y + random(-5, 5),
      velocityX,
      velocityY,
      size,
      color,
      life,
      maxLife: life
    });
  }
};

// Spawn orb
const spawnOrb = (gameState: GameState) => {
  const currentTime = Date.now();
  if (currentTime - gameState.lastOrbSpawn < ORB_SPAWN_RATE / gameState.difficulty) return;
  
  const orb: Orb = {
    x: random(ORB_SIZE, CANVAS_WIDTH - ORB_SIZE),
    y: random(ORB_SIZE, CANVAS_HEIGHT - ORB_SIZE),
    width: ORB_SIZE,
    height: ORB_SIZE,
    collected: false,
    pulsePhase: 0
  };
  
  gameState.orbs.push(orb);
  gameState.lastOrbSpawn = currentTime;
};

// Spawn enemy
const spawnEnemy = (gameState: GameState) => {
  const currentTime = Date.now();
  if (currentTime - gameState.lastEnemySpawn < ENEMY_SPAWN_RATE / gameState.difficulty) return;
  
  const types: Array<Enemy['type']> = ['wanderer', 'chaser', 'spinner', 'bouncer'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let enemy: Enemy;
  
  switch (type) {
    case 'wanderer':
      enemy = {
        x: random(0, CANVAS_WIDTH - 20),
        y: random(0, CANVAS_HEIGHT - 20),
        width: 18,
        height: 18,
        velocityX: random(-2, 2),
        velocityY: random(-2, 2),
        type,
        color: '#ff4757',
        moveTimer: 0
      };
      break;
    case 'chaser':
      enemy = {
        x: random(0, CANVAS_WIDTH - 16),
        y: random(0, CANVAS_HEIGHT - 16),
        width: 16,
        height: 16,
        velocityX: 0,
        velocityY: 0,
        type,
        color: '#ff6b6b'
      };
      break;
    case 'spinner':
      enemy = {
        x: random(30, CANVAS_WIDTH - 30),
        y: random(30, CANVAS_HEIGHT - 30),
        width: 22,
        height: 22,
        velocityX: 0,
        velocityY: 0,
        type,
        color: '#feca57',
        rotation: 0
      };
      break;
    case 'bouncer':
      enemy = {
        x: random(25, CANVAS_WIDTH - 25),
        y: random(25, CANVAS_HEIGHT - 25),
        width: 20,
        height: 20,
        velocityX: random(-3, 3),
        velocityY: random(-3, 3),
        type,
        color: '#1dd1a1'
      };
      break;
  }
  
  gameState.enemies.push(enemy);
  gameState.lastEnemySpawn = currentTime;
};

// Update game entities
const updatePlayer = (gameState: GameState) => {
  const player = gameState.player;
  
  // Calculate movement direction
  let moveX = 0;
  let moveY = 0;
  
  if (gameState.keys.left) moveX -= 1;
  if (gameState.keys.right) moveX += 1;
  if (gameState.keys.up) moveY -= 1;
  if (gameState.keys.down) moveY += 1;
  
  // Normalize diagonal movement
  if (moveX !== 0 && moveY !== 0) {
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    moveX /= length;
    moveY /= length;
  }
  
  // Apply movement
  if (moveX !== 0 || moveY !== 0) {
    player.velocityX += moveX * player.speed * 0.3;
    player.velocityY += moveY * player.speed * 0.3;
    
    // Update facing direction
    player.direction = Math.atan2(moveY, moveX);
  }
  
  // Apply friction
  player.velocityX *= FRICTION;
  player.velocityY *= FRICTION;
  
  // Limit maximum speed
  const speed = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY);
  if (speed > MAX_SPEED) {
    player.velocityX = (player.velocityX / speed) * MAX_SPEED;
    player.velocityY = (player.velocityY / speed) * MAX_SPEED;
  }
  
  // Update position
  player.x += player.velocityX;
  player.y += player.velocityY;
  
  // Keep player within bounds
  player.x = clamp(player.x, 0, CANVAS_WIDTH - player.width);
  player.y = clamp(player.y, 0, CANVAS_HEIGHT - player.height);
};

const updateEnemies = (gameState: GameState) => {
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    const player = gameState.player;
    
    switch (enemy.type) {
      case 'wanderer':
        // Random movement with occasional direction changes
        if (enemy.moveTimer === undefined) enemy.moveTimer = 0;
        enemy.moveTimer++;
        
        if (enemy.moveTimer > 120) { // Change direction every 2 seconds
          enemy.velocityX = random(-2, 2);
          enemy.velocityY = random(-2, 2);
          enemy.moveTimer = 0;
        }
        
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        
        // Bounce off walls
        if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) {
          enemy.velocityX *= -1;
        }
        if (enemy.y <= 0 || enemy.y >= CANVAS_HEIGHT - enemy.height) {
          enemy.velocityY *= -1;
        }
        break;
        
      case 'chaser':
        // Follow player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const speed = 1.5;
          enemy.velocityX = (dx / distance) * speed;
          enemy.velocityY = (dy / distance) * speed;
        }
        
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        break;
        
      case 'spinner':
        // Spin in place and occasionally move
        if (enemy.rotation === undefined) enemy.rotation = 0;
        enemy.rotation += 5;
        
        // Occasional movement
        if (Math.random() < 0.02) {
          const angle = random(0, Math.PI * 2);
          enemy.velocityX = Math.cos(angle) * 3;
          enemy.velocityY = Math.sin(angle) * 3;
        }
        
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        
        // Slow down movement
        enemy.velocityX *= 0.95;
        enemy.velocityY *= 0.95;
        
        // Keep in bounds
        if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) {
          enemy.velocityX *= -0.5;
        }
        if (enemy.y <= 0 || enemy.y >= CANVAS_HEIGHT - enemy.height) {
          enemy.velocityY *= -0.5;
        }
        break;
        
      case 'bouncer':
        // Bounces around the table
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        
        // Bounce off walls
        if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) {
          enemy.velocityX *= -1;
          enemy.x = clamp(enemy.x, 0, CANVAS_WIDTH - enemy.width);
        }
        if (enemy.y <= 0 || enemy.y >= CANVAS_HEIGHT - enemy.height) {
          enemy.velocityY *= -1;
          enemy.y = clamp(enemy.y, 0, CANVAS_HEIGHT - enemy.height);
        }
        break;
    }
    
    // Keep enemies in bounds
    enemy.x = clamp(enemy.x, 0, CANVAS_WIDTH - enemy.width);
    enemy.y = clamp(enemy.y, 0, CANVAS_HEIGHT - enemy.height);
  }
};

const updateOrbs = (gameState: GameState) => {
  for (let i = gameState.orbs.length - 1; i >= 0; i--) {
    const orb = gameState.orbs[i];
    orb.pulsePhase += 0.1;
    
    if (checkCollision(gameState.player, orb) && !orb.collected) {
      orb.collected = true;
      gameState.score += 10;
      createParticles(gameState, orb.x + orb.width / 2, orb.y + orb.height / 2, 12, '#ffdd59', 'orb');
      gameState.orbs.splice(i, 1);
    }
  }
};

const updateParticles = (gameState: GameState) => {
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const particle = gameState.particles[i];
    
    particle.x += particle.velocityX;
    particle.y += particle.velocityY;
    particle.velocityY += 0.3;
    particle.life -= 0.016;
    
    if (particle.life <= 0) {
      gameState.particles.splice(i, 1);
    }
  }
};

// Rendering functions
const drawBackground = (ctx: CanvasRenderingContext2D) => {
  // Table surface with wood texture effect
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#8B4513');
  gradient.addColorStop(0.3, '#A0522D');
  gradient.addColorStop(0.7, '#8B4513');
  gradient.addColorStop(1, '#654321');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Table edge/border
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
  
  // Wood grain lines for texture
  ctx.strokeStyle = 'rgba(101, 67, 33, 0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = (CANVAS_HEIGHT / 6) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(CANVAS_WIDTH - 20, y + random(-10, 10));
    ctx.stroke();
  }
  
  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 50; x < CANVAS_WIDTH; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 50; y < CANVAS_HEIGHT; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
};

const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
  ctx.save();
  
  // Draw player body
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  
  // Draw direction indicator (small arrow)
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const arrowLength = 12;
  const arrowX = centerX + Math.cos(player.direction) * arrowLength;
  const arrowY = centerY + Math.sin(player.direction) * arrowLength;
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(arrowX, arrowY);
  ctx.stroke();
  
  // Draw arrowhead
  const headLength = 6;
  const headAngle = Math.PI / 6;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(
    arrowX - headLength * Math.cos(player.direction - headAngle),
    arrowY - headLength * Math.sin(player.direction - headAngle)
  );
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(
    arrowX - headLength * Math.cos(player.direction + headAngle),
    arrowY - headLength * Math.sin(player.direction + headAngle)
  );
  ctx.stroke();
  
  // Player outline
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x, player.y, player.width, player.height);
  
  ctx.restore();
};

const drawOrb = (ctx: CanvasRenderingContext2D, orb: Orb) => {
  const pulseSize = Math.sin(orb.pulsePhase) * 2;
  const size = orb.width + pulseSize;
  
  ctx.shadowColor = '#ffdd59';
  ctx.shadowBlur = 10;
  
  ctx.fillStyle = '#ffdd59';
  ctx.beginPath();
  ctx.arc(
    orb.x + orb.width / 2,
    orb.y + orb.height / 2,
    size / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    orb.x + orb.width / 2 - 2,
    orb.y + orb.height / 2 - 2,
    size / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  ctx.shadowBlur = 0;
};

const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
  ctx.save();
  
  const centerX = enemy.x + enemy.width / 2;
  const centerY = enemy.y + enemy.height / 2;
  
  if (enemy.rotation !== undefined) {
    ctx.translate(centerX, centerY);
    ctx.rotate((enemy.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }
  
  ctx.fillStyle = enemy.color;
  
  switch (enemy.type) {
    case 'wanderer':
      // Simple square that wanders
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.x + 2, enemy.y + 2, enemy.width - 4, enemy.height - 4);
      break;
      
    case 'chaser':
      // Diamond shape that chases
      ctx.beginPath();
      ctx.moveTo(centerX, enemy.y); // top
      ctx.lineTo(enemy.x + enemy.width, centerY); // right
      ctx.lineTo(centerX, enemy.y + enemy.height); // bottom
      ctx.lineTo(enemy.x, centerY); // left
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
      
    case 'spinner':
      // Star shape that spins
      ctx.beginPath();
      const spikes = 6;
      const outerRadius = enemy.width / 2;
      const innerRadius = outerRadius * 0.5;
      
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
      
    case 'bouncer':
      // Circle that bounces
      ctx.beginPath();
      ctx.arc(centerX, centerY, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Inner circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, enemy.width / 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
  }
  
  ctx.restore();
};

const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
  const alpha = particle.life / particle.maxLife;
  ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
  ctx.fill();
};

const drawUI = (ctx: CanvasRenderingContext2D, gameState: GameState) => {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${gameState.score}`, 20, 40);
  
  ctx.textAlign = 'right';
  ctx.fillText(`Best: ${gameState.highScore}`, CANVAS_WIDTH - 20, 40);
  
  if (!gameState.isRunning) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HYPER JUMP', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
    ctx.fillStyle = '#ffdd59';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('TOP-DOWN EDITION', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('Collect Yellow Orbs', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.fillText('Dodge All Enemies', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    ctx.font = '20px monospace';
    ctx.fillText('WASD/Arrows: Move in All Directions', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
    ctx.fillText('ESC: Pause', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 95);
    
    ctx.fillStyle = '#ffdd59';
    ctx.fillText('Click or Press Any Key to Start!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 140);
  }
  
  if (gameState.isPaused && gameState.isRunning) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.font = '20px monospace';
    ctx.fillText('Press ESC to Resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
  }
};

interface DashProps {
  playerAddress?: string;
}

export default function Dash({ playerAddress }: DashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const gameStateRef = useRef<GameState>({
    player: {
      x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
      y: CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      velocityX: 0,
      velocityY: 0,
      speed: PLAYER_SPEED,
      color: '#00b894',
      direction: 0
    },
    orbs: [],
    enemies: [],
    particles: [],
    score: 0,
    highScore: 0,
    isRunning: false,
    isPaused: false,
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      escape: false
    },
    lastOrbSpawn: 0,
    lastEnemySpawn: 0,
    difficulty: 1
  });

  const startGame = useCallback(() => {
    const gameState = gameStateRef.current;
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.difficulty = 1;
    gameState.orbs = [];
    gameState.enemies = [];
    gameState.particles = [];
    gameState.player.x = CANVAS_WIDTH / 2 - PLAYER_SIZE / 2;
    gameState.player.y = CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2;
    gameState.player.velocityX = 0;
    gameState.player.velocityY = 0;
    gameState.player.direction = 0;
    gameState.lastOrbSpawn = Date.now();
    gameState.lastEnemySpawn = Date.now();
    setScore(0);
  }, []);

  const endGame = useCallback(() => {
    const gameState = gameStateRef.current;
    gameState.isRunning = false;
    
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      setHighScore(gameState.highScore);
      localStorage.setItem('hyperJumpHighScore', gameState.highScore.toString());
    }
    
    if (playerAddress && gameState.score > 0) {
      setIsSavingScore(true);
      submitPlayerScore(playerAddress, gameState.score)
        .then(() => {
          setSaveMessage('Score saved successfully!');
        })
        .catch((error) => {
          console.error('Error saving score:', error);
          setSaveMessage('Error saving score.');
        })
        .finally(() => {
          setIsSavingScore(false);
          setTimeout(() => setSaveMessage(''), 3000);
        });
    }
  }, [playerAddress]);

  const togglePause = useCallback(() => {
    const gameState = gameStateRef.current;
    if (gameState.isRunning) {
      gameState.isPaused = !gameState.isPaused;
    }
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameState = gameStateRef.current;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(ctx);

    if (gameState.isRunning && !gameState.isPaused) {
      updatePlayer(gameState);
      updateEnemies(gameState);
      updateOrbs(gameState);
      updateParticles(gameState);

      spawnOrb(gameState);
      spawnEnemy(gameState);

      gameState.difficulty = 1 + gameState.score / 100;

      for (const enemy of gameState.enemies) {
        if (checkCollision(gameState.player, enemy)) {
          createParticles(gameState, gameState.player.x + gameState.player.width / 2, 
                         gameState.player.y + gameState.player.height / 2, 20, '#ff4757', 'explosion');
          endGame();
          break;
        }
      }

      if (gameState.score !== score) {
        setScore(gameState.score);
      }
    }

    gameState.orbs.forEach(orb => drawOrb(ctx, orb));
    gameState.enemies.forEach(enemy => drawEnemy(ctx, enemy));
    gameState.particles.forEach(particle => drawParticle(ctx, particle));
    drawPlayer(ctx, gameState.player);
    drawUI(ctx, gameState);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [endGame, score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const gameState = gameStateRef.current;
      
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          gameState.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          gameState.keys.right = true;
          break;
        case 'KeyW':
        case 'ArrowUp':
          gameState.keys.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          gameState.keys.down = true;
          break;
        case 'Escape':
          e.preventDefault();
          togglePause();
          break;
        default:
          // Any other key starts the game
          if (!gameState.isRunning && !gameState.isPaused) {
            startGame();
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const gameState = gameStateRef.current;
      
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          gameState.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          gameState.keys.right = false;
          break;
        case 'KeyW':
        case 'ArrowUp':
          gameState.keys.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          gameState.keys.down = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame, togglePause]);

  // Canvas click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleClick = () => {
      const gameState = gameStateRef.current;
      if (!gameState.isRunning && !gameState.isPaused) {
        startGame();
      }
    };
    
    canvas.addEventListener('click', handleClick);
    
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [startGame]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('hyperJumpHighScore');
    if (savedHighScore) {
      const parsedHighScore = parseInt(savedHighScore, 10);
      setHighScore(parsedHighScore);
      gameStateRef.current.highScore = parsedHighScore;
    }
  }, []);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-600 shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />
      {saveMessage && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg font-semibold">
          {saveMessage}
        </div>
      )}
      {isSavingScore && (
        <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded-lg font-semibold">
          Saving score...
        </div>
      )}
      <div className="mt-4 text-center text-gray-300">
        <p className="text-sm">Current Score: {score} | High Score: {highScore}</p>
        <p className="text-xs mt-1">Move around the table to collect orbs and avoid enemies!</p>
        <p className="text-xs">Use WASD or Arrow Keys for full 2D movement</p>
      </div>
    </div>
  );
}
