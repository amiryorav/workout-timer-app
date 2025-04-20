import { Workout, Step, createEmptyWorkout } from './models';
import { storageService } from './storage';
import { showConfirmDialog } from './utils';

/**
 * Editor UI controller for creating and editing workouts
 */
export class EditorUI {
  // The current workout being edited
  private workout: Workout;
  
  // Whether the workout has unsaved changes
  private hasUnsavedChanges = false;
  
  // DOM elements
  private form: HTMLFormElement;
  private stepTemplateElement: HTMLTemplateElement;
  private previewContainer: HTMLElement;
  private previewContent: HTMLElement;
  
  // Section step containers
  private stepContainers: {
    warmup: HTMLElement;
    sequence: HTMLElement;
    cooldown: HTMLElement;
  };
  
  /**
   * Initialize the editor UI
   */
  constructor() {
    // Initialize form
    this.form = document.getElementById('workout-form') as HTMLFormElement;
    this.stepTemplateElement = document.getElementById('step-template') as HTMLTemplateElement;
    this.previewContainer = document.getElementById('preview-container') as HTMLElement;
    this.previewContent = document.getElementById('preview-content') as HTMLElement;
    
    // Get step containers
    this.stepContainers = {
      warmup: document.getElementById('warmup-steps') as HTMLElement,
      sequence: document.getElementById('sequence-steps') as HTMLElement,
      cooldown: document.getElementById('cooldown-steps') as HTMLElement
    };
    
    // Start with a new empty workout
    this.workout = createEmptyWorkout();
    
    // Add event listeners
    this.addEventListeners();
  }
  
  /**
   * Load a workout for editing
   * @param workoutId ID of the workout to load
   */
  async loadWorkout(workoutId: string): Promise<void> {
    try {
      const workout = await storageService.getWorkout(workoutId);
      if (workout) {
        this.workout = workout;
        this.renderWorkout();
        this.hasUnsavedChanges = false;
      } else {
        throw new Error(`Workout with ID ${workoutId} not found`);
      }
    } catch (error) {
      console.error('Failed to load workout:', error);
      alert('Failed to load workout. Please try again.');
    }
  }
  
  /**
   * Create a new workout
   */
  newWorkout(): void {
    this.workout = createEmptyWorkout();
    this.renderWorkout();
    this.hasUnsavedChanges = true;
  }
  
