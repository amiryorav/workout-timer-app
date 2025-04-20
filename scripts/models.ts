/**
 * Step interface representing an exercise or rest period
 */
export interface Step {
  /** Type of step: 'exercise' or 'rest' */
  type: 'exercise' | 'rest';
  
  /** Name of the step (e.g., "Push-ups", "Rest") */
  name: string;
  
  /** Duration in seconds */
  duration: number;
}

/**
 * Workout interface representing a complete workout routine
 */
export interface Workout {
  /** Unique identifier for the workout */
  id?: string;
  
  /** Name of the workout (e.g., "Upper Body", "Leg Day") */
  name: string;
  
  /** Number of times to repeat the main sequence */
  sets: number;
  
  /** Rest duration in seconds between sets */
  breakBetweenSets: number;
  
  /** Warmup exercises before the main sequence */
  warmup: Step[];
  
  /** Main sequence of exercises and rest periods */
  sequence: Step[];
  
  /** Cooldown exercises after the main sequence */
  cooldown: Step[];
}

/**
 * TimerState enum for tracking the current state of the timer
 */
export enum TimerState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

/**
 * PhaseType enum representing the different phases of a workout
 */
export enum PhaseType {
  WARMUP = 'warmup',
  EXERCISE = 'exercise',
  REST = 'rest',
  BREAK = 'break',
  COOLDOWN = 'cooldown'
}

/**
 * Phase interface representing the current active phase in a workout
 */
export interface Phase {
  /** Type of the phase */
  type: PhaseType;
  
  /** Name of the current step */
  name: string;
  
  /** Total duration of the phase in seconds */
  totalDuration: number;
  
  /** Remaining time in seconds */
  remainingTime: number;
  
  /** Current set number (1-based) */
  currentSet: number;
  
  /** Total number of sets */
  totalSets: number;
  
  /** Index of the current step within its section */
  stepIndex: number;
}

/**
 * AppState interface representing the global application state
 */
export interface AppState {
  /** Currently loaded workout */
  currentWorkout: Workout | null;
  
  /** Current state of the timer */
  timerState: TimerState;
  
  /** Current active phase information */
  currentPhase: Phase | null;
  
  /** Whether the app is in preview mode */
  isPreviewMode: boolean;
  
  /** Whether the sounds are enabled */
  soundEnabled: boolean;
  
  /** Sound volume (0-1) */
  soundVolume: number;
  
  /** Whether the app is in dark mode */
  darkMode: boolean;
}

/**
 * Creates a new empty workout with default values
 */
export function createEmptyWorkout(): Workout {
  return {
    id: generateId(),
    name: '',
    sets: 3,
    breakBetweenSets: 60,
    warmup: [],
    sequence: [],
    cooldown: []
  };
}

/**
 * Generates a random ID for a workout
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
} 