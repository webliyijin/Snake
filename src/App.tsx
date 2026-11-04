import { useState, useEffect, useCallback, useRef } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';
type Difficulty = 'easy' | 'medium' | 'hard';

const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-500',
  medium: 'bg-yellow-500',
  hard: 'bg-red-500',
};

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

function App() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);

  const directionRef = useRef<Direction>(direction);
  const gameStateRef = useRef<GameState>(gameState);
  const snakeRef = useRef<Position[]>(snake);
  const foodRef = useRef<Position>(food);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(getRandomPosition(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    setGameState('playing');
    lastMoveTimeRef.current = performance.now();
  }, []);

  const moveSnake = useCallback(() => {
    const currentSnake = snakeRef.current;
    const currentDirection = directionRef.current;
    const currentFood = foodRef.current;

    const head = { ...currentSnake[0] };

    switch (currentDirection) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState('gameover');
      return;
    }

    // Check self collision
    if (currentSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
      setGameState('gameover');
      return;
    }

    const newSnake = [head, ...currentSnake];

    // Check food collision
    if (head.x === currentFood.x && head.y === currentFood.y) {
      const newScore = score + 10;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('snake-high-score', newScore.toString());
      }
      setFood(getRandomPosition(newSnake));
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [score, highScore]);

  // Game loop using requestAnimationFrame
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const speed = SPEEDS[difficulty];

    const gameLoop = (timestamp: number) => {
      if (gameStateRef.current !== 'playing') return;

      if (timestamp - lastMoveTimeRef.current >= speed) {
        moveSnake();
        lastMoveTimeRef.current = timestamp;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastMoveTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, difficulty, moveSnake]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          resetGame();
          return;
        }
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
          lastMoveTimeRef.current = performance.now();
        }
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      const currentDir = directionRef.current;
      let newDir: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir !== 'DOWN') newDir = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir !== 'UP') newDir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir !== 'RIGHT') newDir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir !== 'LEFT') newDir = 'RIGHT';
          break;
      }

      if (newDir) {
        e.preventDefault();
        setDirection(newDir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetGame]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) {
      touchStartRef.current = null;
      return;
    }

    const currentDir = directionRef.current;
    let newDir: Direction | null = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && currentDir !== 'LEFT') newDir = 'RIGHT';
      else if (dx < 0 && currentDir !== 'RIGHT') newDir = 'LEFT';
    } else {
      if (dy > 0 && currentDir !== 'UP') newDir = 'DOWN';
      else if (dy < 0 && currentDir !== 'DOWN') newDir = 'UP';
    }

    if (newDir) {
      setDirection(newDir);
    }

    touchStartRef.current = null;
  }, []);

  const handleDirectionButton = useCallback((dir: Direction) => {
    if (gameStateRef.current !== 'playing') return;
    const currentDir = directionRef.current;
    if (
      (dir === 'UP' && currentDir !== 'DOWN') ||
      (dir === 'DOWN' && currentDir !== 'UP') ||
      (dir === 'LEFT' && currentDir !== 'RIGHT') ||
      (dir === 'RIGHT' && currentDir !== 'LEFT')
    ) {
      setDirection(dir);
    }
  }, []);

  const cellSize = `calc(min(70vw, 70vh, 480px) / ${GRID_SIZE})`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
          🐍 贪吃蛇
        </h1>
        
        {/* Score Board */}
        <div className="flex justify-between items-center bg-gray-800/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-700/50">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">分数</div>
            <div className="text-xl font-bold text-white">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              难度: <span className={`${DIFFICULTY_COLORS[difficulty]} text-white px-2 py-0.5 rounded text-xs`}>
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">最高分</div>
            <div className="text-xl font-bold text-yellow-400">{highScore}</div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div
        className="relative border-2 border-gray-600 rounded-lg overflow-hidden shadow-2xl shadow-green-900/20 bg-gray-900/90"
        style={{
          width: `min(70vw, 70vh, 480px)`,
          height: `min(70vw, 70vh, 480px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid background */}
        <div className="absolute inset-0 grid" style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        }}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const isEven = (x + y) % 2 === 0;
            return (
              <div
                key={i}
                className={isEven ? 'bg-gray-800/40' : 'bg-gray-800/20'}
              />
            );
          })}
        </div>

        {/* Snake */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          return (
            <div
              key={index}
              className={`absolute rounded-sm transition-all duration-75 ${
                isHead
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 z-10'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
              }`}
              style={{
                width: cellSize,
                height: cellSize,
                left: `calc(${segment.x} * ${cellSize})`,
                top: `calc(${segment.y} * ${cellSize})`,
                opacity: isHead ? 1 : Math.max(0.5, 1 - index * 0.02),
                transform: isHead ? 'scale(1.05)' : 'scale(0.9)',
              }}
            >
              {isHead && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <div className={`w-1.5 h-1.5 bg-white rounded-full ${
                      direction === 'LEFT' ? 'translate-x-[-1px]' :
                      direction === 'RIGHT' ? 'translate-x-[1px]' : ''
                    }`} />
                    <div className={`w-1.5 h-1.5 bg-white rounded-full ${
                      direction === 'RIGHT' ? 'translate-x-[1px]' :
                      direction === 'LEFT' ? 'translate-x-[-1px]' : ''
                    }`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Food */}
        <div
          className="absolute animate-pulse"
          style={{
            width: cellSize,
            height: cellSize,
            left: `calc(${food.x} * ${cellSize})`,
            top: `calc(${food.y} * ${cellSize})`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-[80%] h-[80%] bg-gradient-to-br from-red-400 to-pink-500 rounded-full shadow-lg shadow-red-500/50 animate-bounce" />
          </div>
        </div>

        {/* Overlays */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="text-5xl mb-4 animate-bounce">🐍</div>
            <h2 className="text-2xl font-bold text-white mb-2">贪吃蛇</h2>
            <p className="text-gray-300 text-sm mb-6">按空格键或点击开始</p>
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
            >
              开始游戏
            </button>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="text-4xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-2">游戏暂停</h2>
            <p className="text-gray-300 text-sm mb-6">按空格键继续</p>
            <button
              onClick={() => { setGameState('playing'); lastMoveTimeRef.current = performance.now(); }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-400 hover:to-indigo-500 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              继续游戏
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="text-4xl mb-4">💀</div>
            <h2 className="text-2xl font-bold text-red-400 mb-1">游戏结束</h2>
            <p className="text-white text-lg mb-1">得分: <span className="font-bold text-green-400">{score}</span></p>
            {score >= highScore && score > 0 && (
              <p className="text-yellow-400 text-sm mb-3 animate-pulse">🎉 新纪录!</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={resetGame}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
              >
                再来一局
              </button>
              <button
                onClick={() => setShowDifficultyMenu(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/30"
              >
                切换难度
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-4">
        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => {
              if (gameState === 'playing') {
                setGameState('paused');
              } else if (gameState === 'paused') {
                setGameState('playing');
                lastMoveTimeRef.current = performance.now();
              }
            }}
            disabled={gameState === 'idle' || gameState === 'gameover'}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
          >
            {gameState === 'paused' ? '▶ 继续' : '⏸ 暂停'}
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            🔄 重新开始
          </button>
          <button
            onClick={() => setShowDifficultyMenu(!showDifficultyMenu)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            ⚙️ 难度
          </button>
        </div>

        {/* Difficulty selector */}
        {showDifficultyMenu && (
          <div className="flex justify-center gap-2 mb-4 animate-fade-in">
            {(Object.keys(SPEEDS) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d);
                  setShowDifficultyMenu(false);
                  if (gameState === 'idle') return;
                  resetGame();
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all transform hover:scale-105 ${
                  difficulty === d
                    ? `${DIFFICULTY_COLORS[d]} text-white shadow-lg`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        )}

        {/* Mobile D-pad */}
        <div className="flex flex-col items-center md:hidden mt-2">
          <div className="grid grid-cols-3 gap-1 w-40">
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDirectionButton('UP'); }}
              className="w-12 h-12 bg-gray-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-gray-600 active:scale-95 transition-all mx-auto"
            >
              ↑
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDirectionButton('LEFT'); }}
              className="w-12 h-12 bg-gray-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-gray-600 active:scale-95 transition-all mx-auto"
            >
              ←
            </button>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-500 text-xs mx-auto">
              ●
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDirectionButton('RIGHT'); }}
              className="w-12 h-12 bg-gray-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-gray-600 active:scale-95 transition-all mx-auto"
            >
              →
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDirectionButton('DOWN'); }}
              className="w-12 h-12 bg-gray-700/80 rounded-lg flex items-center justify-center text-white text-xl active:bg-gray-600 active:scale-95 transition-all mx-auto"
            >
              ↓
            </button>
            <div />
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-500 text-xs mt-4 space-y-1">
          <p className="hidden md:block">方向键 / WASD 控制方向 · 空格键暂停/继续</p>
          <p className="md:hidden">滑动屏幕控制方向 · 使用下方方向键</p>
        </div>
      </div>
    </div>
  );
}

export default App;
