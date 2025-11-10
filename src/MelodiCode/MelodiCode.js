/**
 * MelodiCode Integration for Dark Matter JS Game Engine
 * Provides audio capabilities through code-based music/sound generation
 */
class MelodiCode {
    constructor() {
        this.audioEngine = null;
        this.codeInterpreter = null;
        this.isInitialized = false;
        this.isPlaying = false;
        
        // Initialize the audio components
        this.init();
    }

    async init() {
        try {
            // Initialize audio engine if available
            if (window.audioEngine) {
                this.audioEngine = window.audioEngine;
            } else {
                console.warn('MelodiCode: AudioEngine not found, some features may not work');
            }

            // Initialize code interpreter if available
            if (window.codeInterpreter) {
                this.codeInterpreter = window.codeInterpreter;
            } else {
                console.warn('MelodiCode: CodeInterpreter not found, some features may not work');
            }

            this.isInitialized = true;
            console.log('MelodiCode initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MelodiCode:', error);
        }
    }

    /**
     * Play MelodiCode script
     * @param {string} code - MelodiCode script to execute
     * @param {Object} options - Optional parameters
     * @returns {Promise} - Resolves when playback starts
     */
    async play(code, options = {}) {
        if (!this.isInitialized) {
            console.warn('MelodiCode not initialized, attempting to initialize...');
            await this.init();
        }

        if (!this.codeInterpreter || !this.audioEngine) {
            console.error('MelodiCode: Required components not available');
            return false;
        }

        try {
            // Parse the code
            this.codeInterpreter.parse(code);
            
            // Validate the code
            const validation = this.codeInterpreter.validate();
            if (!validation.valid) {
                console.error('MelodiCode validation errors:', validation.errors);
                return false;
            }

            // Set BPM if provided
            if (options.bpm) {
                this.codeInterpreter.bpm = options.bpm;
                this.codeInterpreter.beatDuration = 60 / options.bpm;
            } else if (this.codeInterpreter.bpm === 0) {
                this.codeInterpreter.bpm = 120;
                this.codeInterpreter.beatDuration = 60 / 120;
            }

            // Execute the code
            await this.codeInterpreter.execute();
            this.isPlaying = true;
            
            console.log('MelodiCode playback started');
            return true;
        } catch (error) {
            console.error('Error playing MelodiCode:', error);
            return false;
        }
    }

    /**
     * Stop current playback
     */
    stop() {
        if (this.codeInterpreter) {
            this.codeInterpreter.stop();
            this.isPlaying = false;
            console.log('MelodiCode playback stopped');
        }
    }

    /**
     * Play a simple beat pattern
     * @param {string} pattern - Beat pattern (e.g., "kick snare kick snare")
     * @param {number} bpm - Beats per minute
     */
    playBeat(pattern, bpm = 120) {
        const code = `
bpm ${bpm}

[main]
    pattern ${pattern}
[end]
play main
`;
        return this.play(code);
    }

    /**
     * Play a simple melody
     * @param {Array} notes - Array of note names (e.g., ["C4", "D4", "E4"])
     * @param {number} duration - Duration per note in beats
     * @param {number} bpm - Beats per minute
     */
    playMelody(notes, duration = 1, bpm = 120) {
        const noteCommands = notes.map(note => `tone ${note} ${duration}`).join('\n    ');
        const code = `
bpm ${bpm}

[main]
    ${noteCommands}
[end]
play main
`;
        return this.play(code);
    }

    /**
     * Play a single sample
     * @param {string} sampleName - Name of the sample to play
     * @param {Object} options - Optional parameters (pitch, volume, etc.)
     */
    playSample(sampleName, options = {}) {
        const pitch = options.pitch || 1;
        const timescale = options.timescale || 1;
        const volume = options.volume || 0.8;
        const pan = options.pan || 0;

        const code = `
[main]
    sample ${sampleName} ${pitch} ${timescale} ${volume} ${pan}
[end]
play main
`;
        return this.play(code);
    }

    /**
     * Play a tone
     * @param {string|number} frequency - Note name or frequency
     * @param {number} duration - Duration in beats
     * @param {string} waveType - Wave type (sine, square, sawtooth, triangle)
     * @param {Object} options - Optional parameters
     */
    playTone(frequency, duration = 1, waveType = 'sine', options = {}) {
        const volume = options.volume || 0.8;
        const pan = options.pan || 0;
        const bpm = options.bpm || 120;

        const code = `
bpm ${bpm}

[main]
    tone ${frequency} ${duration} ${waveType} ${volume} ${pan}
[end]

play main
`;
        return this.play(code);
    }

    /**
     * Get available sample names
     * @returns {Array} Array of available sample names
     */
    getAvailableSamples() {
        if (this.audioEngine && typeof this.audioEngine.getBuiltInSampleNames === 'function') {
            return this.audioEngine.getBuiltInSampleNames();
        }
        return [];
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        if (this.audioEngine && typeof this.audioEngine.setMasterVolume === 'function') {
            this.audioEngine.setMasterVolume(volume);
        }
    }

    /**
     * Check if MelodiCode is currently playing
     * @returns {boolean}
     */
    getIsPlaying() {
        return this.isPlaying;
    }

    /**
     * Export current audio as WAV
     * @param {number} duration - Duration to export in seconds
     * @returns {Promise<Blob>} WAV audio blob
     */
    async exportWAV(duration = 10) {
        if (this.audioEngine && typeof this.audioEngine.exportWAV === 'function') {
            return await this.audioEngine.exportWAV(duration);
        }
        throw new Error('Export functionality not available');
    }
}

// Make MelodiCode available globally
window.MelodiCode = MelodiCode;
window.melodicode = new MelodiCode();
window.melodiCode = new MelodiCode();