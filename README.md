# Workout Timer App

A browser-based interval timer for workouts that lets you configure exercises, rest periods, sets, and more.

## Features

- Create, save, and load customized workout profiles
- Configure warmup, main sequence, and cooldown phases
- Set custom exercise and rest durations
- Define number of sets and breaks between sets
- Audio cues for transitions and countdowns
- Save/load workouts from localStorage
- Export/import workout configurations as JSON
- Dark mode support
- Prevents screen sleep during workouts (Wake Lock API)
- Works offline

## Getting Started

### Prerequisites

- Node.js and npm (for development)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository or download the source code
2. Install the dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open your browser and navigate to `http://localhost:1234`

### Building for Production

To build the app for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Create a Workout**: 
   - Click "New Workout" on the home screen
   - Fill in the workout name, sets, and break duration
   - Add steps to warmup, main sequence, and cooldown sections
   - Save your workout

2. **Start a Workout**:
   - Select a workout from the dropdown
   - Click "Start Workout"
   - Use the player controls to play/pause, skip forward/backward, or restart

3. **Import/Export**:
   - Export workouts to share with others
   - Import workouts created by others

## Audio Files

The app uses audio cues for transitions. You'll need to provide your own audio files in the `assets/sounds` directory:

- `exercise_start.mp3`: Played when an exercise starts
- `rest_start.mp3`: Played when a rest period starts
- `break_start.mp3`: Played when a break between sets starts
- `countdown.mp3`: Played during the final 3-second countdown
- `complete.mp3`: Played when the workout is completed

The app will function without these files, falling back gracefully.

## Browser Support

The app uses modern web technologies, including:
- `localStorage` for saving workouts
- Web Audio API for sounds
- Wake Lock API to prevent screen sleep (optional)

It works best in the latest versions of Chrome, Firefox, Safari, and Edge.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with TypeScript, HTML5, and CSS3
- Uses the Wake Lock API for preventing screen sleep
- Uses the Web Audio API for audio playback 