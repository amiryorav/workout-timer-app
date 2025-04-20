import { Workout, createEmptyWorkout } from './models';

/**
 * Storage key prefix for workouts in localStorage
 */
const STORAGE_KEY_PREFIX = 'workout_timer_';

/**
 * Key to store the list of workout IDs
 */
const WORKOUT_IDS_KEY = 'workout_timer_ids';

/**
 * Interface for the storage service
 */
export interface StorageService {
  /**
   * Save a workout to storage
   * @param workout Workout to save
   * @returns Promise that resolves when workout is saved
   */
  saveWorkout(workout: Workout): Promise<Workout>;
  
  /**
   * Get a workout by ID
   * @param id Workout ID
   * @returns Promise that resolves with the workout or null if not found
   */
  getWorkout(id: string): Promise<Workout | null>;
  
  /**
   * Get list of all saved workouts
   * @returns Promise that resolves with an array of workouts
   */
  getAllWorkouts(): Promise<Workout[]>;
  
  /**
   * Delete a workout by ID
   * @param id Workout ID
   * @returns Promise that resolves when workout is deleted
   */
  deleteWorkout(id: string): Promise<void>;
  
  /**
   * Export all workouts as JSON string
   * @returns Promise that resolves with JSON string
   */
  exportWorkouts(): Promise<string>;
  
  /**
   * Import workouts from JSON string
   * @param json JSON string containing workouts
   * @returns Promise that resolves with array of imported workouts
   */
  importWorkouts(json: string): Promise<Workout[]>;
}

/**
 * Local storage implementation of StorageService
 */
class LocalStorageService implements StorageService {
  /**
   * Save workout to localStorage
   */
  async saveWorkout(workout: Workout): Promise<Workout> {
    // Make sure workout has an ID
    if (!workout.id) {
      workout.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    try {
      // Save workout to localStorage
      localStorage.setItem(STORAGE_KEY_PREFIX + workout.id, JSON.stringify(workout));
      
      // Update the list of workout IDs
      const ids = this.getWorkoutIds();
      if (!ids.includes(workout.id)) {
        ids.push(workout.id);
        localStorage.setItem(WORKOUT_IDS_KEY, JSON.stringify(ids));
      }
      
      return workout;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw new Error('Failed to save workout');
    }
  }
  
  /**
   * Get workout from localStorage
   */
  async getWorkout(id: string): Promise<Workout | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + id);
      if (!data) return null;
      
      return JSON.parse(data) as Workout;
    } catch (error) {
      console.error('Error loading workout:', error);
      return null;
    }
  }
  
  /**
   * Get all workouts from localStorage
   */
  async getAllWorkouts(): Promise<Workout[]> {
    try {
      const ids = this.getWorkoutIds();
      const workouts: Workout[] = [];
      
      // Load each workout by ID
      for (const id of ids) {
        const workout = await this.getWorkout(id);
        if (workout) {
          workouts.push(workout);
        }
      }
      
      return workouts;
    } catch (error) {
      console.error('Error loading workouts:', error);
      return [];
    }
  }
  
  /**
   * Delete workout from localStorage
   */
  async deleteWorkout(id: string): Promise<void> {
    try {
      // Remove workout data
      localStorage.removeItem(STORAGE_KEY_PREFIX + id);
      
      // Update the list of IDs
      const ids = this.getWorkoutIds();
      const updatedIds = ids.filter(workoutId => workoutId !== id);
      localStorage.setItem(WORKOUT_IDS_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw new Error('Failed to delete workout');
    }
  }
  
  /**
   * Export all workouts to JSON
   */
  async exportWorkouts(): Promise<string> {
    try {
      const workouts = await this.getAllWorkouts();
      return JSON.stringify(workouts, null, 2);
    } catch (error) {
      console.error('Error exporting workouts:', error);
      throw new Error('Failed to export workouts');
    }
  }
  
  /**
   * Import workouts from JSON
   */
  async importWorkouts(json: string): Promise<Workout[]> {
    try {
      const workouts = JSON.parse(json) as Workout[];
      
      // Validate each workout
      if (!Array.isArray(workouts)) {
        throw new Error('Invalid JSON format: expected an array');
      }
      
      const importedWorkouts: Workout[] = [];
      
      for (const workout of workouts) {
        // Validate workout
        if (!this.isValidWorkout(workout)) {
          console.warn('Skipping invalid workout:', workout);
          continue;
        }
        
        // Generate a new ID to avoid conflicts
        workout.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        
        // Save the workout
        await this.saveWorkout(workout);
        importedWorkouts.push(workout);
      }
      
      return importedWorkouts;
    } catch (error) {
      console.error('Error importing workouts:', error);
      throw new Error('Failed to import workouts: ' + (error as Error).message);
    }
  }
  
  /**
   * Get list of workout IDs from localStorage
   */
  private getWorkoutIds(): string[] {
    try {
      const data = localStorage.getItem(WORKOUT_IDS_KEY);
      if (!data) return [];
      
      return JSON.parse(data) as string[];
    } catch (error) {
      console.error('Error loading workout IDs:', error);
      return [];
    }
  }
  
  /**
   * Validate workout object
   */
  private isValidWorkout(workout: any): workout is Workout {
    return (
      workout &&
      typeof workout.name === 'string' &&
      typeof workout.sets === 'number' &&
      typeof workout.breakBetweenSets === 'number' &&
      Array.isArray(workout.warmup) &&
      Array.isArray(workout.sequence) &&
      Array.isArray(workout.cooldown)
    );
  }
}

// Export singleton instance
export const storageService: StorageService = new LocalStorageService(); 