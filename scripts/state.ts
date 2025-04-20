import { AppState, TimerState, Phase, Workout } from './models';

/**
 * Observer interface for store subscribers
 */
interface Observer<T> {
  update: (state: T) => void;
}

/**
 * Observable Store to manage application state with pub/sub pattern
 */
class Store<T> {
  private state: T;
  private observers: Observer<T>[] = [];

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * Get the current state (immutable)
   */
  getState(): T {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   * @param observer Observer object with update method
   * @returns Function to unsubscribe
   */
  subscribe(observer: Observer<T>): () => void {
    this.observers.push(observer);
    
    // Return unsubscribe function
    return () => {
      this.observers = this.observers.filter(obs => obs !== observer);
    };
  }

  /**
   * Update state and notify observers
   * @param partialState Partial state to update
   */
  setState(partialState: Partial<T>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyObservers();
  }

  /**
   * Notify all observers of state change
   */
  private notifyObservers(): void {
    for (const observer of this.observers) {
      observer.update(this.getState());
    }
  }
}

// Create initial application state
const initialState: AppState = {
  currentWorkout: null,
  timerState: TimerState.IDLE,
  currentPhase: null,
  isPreviewMode: false,
  soundEnabled: true,
  soundVolume: 0.8,
  darkMode: false
};

// Create application store
export const appStore = new Store<AppState>(initialState);

// Helper functions to update specific parts of the state
export const stateActions = {
  /**
   * Set the current workout
   */
  setCurrentWorkout(workout: Workout | null): void {
    appStore.setState({ currentWorkout: workout });
  },

  /**
   * Set the timer state
   */
  setTimerState(timerState: TimerState): void {
    appStore.setState({ timerState });
  },

  /**
   * Set the current phase
   */
  setCurrentPhase(phase: Phase | null): void {
    appStore.setState({ currentPhase: phase });
  },

  /**
   * Set preview mode
   */
  setPreviewMode(isPreviewMode: boolean): void {
    appStore.setState({ isPreviewMode });
  },

  /**
   * Toggle sound enabled
   */
  toggleSound(enabled?: boolean): void {
    const currentState = appStore.getState();
    const newValue = enabled !== undefined ? enabled : !currentState.soundEnabled;
    appStore.setState({ soundEnabled: newValue });
  },

  /**
   * Set sound volume
   */
  setSoundVolume(volume: number): void {
    appStore.setState({ soundVolume: Math.max(0, Math.min(1, volume)) });
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode(enabled?: boolean): void {
    const currentState = appStore.getState();
    const newValue = enabled !== undefined ? enabled : !currentState.darkMode;
    appStore.setState({ darkMode: newValue });
    
    // Update body class to trigger CSS changes
    if (newValue) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  },

  /**
   * Reset the state to initial values
   */
  resetState(): void {
    appStore.setState(initialState);
  }
}; 