  /**
   * Add event listeners to form elements
   */
  private addEventListeners(): void {
    // Form change event to track unsaved changes
    this.form.addEventListener('input', () => {
      this.hasUnsavedChanges = true;
    });
    
    // Add step buttons
    document.querySelectorAll('.add-step').forEach((button) => {
      button.addEventListener('click', (event) => {
        const section = (event.target as HTMLElement).dataset.section as 'warmup' | 'sequence' | 'cooldown';
        this.addStep(section);
      });
    });
    
    // Save button
    document.getElementById('save-workout')!.addEventListener('click', () => {
      this.saveWorkout();
    });
    
    // Preview button
    document.getElementById('preview-workout')!.addEventListener('click', () => {
      this.previewWorkout();
    });
    
    // Close preview button
    document.getElementById('close-preview')!.addEventListener('click', () => {
      this.previewContainer.classList.add('hidden');
    });
    
    // Cancel button
    document.getElementById('cancel-edit')!.addEventListener('click', async () => {
      if (this.hasUnsavedChanges) {
        const confirmed = await showConfirmDialog(
          'You have unsaved changes. Are you sure you want to exit without saving?',
          'Exit',
          'Stay'
        );
        
        if (!confirmed) return;
      }
      
      // Navigate back to home
      window.location.href = 'index.html';
    });
    
    // Handle form submission (prevent default)
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveWorkout();
    });
    
    // Add beforeunload event to warn about unsaved changes
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    });
  }
  
  /**
   * Render the current workout in the editor
   */
  private renderWorkout(): void {
    // Set form values
    const nameInput = document.getElementById('workout-name') as HTMLInputElement;
    const setsInput = document.getElementById('sets') as HTMLInputElement;
    const breakInput = document.getElementById('break-between-sets') as HTMLInputElement;
    
    nameInput.value = this.workout.name;
    setsInput.value = String(this.workout.sets);
    breakInput.value = String(this.workout.breakBetweenSets);
    
    // Clear step containers
    Object.values(this.stepContainers).forEach(container => {
      container.innerHTML = '';
    });
    
    // Render each section
    this.renderSteps('warmup', this.workout.warmup);
    this.renderSteps('sequence', this.workout.sequence);
    this.renderSteps('cooldown', this.workout.cooldown);
  }
  
  /**
   * Render steps for a section
   * @param section Section name (warmup, sequence, cooldown)
   * @param steps Array of steps to render
   */
  private renderSteps(section: 'warmup' | 'sequence' | 'cooldown', steps: Step[]): void {
    const container = this.stepContainers[section];
    
    steps.forEach((step, index) => {
      const stepElement = this.createStepElement(section, step, index);
      container.appendChild(stepElement);
    });
    
    // Setup drag and drop for steps
    this.setupDragAndDrop(container);
  }
  
  /**
   * Create a step element from template
   * @param section Section name
   * @param step Step data
   * @param index Index of the step
   * @returns The created step element
   */
  private createStepElement(section: string, step: Step, index: number): HTMLElement {
    // Clone template
    const template = this.stepTemplateElement.content.cloneNode(true) as DocumentFragment;
    const stepElement = template.querySelector('.step') as HTMLElement;
    
    // Set data attributes
    stepElement.dataset.section = section;
    stepElement.dataset.index = String(index);
    stepElement.dataset.type = step.type;
    
    // Set form values
    const typeSelect = stepElement.querySelector('.step-type') as HTMLSelectElement;
    const nameInput = stepElement.querySelector('.step-name') as HTMLInputElement;
    const durationInput = stepElement.querySelector('.step-duration') as HTMLInputElement;
    
    typeSelect.value = step.type;
    nameInput.value = step.name;
    durationInput.value = String(step.duration);
    
    // Add event listeners
    typeSelect.addEventListener('change', () => {
      stepElement.dataset.type = typeSelect.value;
      this.updateStepFromElement(stepElement);
    });
    
    nameInput.addEventListener('input', () => {
      this.updateStepFromElement(stepElement);
    });
    
    durationInput.addEventListener('input', () => {
      this.updateStepFromElement(stepElement);
    });
    
    // Remove button
    const removeButton = stepElement.querySelector('.remove-step') as HTMLButtonElement;
    removeButton.addEventListener('click', () => {
      this.removeStep(stepElement);
    });
    
    return stepElement;
  }
  
  /**
   * Add a new step to a section
   * @param section Section name
   */
  private addStep(section: 'warmup' | 'sequence' | 'cooldown'): void {
    // Get section data from workout
    const steps = this.workout[section];
    
    // Create new step with default values
    const defaultType = section === 'sequence' ? 'exercise' : 'exercise';
    const defaultName = defaultType === 'exercise' ? 'New Exercise' : 'Rest';
    
    const newStep: Step = {
      type: defaultType as 'exercise' | 'rest',
      name: defaultName,
      duration: 30
    };
    
    // Add to workout
    steps.push(newStep);
    
    // Create and append element
    const stepElement = this.createStepElement(section, newStep, steps.length - 1);
    this.stepContainers[section].appendChild(stepElement);
    
    // Mark as changed
    this.hasUnsavedChanges = true;
  }
  
  /**
   * Remove a step
   * @param stepElement The step element to remove
   */
  private removeStep(stepElement: HTMLElement): void {
    const section = stepElement.dataset.section as 'warmup' | 'sequence' | 'cooldown';
    const index = parseInt(stepElement.dataset.index || '0');
    
    // Remove from workout
    this.workout[section].splice(index, 1);
    
    // Remove element
    stepElement.remove();
    
    // Update indices of remaining steps
    const container = this.stepContainers[section];
    const stepElements = container.querySelectorAll('.step');
    
    stepElements.forEach((element, i) => {
      (element as HTMLElement).dataset.index = String(i);
    });
    
    // Mark as changed
    this.hasUnsavedChanges = true;
  }
  
  /**
   * Update a step's data from its element
   * @param stepElement The step element
   */
  private updateStepFromElement(stepElement: HTMLElement): void {
    const section = stepElement.dataset.section as 'warmup' | 'sequence' | 'cooldown';
    const index = parseInt(stepElement.dataset.index || '0');
    
    // Get form values
    const typeSelect = stepElement.querySelector('.step-type') as HTMLSelectElement;
    const nameInput = stepElement.querySelector('.step-name') as HTMLInputElement;
    const durationInput = stepElement.querySelector('.step-duration') as HTMLInputElement;
    
    // Update step in workout
    const step = this.workout[section][index];
    step.type = typeSelect.value as 'exercise' | 'rest';
    step.name = nameInput.value;
    step.duration = parseInt(durationInput.value);
    
    // Mark as changed
    this.hasUnsavedChanges = true;
  }
  
  /**
   * Setup drag and drop for steps in a container
   * @param container The container element
   */
  private setupDragAndDrop(container: HTMLElement): void {
    const steps = container.querySelectorAll('.step');
    
    steps.forEach(step => {
      step.addEventListener('dragstart', (event) => {
        const dragEvent = event as DragEvent;
        (event.target as HTMLElement).classList.add('dragging');
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.setData('text/plain', ''); // Required for Firefox
        }
      });
      
      step.addEventListener('dragend', (event) => {
        (event.target as HTMLElement).classList.remove('dragging');
      });
    });
    
    container.addEventListener('dragover', (event) => {
      event.preventDefault();
      const draggingElement = container.querySelector('.dragging') as HTMLElement;
      if (!draggingElement) return;
      
      const afterElement = this.getDragAfterElement(container, (event as DragEvent).clientY);
      if (afterElement) {
        container.insertBefore(draggingElement, afterElement);
      } else {
        container.appendChild(draggingElement);
      }
    });
    
    container.addEventListener('drop', (event) => {
      event.preventDefault();
      
      // Update workout data with new order
      const section = container.id.split('-')[0] as 'warmup' | 'sequence' | 'cooldown';
      const steps = Array.from(container.querySelectorAll('.step')) as HTMLElement[];
      
      // Create new array with updated order
      const newSteps: Step[] = [];
      
      steps.forEach((stepElement, index) => {
        const oldIndex = parseInt(stepElement.dataset.index || '0');
        const step = { ...this.workout[section][oldIndex] };
        newSteps.push(step);
        
        // Update index
        stepElement.dataset.index = String(index);
      });
      
      // Update workout
      this.workout[section] = newSteps;
      
      // Mark as changed
      this.hasUnsavedChanges = true;
    });
  }
  
  /**
   * Get the element after which to insert the dragged element
   * @param container Container element
   * @param y Y-coordinate of the mouse
   * @returns Element to insert after, or null to append at the end
   */
  private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
    const draggableElements = Array.from(
      container.querySelectorAll('.step:not(.dragging)')
    ) as HTMLElement[];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }).element;
  }
  
  /**
   * Update workout data from form values
   */
  private updateWorkoutFromForm(): void {
    const nameInput = document.getElementById('workout-name') as HTMLInputElement;
    const setsInput = document.getElementById('sets') as HTMLInputElement;
    const breakInput = document.getElementById('break-between-sets') as HTMLInputElement;
    
    this.workout.name = nameInput.value;
    this.workout.sets = parseInt(setsInput.value);
    this.workout.breakBetweenSets = parseInt(breakInput.value);
  }
  
  /**
   * Validate the form
   * @returns Error message or null if valid
   */
  private validateForm(): string | null {
    const nameInput = document.getElementById('workout-name') as HTMLInputElement;
    
    if (!nameInput.value.trim()) {
      return 'Please enter a workout name';
    }
    
    if (this.workout.sequence.length === 0) {
      return 'Please add at least one exercise to the main sequence';
    }
    
    return null;
  }
  
  /**
   * Save the workout
   */
  private async saveWorkout(): Promise<void> {
    // Update workout from form
    this.updateWorkoutFromForm();
    
    // Validate
    const error = this.validateForm();
    if (error) {
      alert(error);
      return;
    }
    
    try {
      // Save to storage
      await storageService.saveWorkout(this.workout);
      
      // Mark as saved
      this.hasUnsavedChanges = false;
      
      // Redirect to home page
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    }
  }
  
  /**
   * Show workout preview
   */
  private previewWorkout(): void {
    // Update workout from form
    this.updateWorkoutFromForm();
    
    // Generate preview HTML
    this.previewContent.innerHTML = this.generatePreviewHTML(this.workout);
    
    // Show preview container
    this.previewContainer.classList.remove('hidden');
  }
  
  /**
   * Generate HTML for workout preview
   * @param workout Workout to preview
   * @returns HTML string
   */
  private generatePreviewHTML(workout: Workout): string {
    let html = `
      <div class="preview-meta">
        <div class="preview-meta-item">
          <span class="preview-meta-label">Sets:</span>
          <span>${workout.sets}</span>
        </div>
        <div class="preview-meta-item">
          <span class="preview-meta-label">Break between sets:</span>
          <span>${workout.breakBetweenSets} seconds</span>
        </div>
      </div>
    `;
    
    // Add warmup section if not empty
    if (workout.warmup.length > 0) {
      html += this.generateSectionPreviewHTML('Warmup', workout.warmup);
    }
    
    // Add sequence section
    html += this.generateSectionPreviewHTML('Main Sequence', workout.sequence);
    
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
  private generateSectionPreviewHTML(title: string, steps: Step[]): string {
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
}

// Check if we're on the editor page
if (document.getElementById('workout-form')) {
  // Initialize editor
  const editor = new EditorUI();
  
  // Check if there's a workout ID in the URL
  const params = new URLSearchParams(window.location.search);
  const workoutId = params.get('id');
  
  if (workoutId) {
    // Load existing workout
    editor.loadWorkout(workoutId);
  } else {
    // Create new workout
    editor.newWorkout();
  }
} 