import { appStore } from './state';

/**
 * Available sound types
 */
export enum SoundType {
  EXERCISE_START = 'exercise_start',
  REST_START = 'rest_start',
  BREAK_START = 'break_start',
  COUNTDOWN = 'countdown',
  COMPLETE = 'complete'
}

/**
 * Map of sound types to audio file paths
 */
const SOUND_FILES: Record<SoundType, string> = {
  [SoundType.EXERCISE_START]: 'assets/sounds/exercise_start.mp3',
  [SoundType.REST_START]: 'assets/sounds/rest_start.mp3',
  [SoundType.BREAK_START]: 'assets/sounds/break_start.mp3',
  [SoundType.COUNTDOWN]: 'assets/sounds/countdown.mp3',
  [SoundType.COMPLETE]: 'assets/sounds/complete.mp3'
};

/**
 * Audio controller for playing workout sounds
 */
class AudioController {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private audioUnlocked = false;
  private initPromise: Promise<void> | null = null;
  
  /**
   * Initialize the audio context and load sound files
   */
  async initialize(): Promise<void> {
    // If already initializing, return existing promise
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.initializeInternal();
    return this.initPromise;
  }
  
  /**
   * Internal implementation of audio initialization
   */
  private async initializeInternal(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load all audio files
      const loadPromises = Object.entries(SOUND_FILES).map(
        ([type, path]) => this.loadSound(type as SoundType, path)
      );
      
      await Promise.all(loadPromises);
      console.log('All audio files loaded successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }
  
  /**
   * Load a sound file and store its buffer
   */
  private async loadSound(type: SoundType, url: string): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.audioBuffers.set(type, audioBuffer);
    } catch (error) {
      console.error(`Failed to load sound ${type} from ${url}:`, error);
      
      // Create an empty buffer as fallback for failed sounds
      const emptyBuffer = this.audioContext.createBuffer(2, 44100, 44100);
      this.audioBuffers.set(type, emptyBuffer);
    }
  }
  
  /**
   * Play a sound by type
   * @param type The type of sound to play
   */
  async play(type: SoundType): Promise<void> {
    const state = appStore.getState();
    
    // Don't play if sound is disabled
    if (!state.soundEnabled) return;
    
    try {
      // Make sure audio is initialized
      await this.initialize();
      
      // Unlock audio on first user interaction if needed
      if (!this.audioUnlocked) {
        await this.unlockAudio();
      }
      
      if (!this.audioContext) return;
      
      // Get the buffer for this sound type
      const buffer = this.audioBuffers.get(type);
      if (!buffer) {
        console.warn(`Sound ${type} not loaded`);
        return;
      }
      
      // Create and connect source node
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = state.soundVolume;
      
      // Connect nodes and play
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error(`Failed to play sound ${type}:`, error);
    }
  }
  
  /**
   * Unlock audio on first user interaction for mobile browsers
   */
  private async unlockAudio(): Promise<void> {
    if (!this.audioContext || this.audioUnlocked) return;
    
    // Create empty buffer
    const buffer = this.audioContext.createBuffer(1, 1, 22050);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    // Play silent sound to unlock audio
    source.start(0);
    
    this.audioUnlocked = true;
    console.log('Audio unlocked');
  }
  
  /**
   * Resume audio context if suspended
   */
  resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Export singleton instance
export const audioController = new AudioController();

// Generate placeholder audio files for now
// These would be replaced with real audio files later
export function generatePlaceholderAudio(): void {
  console.log('Placeholder audio files would be generated here');
  // In a real implementation, we would generate audio files
  // or use existing ones in the assets/sounds directory
}

// For debugging:
(window as any).audioController = audioController; 