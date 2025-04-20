import { Workout, Phase, PhaseType, TimerState } from './models';
import { appStore, stateActions } from './state';
import { audioController, SoundType } from './audio';

/**
 * Interface for timer controller events
 */
interface TimerEvents {
  onTick: (phase: Phase) => void;
  onPhaseStart: (phase: Phase) => void;
  onPhaseEnd: (phase: Phase) => void;
  onComplete: () => void;
  onCountdown: (secondsLeft: number) => void;
}

/**
 * Timer controller to manage workout timing with drift compensation
 */
export class TimerController {
  // The workout being controlled
  private workout: Workout;
  
  // Current state
  private currentPhase: Phase | null = null;
  private timerState: TimerState = TimerState.IDLE;
  
  // Animation frame request ID for cancellation
  private animationFrameId: number | null = null;
  
  // Timing variables
  private startTime: number | null = null;
  private pauseTime: number | null = null;
  private pausedDuration: number = 0;
  
  // Workout sequence data
  private sequence: Phase[] = [];
  private currentPhaseIndex: number = 0;
  
  // Event callbacks
  private events: Partial<TimerEvents> = {};
  
  /**
   * Create a new timer controller
   * @param workout The workout to control
   */
  constructor(workout: Workout) {
    this.workout = workout;
    this.buildSequence();
  }
  
  /**
   * Start or resume the timer
   */
  start(): void {
    // If already running, do nothing
    if (this.timerState === TimerState.RUNNING) return;
    
    // Update state based on current state
    if (this.timerState === TimerState.IDLE) {
      // Starting from the beginning
      if (this.sequence.length === 0) return;
      
      this.startTime = performance.now();
      this.pausedDuration = 0;
      this.currentPhaseIndex = 0;
      this.currentPhase = { ...this.sequence[0] };
      
      // Fire phase start event
      this.fireEvent('onPhaseStart', this.currentPhase);
      
      // Play appropriate sound based on phase type
      this.playPhaseStartSound(this.currentPhase);
    } else if (this.timerState === TimerState.PAUSED) {
      // Resuming from pause
      if (this.pauseTime && this.currentPhase) {
        this.pausedDuration += performance.now() - this.pauseTime;
        this.pauseTime = null;
      }
    }
    
    // Update state and start animation loop
    this.timerState = TimerState.RUNNING;
    stateActions.setTimerState(TimerState.RUNNING);
    
    // Start animation frame loop
    this.tick();
  }
  
