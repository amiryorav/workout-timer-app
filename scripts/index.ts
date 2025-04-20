import { storageService } from './storage';
import { stateActions } from './state';
import { playerUI } from './player';
import { showConfirmDialog, downloadStringAsFile } from './utils';
import { generatePlaceholderAudio } from './audio';

/**
 * Home UI controller for workout listing and management
 */
class HomeUI {
  // DOM elements
  private workoutSelect: HTMLSelectElement;
  private workoutPreview: HTMLElement;
  private exportButton: HTMLButtonElement;
  private deleteButton: HTMLButtonElement;
  private startButton: HTMLButtonElement;
  private importButton: HTMLElement;
  private importFileInput: HTMLInputElement;
  
  /**
   * Initialize the home UI
   */
  constructor() {
    // Get DOM elements
    this.workoutSelect = document.getElementById('workout-select') as HTMLSelectElement;
    this.workoutPreview = document.getElementById('workout-preview') as HTMLElement;
    this.exportButton = document.getElementById('export-workout') as HTMLButtonElement;
    this.deleteButton = document.getElementById('delete-workout') as HTMLButtonElement;
    this.startButton = document.getElementById('start-workout') as HTMLButtonElement;
    this.importButton = document.getElementById('import-workout') as HTMLElement;
    this.importFileInput = document.getElementById('import-file') as HTMLInputElement;
    
    // Initialize event listeners
    this.addEventListeners();
    
    // Load workouts
    this.loadWorkouts();
    
    // Generate placeholder audio for testing
    generatePlaceholderAudio();
  }
  
