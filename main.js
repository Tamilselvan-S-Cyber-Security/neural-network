/**
 * Main JavaScript file for the Neural Network Car Game
 * Handles initialization and UI interactions
 */

// Utility functions
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function getIntersection(A, B, C, D) {
    const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
    const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
    const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

    if (bottom !== 0) {
        const t = tTop / bottom;
        const u = uTop / bottom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            };
        }
    }

    return null;
}

function polysIntersect(poly1, poly2) {
    for (let i = 0; i < poly1.length; i++) {
        for (let j = 0; j < poly2.length; j++) {
            const touch = getIntersection(
                poly1[i],
                poly1[(i + 1) % poly1.length],
                poly2[j],
                poly2[(j + 1) % poly2.length]
            );

            if (touch) {
                return true;
            }
        }
    }

    return false;
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const gameCanvas = document.getElementById('game-canvas');
    const networkCanvas = document.getElementById('network-canvas');

    // Initialize sound manager
    const soundManager = new SoundManager();

    // Create game instance with sound manager
    const game = new Game(gameCanvas, networkCanvas, soundManager);

    // Set up button event listeners
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const trainBtn = document.getElementById('train-btn');

    startBtn.addEventListener('click', () => {
        startBtn.textContent = startBtn.textContent === 'Start' ? 'Pause' : 'Start';

        if (startBtn.textContent === 'Pause') {
            game.start();
        } else {
            game.stop();
        }
    });

    resetBtn.addEventListener('click', () => {
        game.reset();
        startBtn.textContent = 'Start';
    });

    trainBtn.addEventListener('click', () => {
        // Manually trigger evolution
        game.evolve();
    });

    // Set up slider event listeners
    const mutationRateSlider = document.getElementById('mutation-rate');
    const populationSizeSlider = document.getElementById('population-size');
    const hiddenNeuronsSlider = document.getElementById('hidden-neurons');
    const volumeSlider = document.getElementById('volume-slider');
    const soundToggle = document.getElementById('sound-toggle');

    // Initialize sound controls
    soundToggle.addEventListener('click', () => {
        // Initialize audio context on first click (required by browsers)
        if (!soundManager.initialized) {
            soundManager.init();
        }

        const isMuted = soundManager.toggleMute();
        soundToggle.querySelector('.sound-icon').textContent = isMuted ? '🔇' : '🔊';
    });

    volumeSlider.addEventListener('input', () => {
        // Initialize audio context on first interaction (required by browsers)
        if (!soundManager.initialized) {
            soundManager.init();
        }

        const value = parseFloat(volumeSlider.value);
        soundManager.setVolume(value);
    });

    mutationRateSlider.addEventListener('input', () => {
        const value = parseFloat(mutationRateSlider.value);
        document.getElementById('mutation-rate-value').textContent = value.toFixed(2);
        game.mutationRate = value;
    });

    populationSizeSlider.addEventListener('input', () => {
        const value = parseInt(populationSizeSlider.value);
        document.getElementById('population-size-value').textContent = value;
        game.populationSize = value;
    });

    hiddenNeuronsSlider.addEventListener('input', () => {
        const value = parseInt(hiddenNeuronsSlider.value);
        document.getElementById('hidden-neurons-value').textContent = value;

        // Update hidden neurons for next generation
        for (let i = 0; i < game.cars.length; i++) {
            game.cars[i].brain.hiddenNodes = value;
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        // Update game canvas dimensions
        gameCanvas.width = gameCanvas.offsetWidth;
        gameCanvas.height = gameCanvas.offsetHeight;

        // Update road width
        game.road.width = gameCanvas.width * 0.9;
        game.road.left = game.road.x - game.road.width / 2;
        game.road.right = game.road.x + game.road.width / 2;

        // The neural network visualizer will update itself in its draw method
        // We don't need to recreate it, which would lose animation state
    });

    // Force an initial resize after a short delay to ensure proper layout
    setTimeout(() => {
        // Trigger resize event to ensure everything is sized correctly
        window.dispatchEvent(new Event('resize'));
    }, 100);

    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        switch (event.key) {
            case ' ': // Space bar
                startBtn.click();
                break;
            case 'r':
                resetBtn.click();
                break;
            case 't':
                trainBtn.click();
                break;
        }
    });

    // Start the game automatically
    startBtn.click();
});
