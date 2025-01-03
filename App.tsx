import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: Direction;
  nextDirection: Direction;
  isGameOver: boolean;
  score: number;
  gameLoop: NodeJS.Timer | null;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Constants
const GRID_SIZE = 15;
const CELL_SIZE = Math.floor(Dimensions.get('window').width * 0.9 / GRID_SIZE);
const INITIAL_SNAKE: Position[] = [
  { x: 3, y: 3 }, // head
  { x: 2, y: 3 }, // body
  { x: 1, y: 3 }, // tail
];
const GAME_SPEED = 200;

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export default function SnakeGame() {
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>({
    snake: [...INITIAL_SNAKE],
    food: generateFood(INITIAL_SNAKE),
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    isGameOver: true,
    score: 0,
    gameLoop: null,
  });

  useEffect(() => {
    loadHighScore();
    return () => {
      if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
      }
    };
  }, []);

  const loadHighScore = async () => {
    try {
      const savedScore = await AsyncStorage.getItem('snakeHighScore');
      if (savedScore) {
        setHighScore(parseInt(savedScore));
      }
    } catch (error) {
      console.error('Error loading high score:', error);
    }
  };

  const saveHighScore = async (score: number) => {
    try {
      await AsyncStorage.setItem('snakeHighScore', score.toString());
      setHighScore(score);
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  };

  function generateFood(snake: Position[]): Position {
    let food: Position;
    do {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    return food;
  }

  const moveSnake = useCallback(() => {
    setGameState(prevState => {
      if (prevState.isGameOver) return prevState;

      const snake = [...prevState.snake];
      const head = snake[0];
      const direction = prevState.nextDirection;
      
      // Calculate new head position
      const newHead: Position = {
        x: head.x + DIRECTIONS[direction].x,
        y: head.y + DIRECTIONS[direction].y,
      };

      // Check for collisions with walls
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        return { ...prevState, isGameOver: true };
      }

      // Check for collisions with self (excluding the tail which will move)
      if (snake.slice(0, -1).some(segment => 
        segment.x === newHead.x && segment.y === newHead.y
      )) {
        return { ...prevState, isGameOver: true };
      }

      // Add new head to snake
      snake.unshift(newHead);

      // Check if food is eaten
      let food = prevState.food;
      let score = prevState.score;
      
      if (newHead.x === food.x && newHead.y === food.y) {
        // Don't remove tail if food is eaten
        food = generateFood(snake);
        score += 10;
      } else {
        // Remove tail if no food is eaten
        snake.pop();
      }

      return {
        ...prevState,
        snake,
        food,
        score,
        direction: direction,
      };
    });
  }, []);

  const startGame = () => {
    const loop = setInterval(moveSnake, GAME_SPEED);
    setGameState({
      snake: [...INITIAL_SNAKE],
      food: generateFood(INITIAL_SNAKE),
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      isGameOver: false,
      score: 0,
      gameLoop: loop,
    });
  };

  const handleDirection = (newDirection: Direction) => {
    // Prevent 180-degree turns
    const invalidMoves = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    
    setGameState(prevState => {
      if (invalidMoves[newDirection] === prevState.direction) {
        return prevState;
      }
      
      return {
        ...prevState,
        nextDirection: newDirection,
      };
    });
  };

  const renderCell = (x: number, y: number) => {
    const isSnake = gameState.snake.some(segment => segment.x === x && segment.y === y);
    const isSnakeHead = gameState.snake[0].x === x && gameState.snake[0].y === y;
    const isFood = gameState.food.x === x && gameState.food.y === y;

    return (
      <View
        key={`${x}-${y}`}
        style={[
          styles.cell,
          isSnake && styles.snakeCell,
          isSnakeHead && styles.snakeHead,
          isFood && styles.foodCell,
        ]}
      />
    );
  };

  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(renderCell(x, y));
      }
      grid.push(
        <View key={y} style={styles.row}>
          {row}
        </View>
      );
    }
    return grid;
  };

  useEffect(() => {
    if (gameState.isGameOver) {
      if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
      }
      if (gameState.score > highScore) {
        saveHighScore(gameState.score);
        Alert.alert('New High Score!', `Score: ${gameState.score}`);
      }
    }
  }, [gameState.isGameOver]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Snake Game</Text>
      <Text style={styles.score}>Score: {gameState.score}</Text>
      <Text style={styles.score}>High Score: {highScore}</Text>

      <View style={styles.gridContainer}>
        {renderGrid()}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.upButton]}
          onPress={() => handleDirection('UP')}
        >
          <Text style={styles.buttonText}>⬆️</Text>
        </TouchableOpacity>
        <View style={styles.horizontalControls}>
          <TouchableOpacity
            style={[styles.button, styles.leftButton]}
            onPress={() => handleDirection('LEFT')}
          >
            <Text style={styles.buttonText}>⬅️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.rightButton]}
            onPress={() => handleDirection('RIGHT')}
          >
            <Text style={styles.buttonText}>➡️</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.downButton]}
          onPress={() => handleDirection('DOWN')}
        >
          <Text style={styles.buttonText}>⬇️</Text>
        </TouchableOpacity>
      </View>

      {gameState.isGameOver && (
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>
            {gameState.score > 0 ? 'Play Again' : 'Start Game'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  score: {
    fontSize: 18,
    marginBottom: 10,
  },
  gridContainer: {
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  snakeCell: {
    backgroundColor: '#4CAF50',
  },
  snakeHead: {
    backgroundColor: '#388E3C',
  },
  foodCell: {
    backgroundColor: '#F44336',
    borderRadius: CELL_SIZE / 2,
  },
  controls: {
    marginTop: 20,
    alignItems: 'center',
  },
  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
  },
  button: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 30,
    margin: 5,
  },
  buttonText: {
    fontSize: 24,
  },
  upButton: {
    marginBottom: 10,
  },
  downButton: {
    marginTop: 10,
  },
  leftButton: {
    marginRight: 10,
  },
  rightButton: {
    marginLeft: 10,
  },
  startButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});