  /**
   * Add event listeners to UI elements
   */
  private addEventListeners(): void {
    // Workout selection change
    this.workoutSelect.addEventListener('change', () => {
      this.loadSelectedWorkout();
    });
    
    // New workout button
    document.getElementById('new-workout')!.addEventListener('click', () => {
      window.location.href = 'editor.html';
    });
    
    // Start workout button
    this.startButton.addEventListener('click', () => {
      this.startSelectedWorkout();
    });
    
    // Export button
    this.exportButton.addEventListener('click', () => {
      this.exportSelectedWorkout();
    });
    
    // Delete button
    this.deleteButton.addEventListener('click', async () => {
      await this.deleteSelectedWorkout();
    });
    
    // Import button
    this.importButton.addEventListener('click', () => {
      this.importFileInput.click();
    });
    
    // Import file change
    this.importFileInput.addEventListener('change', (event) => {
      this.handleImportFile(event);
    });
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle') as HTMLInputElement;
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', () => {
        stateActions.toggleDarkMode(darkModeToggle.checked);
      });
    }
  }
  
  /**
   * Load all workouts and populate select dropdown
   */
  private async loadWorkouts(): Promise<void> {
    try {
      // Clear previous options
      this.workoutSelect.innerHTML = '<option value="">Select a workout</option>';
      
      // Fetch all workouts
      const workouts = await storageService.getAllWorkouts();
      
      // Sort workouts by name
      workouts.sort((a, b) => a.name.localeCompare(b.name));
      
      // Add each workout to select
      workouts.forEach(workout => {
        const option = document.createElement('option');
        option.value = workout.id || '';
        option.textContent = workout.name;
        this.workoutSelect.appendChild(option);
      });
      
      // Update buttons state
      this.updateButtonsState();
      
      // If there are workouts, load the first one
      if (workouts.length > 0) {
        this.workoutSelect.selectedIndex = 1; // First workout after the placeholder
        this.loadSelectedWorkout();
      } else {
        this.workoutPreview.innerHTML = '<p class="text-center">No workouts found. Create a new workout to get started.</p>';
      }
    } catch (error) {
      console.error('Failed to load workouts:', error);
      this.workoutPreview.innerHTML = '<p class="text-center text-error">Failed to load workouts. Please refresh the page and try again.</p>';
    }
  }
  
  /**
   * Load the selected workout and show preview
   */
  private async loadSelectedWorkout(): Promise<void> {
    const workoutId = this.workoutSelect.value;
    
    // Update buttons state
    this.updateButtonsState();
    
    if (!workoutId) {
      this.workoutPreview.innerHTML = '<p class="text-center">Select a workout to preview</p>';
      return;
    }
    
    try {
      // Fetch workout data
      const workout = await storageService.getWorkout(workoutId);
      
      if (!workout) {
        throw new Error('Workout not found');
      }
      
      // Store in state
      stateActions.setCurrentWorkout(workout);
      
      // Generate preview HTML
      this.workoutPreview.innerHTML = this.generatePreviewHTML(workout);
    } catch (error) {
      console.error('Failed to load workout:', error);
      this.workoutPreview.innerHTML = '<p class="text-center text-error">Failed to load workout details</p>';
    }
  }
  
  /**
   * Start the selected workout
   */
  private async startSelectedWorkout(): Promise<void> {
    const workoutId = this.workoutSelect.value;
    
    if (!workoutId) {
      alert('Please select a workout to start');
      return;
    }
    
    try {
      // Fetch workout data
      const workout = await storageService.getWorkout(workoutId);
      
      if (!workout) {
        throw new Error('Workout not found');
      }
      
      // Store in state
      stateActions.setCurrentWorkout(workout);
      
      // Start the workout in player
      playerUI.startWorkout(workout);
    } catch (error) {
      console.error('Failed to start workout:', error);
      alert('Failed to start workout. Please try again.');
    }
  }
  
  /**
   * Export the selected workout as JSON
   */
  private async exportSelectedWorkout(): Promise<void> {
    const workoutId = this.workoutSelect.value;
    
    if (!workoutId) {
      alert('Please select a workout to export');
      return;
    }
    
    try {
      // Fetch workout data
      const workout = await storageService.getWorkout(workoutId);
      
      if (!workout) {
        throw new Error('Workout not found');
      }
      
      // Convert to JSON
      const json = JSON.stringify([workout], null, 2);
      
      // Download as file
      downloadStringAsFile(json, `${workout.name.replace(/\s+/g, '-').toLowerCase()}-workout.json`);
    } catch (error) {
      console.error('Failed to export workout:', error);
      alert('Failed to export workout. Please try again.');
    }
  }
  
  /**
   * Delete the selected workout
   */
  private async deleteSelectedWorkout(): Promise<void> {
    const workoutId = this.workoutSelect.value;
    
    if (!workoutId) {
      alert('Please select a workout to delete');
      return;
    }
    
    try {
      // Fetch workout data for name
      const workout = await storageService.getWorkout(workoutId);
      
      if (!workout) {
        throw new Error('Workout not found');
      }
      
      // Confirm deletion
      const confirmed = await showConfirmDialog(
        `Are you sure you want to delete '${workout.name}'? This action cannot be undone.`,
        'Delete',
        'Cancel'
      );
      
      if (!confirmed) return;
      
      // Delete the workout
      await storageService.deleteWorkout(workoutId);
      
      // Reload workouts list
      this.loadWorkouts();
      
      // Clear preview
      this.workoutPreview.innerHTML = '<p class="text-center">Select a workout to preview</p>';
    } catch (error) {
      console.error('Failed to delete workout:', error);
      alert('Failed to delete workout. Please try again.');
    }
  }
  
  /**
   * Handle import file selection
   */
  private handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    
    // Check file type
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      input.value = '';
      return;
    }
    
    // Read file
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        
        // Import workouts
        const importedWorkouts = await storageService.importWorkouts(json);
        
        // Reset file input
        input.value = '';
        
        // Reload workouts list
        this.loadWorkouts();
        
        // Show success message
        alert(`Successfully imported ${importedWorkouts.length} workout(s)`);
      } catch (error) {
        console.error('Failed to import workouts:', error);
        alert(`Failed to import workouts: ${(error as Error).message}`);
      }
    };
    
    reader.onerror = () => {
      console.error('Failed to read file');
      alert('Failed to read file. Please try again.');
      input.value = '';
    };
    
    reader.readAsText(file);
  }
  
  /**
   * Update the enabled state of buttons based on selection
   */
  private updateButtonsState(): void {
    const hasSelection = !!this.workoutSelect.value;
    
    this.exportButton.disabled = !hasSelection;
    this.deleteButton.disabled = !hasSelection;
    this.startButton.disabled = !hasSelection;
    
    // Apply visual styling
    if (hasSelection) {
      this.exportButton.classList.remove('disabled');
      this.deleteButton.classList.remove('disabled');
      this.startButton.classList.remove('disabled');
    } else {
      this.exportButton.classList.add('disabled');
      this.deleteButton.classList.add('disabled');
      this.startButton.classList.add('disabled');
    }
  }
  
  /**
   * Generate HTML for workout preview
   * @param workout Workout to preview
   * @returns HTML string
   */
  private generatePreviewHTML(workout: any): string {
    let html = `
      <div class="preview-header">
        <h3>${workout.name}</h3>
        <div class="preview-meta">
          <div class="preview-meta-item">
            <span class="preview-meta-label">Sets:</span>
            <span>${workout.sets}</span>
          </div>
          <div class="preview-meta-item">
            <span class="preview-meta-label">Break between sets:</span>
            <span>${workout.breakBetweenSets} seconds</span>
          </div>
          <div class="preview-actions">
            <button class="btn" onclick="window.location.href='editor.html?id=${workout.id}'">Edit</button>
          </div>
        </div>
      </div>
    `;
    
    // Calculate total time
    const totalTime = this.calculateTotalTime(workout);
    html += `<div class="preview-total-time">Total time: ${this.formatTime(totalTime)}</div>`;
    
    // Add warmup section if not empty
    if (workout.warmup.length > 0) {
      html += this.generateSectionPreviewHTML('Warmup', workout.warmup);
    }
    
    // Add sequence section
    html += this.generateSectionPreviewHTML('Main Sequence (x' + workout.sets + ')', workout.sequence);
    
    // Add cooldown section if not empty
    if (workout.cooldown.length > 0) {
      html += this.generateSectionPreviewHTML('Cooldown', workout.cooldown);
    }
    
    return html;
  }
  
  /**
   * Generate HTML for a section preview
   * @param title Section title
   * @param steps Array of steps
   * @returns HTML string
   */
  private generateSectionPreviewHTML(title: string, steps: any[]): string {
    let html = `
      <div class="preview-section">
        <div class="preview-section-title">${title}</div>
        <ul class="preview-steps">
    `;
    
    steps.forEach(step => {
      html += `
        <li class="preview-step ${step.type}">
          <div class="preview-step-name">${step.name}</div>
          <div class="preview-step-duration">${step.duration}s</div>
        </li>
      `;
    });
    
    html += `
        </ul>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Calculate total workout time
   * @param workout Workout to calculate time for
   * @returns Total time in seconds
   */
  private calculateTotalTime(workout: any): number {
    let totalTime = 0;
    
    // Add warmup time
    workout.warmup.forEach((step: any) => {
      totalTime += step.duration;
    });
    
    // Add sequence time (multiplied by sets)
    let sequenceTime = 0;
    workout.sequence.forEach((step: any) => {
      sequenceTime += step.duration;
    });
    totalTime += sequenceTime * workout.sets;
    
    // Add breaks between sets
    totalTime += workout.breakBetweenSets * (workout.sets - 1);
    
    // Add cooldown time
    workout.cooldown.forEach((step: any) => {
      totalTime += step.duration;
    });
    
    return totalTime;
  }
  
  /**
   * Format time in seconds to MM:SS format
   * @param seconds Time in seconds
   * @returns Formatted time string
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize home UI if we're on the home page
if (document.getElementById('home-screen')) {
  const homeUI = new HomeUI();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(
      new URL('./service-worker.js', import.meta.url)
    );
  });
} 