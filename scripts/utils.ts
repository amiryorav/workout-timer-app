/**
 * Format seconds to MM:SS display
 * @param seconds Number of seconds
 * @returns Formatted time string (MM:SS)
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Display a confirmation dialog
 * @param message Message to display
 * @param confirmText Text for confirm button (default: "Confirm")
 * @param cancelText Text for cancel button (default: "Cancel")
 * @returns Promise that resolves to true if confirmed, false if canceled
 */
export function showConfirmDialog(
  message: string,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): Promise<boolean> {
  const dialogContainer = document.getElementById('dialog-container')!;
  const dialogContent = document.getElementById('dialog-content')!;
  const confirmButton = document.getElementById('dialog-confirm')!;
  const cancelButton = document.getElementById('dialog-cancel')!;
  
  return new Promise((resolve) => {
    // Set dialog content
    dialogContent.textContent = message;
    confirmButton.textContent = confirmText;
    cancelButton.textContent = cancelText;
    
    // Show dialog
    dialogContainer.classList.remove('hidden');
    
    // Handle confirm button click
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    // Handle cancel button click
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    // Clean up event listeners and hide dialog
    const cleanup = () => {
      confirmButton.removeEventListener('click', handleConfirm);
      cancelButton.removeEventListener('click', handleCancel);
      dialogContainer.classList.add('hidden');
    };
    
    // Add event listeners
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
  });
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Check if screen wake lock is supported by the browser
 */
export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

/**
 * Request a screen wake lock to prevent device sleep
 * @returns Promise that resolves to WakeLockSentinel or null if not supported/failed
 */
export async function requestWakeLock(): Promise<any> {
  if (!isWakeLockSupported()) {
    console.warn('Wake Lock API not supported');
    return null;
  }
  
  try {
    const wakeLock = await (navigator as any).wakeLock.request('screen');
    console.log('Wake Lock acquired');
    return wakeLock;
  } catch (error) {
    console.error('Failed to acquire Wake Lock:', error);
    return null;
  }
}

/**
 * Release a wake lock
 * @param wakeLock WakeLockSentinel to release
 */
export async function releaseWakeLock(wakeLock: any): Promise<void> {
  if (!wakeLock) return;
  
  try {
    await wakeLock.release();
    console.log('Wake Lock released');
  } catch (error) {
    console.error('Failed to release Wake Lock:', error);
  }
}

/**
 * Download a string as a file
 * @param content String content to download
 * @param filename Filename to use
 * @param contentType Content type (default: 'application/json')
 */
export function downloadStringAsFile(
  content: string,
  filename: string,
  contentType: string = 'application/json'
): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
} 