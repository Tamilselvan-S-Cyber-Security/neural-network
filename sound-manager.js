/**
 * Sound Manager for Neural Network Visualization
 * Handles audio synthesis and playback for neural network activity
 */

class SoundManager {
    constructor() {
        // Initialize audio context
        this.audioContext = null;
        this.masterGain = null;
        this.initialized = false;
        this.muted = false;

        // Sound settings
        this.volume = 0.2; // Default volume (low to avoid being too intrusive)

        // Oscillator banks for different sounds
        this.oscillators = {};

        // Frequency mapping for different neuron types
        this.frequencyMap = {
            input: [220, 277.18, 329.63, 392, 440], // A3, C#4, E4, G4, A4 (A minor pentatonic)
            hidden: [523.25, 587.33, 659.25, 783.99, 880], // C5, D5, E5, G5, A5
            output: [880, 1046.5, 1174.66, 1318.51, 1567.98] // A5, C6, D6, E6, G6
        };
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;

        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);

            this.initialized = true;
            console.log("Audio context initialized");
        } catch (e) {
            console.error("Web Audio API not supported:", e);
        }
    }

    // Set master volume
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.volume;
        }
    }

    // Toggle mute
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.volume;
        }
        return this.muted;
    }

    // Play a tone for neuron activation
    playNeuronActivation(type, index, activation) {
        if (!this.initialized || this.muted) return;

        // Get base frequency for this neuron type
        const frequencies = this.frequencyMap[type] || this.frequencyMap.hidden;
        const baseFreq = frequencies[index % frequencies.length];

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        // Set oscillator type and frequency
        oscillator.type = type === 'output' ? 'sine' : 'triangle';
        oscillator.frequency.value = baseFreq;

        // Set gain based on activation
        const volume = 0.05 * activation; // Keep volume low
        gain.gain.value = 0;

        // Connect nodes
        oscillator.connect(gain);
        gain.connect(this.masterGain);

        // Start oscillator
        oscillator.start();

        // Ramp up gain quickly
        gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);

        // Ramp down gain slowly
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);

        // Stop oscillator after sound is done
        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
        }, 300);
    }

    // Play a crash sound
    playCrashSound() {
        if (!this.initialized || this.muted) return;

        // Create noise for crash
        const bufferSize = this.audioContext.sampleRate / 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Fill buffer with noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        // Create noise source
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        // Create filter for crash sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        filter.Q.value = 5;

        // Create gain node
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;

        // Connect nodes
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Start noise
        noise.start();

        // Ramp up gain quickly
        gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);

        // Ramp down gain
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        // Stop noise after sound is done
        setTimeout(() => {
            noise.stop();
            noise.disconnect();
            filter.disconnect();
            gain.disconnect();
        }, 600);
    }

    // Play a sound for connection activation
    playConnectionActivation(weight) {
        if (!this.initialized || this.muted) return;

        // Only play for significant weights
        if (Math.abs(weight) < 0.3) return;

        // Create noise node
        const bufferSize = 2 * this.audioContext.sampleRate / 100;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Fill buffer with noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        // Create noise source
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        // Create filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800 + Math.abs(weight) * 1200; // Higher frequency for stronger weights
        filter.Q.value = 1;

        // Create gain node
        const gain = this.audioContext.createGain();
        gain.gain.value = 0;

        // Connect nodes
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Start noise
        noise.start();

        // Set volume based on weight
        const volume = 0.02 * Math.abs(weight);

        // Ramp up gain quickly
        gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);

        // Ramp down gain quickly
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.05);

        // Stop noise after sound is done
        setTimeout(() => {
            noise.stop();
            noise.disconnect();
            filter.disconnect();
            gain.disconnect();
        }, 100);
    }

    // Play a chord when the network makes a decision
    playDecisionChord(outputs) {
        if (!this.initialized || this.muted) return;

        // Only play if at least one output is active
        if (!outputs.some(output => output > 0.5)) return;

        // Create oscillators for each active output
        outputs.forEach((activation, index) => {
            if (activation > 0.5) {
                const freq = this.frequencyMap.output[index % this.frequencyMap.output.length];

                // Create oscillator
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                // Set oscillator type and frequency
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;

                // Set gain based on activation
                const volume = 0.1 * activation;
                gain.gain.value = 0;

                // Connect nodes
                oscillator.connect(gain);
                gain.connect(this.masterGain);

                // Start oscillator
                oscillator.start();

                // Ramp up gain quickly
                gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);

                // Ramp down gain slowly
                gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);

                // Stop oscillator after sound is done
                setTimeout(() => {
                    oscillator.stop();
                    oscillator.disconnect();
                    gain.disconnect();
                }, 600);
            }
        });
    }
}