  /**
   * Pause the timer
   */
  pause(): void {
    if (this.timerState !== TimerState.RUNNING) return;
    
    // Update state
    this.timerState = TimerState.PAUSED;
    stateActions.setTimerState(TimerState.PAUSED);
    
    // Record pause time for calculating paused duration
    this.pauseTime = performance.now();
    
    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Reset the timer to initial state
   */
  reset(): void {
    // Cancel any ongoing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset state
    this.timerState = TimerState.IDLE;
    stateActions.setTimerState(TimerState.IDLE);
    this.startTime = null;
    this.pauseTime = null;
    this.pausedDuration = 0;
    this.currentPhaseIndex = 0;
    
    // Reset current phase to first in sequence
    if (this.sequence.length > 0) {
      this.currentPhase = { ...this.sequence[0] };
      stateActions.setCurrentPhase(this.currentPhase);
    } else {
      this.currentPhase = null;
      stateActions.setCurrentPhase(null);
    }
  }
  
  /**
   * Skip to the next phase
   */
  skipNext(): void {
    if (this.currentPhaseIndex >= this.sequence.length - 1) {
      // Already at the end, complete the workout
      this.complete();
      return;
    }
    
    // Move to next phase
    this.currentPhaseIndex++;
    this.currentPhase = { ...this.sequence[this.currentPhaseIndex] };
    stateActions.setCurrentPhase(this.currentPhase);
    
    // Reset timing variables
    if (this.timerState === TimerState.RUNNING) {
      this.startTime = performance.now();
      this.pausedDuration = 0;
      this.pauseTime = null;
      
      // Fire phase start event
      this.fireEvent('onPhaseStart', this.currentPhase);
      
      // Play appropriate sound
      this.playPhaseStartSound(this.currentPhase);
    }
  }
  
  /**
   * Skip to the previous phase
   */
  skipPrev(): void {
    if (this.currentPhaseIndex <= 0) {
      // Already at the beginning, just reset the current phase
      if (this.sequence.length > 0) {
        this.currentPhase = { ...this.sequence[0] };
        stateActions.setCurrentPhase(this.currentPhase);
        
        // Reset timing variables
        if (this.timerState === TimerState.RUNNING) {
          this.startTime = performance.now();
          this.pausedDuration = 0;
          this.pauseTime = null;
          
          // Fire phase start event
          this.fireEvent('onPhaseStart', this.currentPhase);
          
          // Play appropriate sound
          this.playPhaseStartSound(this.currentPhase);
        }
      }
      return;
    }
    
    // Move to previous phase
    this.currentPhaseIndex--;
    this.currentPhase = { ...this.sequence[this.currentPhaseIndex] };
    stateActions.setCurrentPhase(this.currentPhase);
    
    // Reset timing variables
    if (this.timerState === TimerState.RUNNING) {
      this.startTime = performance.now();
      this.pausedDuration = 0;
      this.pauseTime = null;
      
      // Fire phase start event
      this.fireEvent('onPhaseStart', this.currentPhase);
      
      // Play appropriate sound
      this.playPhaseStartSound(this.currentPhase);
    }
  }
  
  /**
   * Update the workout
   * @param workout New workout to use
   */
  updateWorkout(workout: Workout): void {
    this.workout = workout;
    this.buildSequence();
    this.reset();
  }
  
  /**
   * Register event handlers
   * @param events Object containing event handler functions
   */
  on(events: Partial<TimerEvents>): void {
    this.events = { ...this.events, ...events };
  }
  
  /**
   * Main timer tick function
   * Uses requestAnimationFrame for more accurate timing
   */
  private tick = (): void => {
    if (this.timerState !== TimerState.RUNNING || !this.startTime || !this.currentPhase) {
      return;
    }
    
    // Calculate elapsed time with drift compensation
    const now = performance.now();
    const elapsed = (now - this.startTime - this.pausedDuration) / 1000;
    
    // Update remaining time
    const totalDuration = this.currentPhase.totalDuration;
    const remainingTime = Math.max(0, totalDuration - elapsed);
    
    // Update phase with new remaining time
    const updatedPhase: Phase = {
      ...this.currentPhase,
      remainingTime
    };
    
    this.currentPhase = updatedPhase;
    stateActions.setCurrentPhase(updatedPhase);
    
    // Fire tick event
    this.fireEvent('onTick', updatedPhase);
    
    // Check for countdown (last 3 seconds)
    const countdownThreshold = 3;
    if (
      Math.ceil(remainingTime) <= countdownThreshold && 
      Math.ceil(remainingTime) > 0 &&
      Math.ceil(remainingTime) !== Math.ceil(this.currentPhase.remainingTime)
    ) {
      this.fireEvent('onCountdown', Math.ceil(remainingTime));
      
      // Play countdown sound
      audioController.play(SoundType.COUNTDOWN);
    }
    
    // Check if phase has completed
    if (remainingTime <= 0) {
      // Fire phase end event
      this.fireEvent('onPhaseEnd', updatedPhase);
      
      // Move to next phase or complete
      if (this.currentPhaseIndex < this.sequence.length - 1) {
        this.skipNext();
      } else {
        this.complete();
        return;
      }
    }
    
    // Continue animation loop
    this.animationFrameId = requestAnimationFrame(this.tick);
  }
  
  /**
   * Mark the workout as complete
   */
  private complete(): void {
    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Update state
    this.timerState = TimerState.COMPLETED;
    stateActions.setTimerState(TimerState.COMPLETED);
    
    // Fire complete event
    this.fireEvent('onComplete');
    
    // Play completion sound
    audioController.play(SoundType.COMPLETE);
  }
  
  /**
   * Build the full sequence of phases from the workout
   */
  private buildSequence(): void {
    this.sequence = [];
    
    // Add warmup phases
    this.addSectionToSequence(this.workout.warmup, PhaseType.WARMUP, 1, 1);
    
    // Add main sequence phases (repeated for each set)
    for (let set = 1; set <= this.workout.sets; set++) {
      // Add exercise/rest phases for this set
      this.addSectionToSequence(this.workout.sequence, PhaseType.EXERCISE, set, this.workout.sets);
      
      // Add break between sets (except after the last set)
      if (set < this.workout.sets && this.workout.breakBetweenSets > 0) {
        this.sequence.push({
          type: PhaseType.BREAK,
          name: 'Break',
          totalDuration: this.workout.breakBetweenSets,
          remainingTime: this.workout.breakBetweenSets,
          currentSet: set,
          totalSets: this.workout.sets,
          stepIndex: -1
        });
      }
    }
    
    // Add cooldown phases
    this.addSectionToSequence(this.workout.cooldown, PhaseType.COOLDOWN, 1, 1);
  }
  
  /**
   * Add a section of steps to the sequence
   * @param steps Array of steps to add
   * @param defaultPhaseType Default phase type if not specified in step
   * @param currentSet Current set number
   * @param totalSets Total number of sets
   */
  private addSectionToSequence(
    steps: { type: string; name: string; duration: number }[],
    defaultPhaseType: PhaseType,
    currentSet: number,
    totalSets: number
  ): void {
    steps.forEach((step, index) => {
      const phaseType = step.type === 'rest' ? PhaseType.REST : defaultPhaseType;
      
      this.sequence.push({
        type: phaseType,
        name: step.name,
        totalDuration: step.duration,
        remainingTime: step.duration,
        currentSet,
        totalSets,
        stepIndex: index
      });
    });
  }
  
  /**
   * Fire an event if a handler is registered
   * @param eventName Name of the event to fire
   * @param args Arguments to pass to the event handler
   */
  private fireEvent<T extends keyof TimerEvents>(
    eventName: T,
    ...args: Parameters<TimerEvents[T]>
  ): void {
    const handler = this.events[eventName];
    if (handler) {
      (handler as Function)(...args);
    }
  }
  
  /**
   * Play the appropriate sound based on phase type
   * @param phase Current phase
   */
  private playPhaseStartSound(phase: Phase): void {
    switch (phase.type) {
      case PhaseType.EXERCISE:
      case PhaseType.WARMUP:
      case PhaseType.COOLDOWN:
        audioController.play(SoundType.EXERCISE_START);
        break;
      case PhaseType.REST:
        audioController.play(SoundType.REST_START);
        break;
      case PhaseType.BREAK:
        audioController.play(SoundType.BREAK_START);
        break;
    }
  }
} 