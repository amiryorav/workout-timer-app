import { appStore, stateActions } from './state';
import { TimerController } from './timerController';
import { TimerState } from './models';
import { formatTime, requestWakeLock, releaseWakeLock, showConfirmDialog } from './utils';
import { audioController, SoundType } from './audio';

/**
 * Player UI controller for the workout timer
 */
export class PlayerUI {
  // DOM elements
  private playerScreen: HTMLElement;
  private homeScreen: HTMLElement;
  private phaseNameElement: HTMLElement;
  private timerDisplayElement: HTMLElement;
  private progressBarElement: HTMLElement;
  private currentSetElement: HTMLElement;
  private totalSetsElement: HTMLElement;
  private playPauseButton: HTMLElement;
  private volumeToggle: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private darkModeToggle: HTMLInputElement;
  
  // Timer controller
  private timerController: TimerController | null = null;
  
  // Current phase for countdown comparison
  private currentPhase: any = null;
  
  // Wake lock sentinel
  private wakeLock: any = null;
  
  // Countdown threshold in seconds
  private countdownThreshold: number = 3;
  
  /**
   * Initialize the player UI
   */
  constructor() {
    // Get DOM elements
    this.playerScreen = document.getElementById('player-screen')!;
    this.homeScreen = document.getElementById('home-screen')!;
    this.phaseNameElement = document.getElementById('phase-name')!;
    this.timerDisplayElement = document.getElementById('timer-display')!;
    this.progressBarElement = document.getElementById('progress-bar')!;
    this.currentSetElement = document.getElementById('current-set')!;
    this.totalSetsElement = document.getElementById('total-sets')!;
    this.playPauseButton = document.getElementById('play-pause')!;
    this.volumeToggle = document.getElementById('volume-toggle') as HTMLInputElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.darkModeToggle = document.getElementById('dark-mode-toggle') as HTMLInputElement;
    
    // Initialize UI elements from state
    this.initFromState();
    
    // Add event listeners
    this.addEventListeners();
    
    // Subscribe to state changes
    this.subscribeToStateChanges();
  }
  
  /**
   * Add event listeners to UI elements
   */
  private addEventListeners(): void {
    // Play/Pause button
    document.getElementById('play-pause')!.addEventListener('click', () => {
      this.togglePlayPause();
    });
    
    // Skip backward button
    document.getElementById('prev-step')!.addEventListener('click', () => {
      if (this.timerController) {
        this.timerController.skipPrev();
      }
    });
    
    // Skip forward button
    document.getElementById('next-step')!.addEventListener('click', () => {
      if (this.timerController) {
        this.timerController.skipNext();
      }
    });
    
    // Restart button
    document.getElementById('restart')!.addEventListener('click', async () => {
      if (this.timerController) {
        const confirmed = await showConfirmDialog(
          'Restart the workout?',
          'Restart',
          'Cancel'
        );
        
        if (confirmed) {
          this.timerController.reset();
          this.updatePlayPauseButton(false);
        }
      }
    });
    
    // Back to home button
    document.getElementById('back-to-home')!.addEventListener('click', async () => {
      const state = appStore.getState();
      
      // Show confirmation dialog if timer is running
      if (state.timerState === TimerState.RUNNING) {
        const confirmed = await showConfirmDialog(
          'Exit workout? Your progress will be lost.',
          'Exit',
          'Stay'
        );
        
        if (!confirmed) return;
      }
      
      // Release wake lock
      this.releaseWakeLock();
      
      // Reset timer state
      if (this.timerController) {
        this.timerController.reset();
      }
      
      // Switch back to home screen
      this.showHomeScreen();
    });
    
    // Sound toggle
    this.volumeToggle.addEventListener('change', () => {
      stateActions.toggleSound(this.volumeToggle.checked);
    });
    
    // Volume slider
    this.volumeSlider.addEventListener('input', () => {
      const volume = parseInt(this.volumeSlider.value) / 100;
      stateActions.setSoundVolume(volume);
    });
    
    // Dark mode toggle
    this.darkModeToggle.addEventListener('change', () => {
      stateActions.toggleDarkMode(this.darkModeToggle.checked);
    });
    
    // Handle visibility change to adjust for background tab throttling
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Resume audio context if suspended
        audioController.resumeAudioContext();
      }
    });
  }
  
  /**
   * Subscribe to app state changes
   */
  private subscribeToStateChanges(): void {
    appStore.subscribe({
      update: (state) => {
        // Update sound settings
        this.volumeToggle.checked = state.soundEnabled;
        this.volumeSlider.value = String(state.soundVolume * 100);
        
        // Update dark mode toggle
        this.darkModeToggle.checked = state.darkMode;
        
        // Update phase display if phase changed
        if (state.currentPhase) {
          this.updatePhaseDisplay(state.currentPhase);
        }
        
        // Update play/pause button state
        this.updatePlayPauseButton(state.timerState === TimerState.RUNNING);
      }
    });
  }
  
  /**
   * Initialize UI elements from current state
   */
  private initFromState(): void {
    const state = appStore.getState();
    
    // Set initial values for sound controls
    this.volumeToggle.checked = state.soundEnabled;
    this.volumeSlider.value = String(state.soundVolume * 100);
    
    // Set initial dark mode state
    this.darkModeToggle.checked = state.darkMode;
    if (state.darkMode) {
      document.body.classList.add('dark-mode');
    }
  }
  
  /**
   * Update the phase display with current phase information
   * @param phase Current phase
   */
  private updatePhaseDisplay(phase: any): void {
    // Update current phase reference
    this.currentPhase = phase;
    
    // Update phase name
    this.phaseNameElement.textContent = phase.name;
    
    // Update timer display
    this.timerDisplayElement.textContent = formatTime(phase.remainingTime);
    
    // Update progress bar
    const progressPercent = Math.max(0, Math.min(100, 
      (1 - (phase.remainingTime / phase.totalDuration)) * 100
    ));
    this.progressBarElement.style.width = `${progressPercent}%`;
    
    // Update set counter
    this.currentSetElement.textContent = String(phase.currentSet);
    this.totalSetsElement.textContent = String(phase.totalSets);
  }
  
  /**
   * Update the play/pause button state
   * @param isPlaying Whether the timer is currently running
   */
  private updatePlayPauseButton(isPlaying: boolean): void {
    const iconElement = this.playPauseButton.querySelector('.icon')!;
    iconElement.textContent = isPlaying ? '⏸' : '▶';
  }
  
  /**
   * Toggle between play and pause states
   */
  private togglePlayPause(): void {
    const state = appStore.getState();
    
    if (!this.timerController) return;
    
    if (state.timerState === TimerState.RUNNING) {
      this.timerController.pause();
      this.releaseWakeLock();
    } else {
      this.timerController.start();
      this.acquireWakeLock();
    }
  }
  
  /**
   * Start a workout
   * @param workout Workout to start
   */
  startWorkout(workout: any): void {
    // Create new timer controller for this workout
    this.timerController = new TimerController(workout);
    
    // Register event handlers
    this.timerController.on({
      onTick: (phase) => {
        this.updatePhaseDisplay(phase);
        this.checkForCountdown(phase);
      },
      onComplete: () => {
        this.releaseWakeLock();
        this.complete();
      }
    });
    
    // Initialize timer state
    this.timerController.reset();
    
    // Update UI with initial state
    if (workout.warmup.length + workout.sequence.length + workout.cooldown.length > 0) {
      this.showPlayerScreen();
    }
  }
  
  /**
   * Check if we need to play countdown sound
   * @param phase Current phase
   */
  private checkForCountdown(phase: any): void {
    if (
      Math.ceil(phase.remainingTime) <= this.countdownThreshold && 
      Math.ceil(phase.remainingTime) > 0 &&
      (!this.currentPhase || Math.ceil(phase.remainingTime) !== Math.ceil(this.currentPhase.remainingTime))
    ) {
      audioController.play(SoundType.COUNTDOWN);
    }
  }
  
  /**
   * Show the player screen and hide the home screen
   */
  private showPlayerScreen(): void {
    this.homeScreen.classList.add('hidden');
    this.playerScreen.classList.remove('hidden');
  }
  
  /**
   * Show the home screen and hide the player screen
   */
  private showHomeScreen(): void {
    this.playerScreen.classList.add('hidden');
    this.homeScreen.classList.remove('hidden');
  }
  
  /**
   * Acquire a wake lock to prevent the screen from sleeping
   */
  private async acquireWakeLock(): Promise<void> {
    // Release any existing wake lock
    await this.releaseWakeLock();
    
    // Try to acquire a new wake lock
    this.wakeLock = await requestWakeLock();
  }
  
  /**
   * Release the wake lock
   */
  private async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      await releaseWakeLock(this.wakeLock);
      this.wakeLock = null;
    }
  }
  
  /**
   * Handle workout completion
   */
  private complete(): void {
    audioController.play(SoundType.COMPLETE);
  }
}

// Create and export singleton instance
export const playerUI = new PlayerUI(); 