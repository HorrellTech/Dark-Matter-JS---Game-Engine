/**
 * AudioPlayer - Plays audio files
 * 
 * This module allows playing audio files with various controls,
 * such as volume, loop, and playback rate.
 */
class AudioPlayer extends Module {
    static allowMultiple = true;
    static namespace = "Audio";
    static description = "Plays audio files with playback controls";
    static iconClass = "fas fa-volume-up";
    
    constructor() {
        super("AudioPlayer");
        
        // Audio asset reference
        this.audioAsset = new AssetReference(null, 'audio');
        
        // Playback properties
        this.volume = 1.0;
        this.loop = false;
        this.playRate = 1.0;
        this.autoplay = false;
        this.playOnStart = false;
        this.randomizeStart = false;
        this.startTime = 0;
        this.endTime = 0; // 0 means end of audio
        this.fadeInTime = 0;
        this.fadeOutTime = 0;
        this.spatialBlend = 0; // 0 = 2D, 1 = 3D
        this.minDistance = 1;
        this.maxDistance = 500;
        
        // Internal state
        this._audio = null;
        this._isLoaded = false;
        this._isPlaying = false;
        this._audioContext = null;
        this._gainNode = null;
        this._sourceNode = null;
        this._startTime = 0;
        this._duration = 0;
        
        // Expose properties
        this.exposeProperty("audioAsset", "asset", this.audioAsset, {
            description: "Audio file to play",
            assetType: 'audio',
            fileTypes: ['mp3', 'wav', 'ogg', 'aac']
        });
        
        this.exposeProperty("volume", "number", this.volume, {
            description: "Playback volume (0-1)",
            min: 0,
            max: 1,
            step: 0.01
        });
        
        this.exposeProperty("loop", "boolean", this.loop, {
            description: "Loop the audio"
        });
        
        this.exposeProperty("playRate", "number", this.playRate, {
            description: "Playback speed (1.0 = normal)",
            min: 0.25,
            max: 4,
            step: 0.01
        });
        
        this.exposeProperty("autoplay", "boolean", this.autoplay, {
            description: "Automatically play when scene starts"
        });
        
        this.exposeProperty("playOnStart", "boolean", this.playOnStart, {
            description: "Play when this object becomes active"
        });
        
        this.exposeProperty("spatialBlend", "number", this.spatialBlend, {
            description: "2D (0) vs 3D (1) sound blend",
            min: 0,
            max: 1,
            step: 0.1
        });
    }
    
    /**
     * Called when the module is first activated
     */
    async start() {
        // Load the audio file if we have one
        await this.loadAudio();
        
        // Auto-play if enabled
        if ((this.autoplay || this.playOnStart) && this._isLoaded) {
            this.play();
        }
    }
    
    /**
     * Called when this module is destroyed
     */
    onDestroy() {
        // Stop audio and clean up resources
        this.stop();
        
        if (this._gainNode) {
            this._gainNode.disconnect();
            this._gainNode = null;
        }
        
        this._audio = null;
    }
    
    /**
     * Load the audio from the asset reference
     */
    async loadAudio() {
        if (!this.audioAsset || !this.audioAsset.path) {
            this._audio = null;
            this._isLoaded = false;
            return null;
        }
        
        try {
            const audio = await this.audioAsset.load();
            
            if (audio instanceof HTMLAudioElement) {
                this._audio = audio;
                this._isLoaded = true;
                this._duration = audio.duration;
                
                // Initialize Web Audio API if needed
                this.initializeAudioContext();
                
                return audio;
            }
            
            return null;
        } catch (error) {
            console.error("Error loading audio:", error);
            this._audio = null;
            this._isLoaded = false;
            return null;
        }
    }
    
    /**
     * Initialize the Web Audio API context and nodes
     */
    initializeAudioContext() {
        // Create audio context if needed
        if (!this._audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn("Web Audio API not supported in this browser");
                return false;
            }
            
            this._audioContext = new AudioContext();
        }
        
        // Create gain node for volume control if needed
        if (!this._gainNode) {
            this._gainNode = this._audioContext.createGain();
            this._gainNode.gain.value = this.volume;
            this._gainNode.connect(this._audioContext.destination);
        }
        
        return true;
    }
    
    /**
     * Play the audio
     * @param {Object} options - Playback options
     * @param {number} options.startTime - Time in seconds to start playback from
     * @param {boolean} options.loop - Whether to loop the audio
     * @param {number} options.volume - Playback volume (0-1)
     * @param {number} options.rate - Playback rate
     * @returns {Promise<boolean>} Success or failure
     */
    async play(options = {}) {
        if (!this._isLoaded) {
            await this.loadAudio();
        }
        
        if (!this._audio || !this._isLoaded) {
            console.warn("Cannot play audio: not loaded");
            return false;
        }
        
        // Stop current playback if any
        this.stop();
        
        try {
            // Use options or default properties
            const loop = options.loop !== undefined ? options.loop : this.loop;
            const volume = options.volume !== undefined ? options.volume : this.volume;
            const rate = options.rate !== undefined ? options.rate : this.playRate;
            
            // For simple playback using HTML Audio Element
            if (!this._audioContext) {
                this._audio.currentTime = options.startTime || this.startTime || 0;
                this._audio.loop = loop;
                this._audio.volume = volume;
                this._audio.playbackRate = rate;
                
                // Play with user interaction workaround if needed
                const playPromise = this._audio.play();
                if (playPromise) {
                    await playPromise.catch(error => {
                        console.warn("Audio play error (may require user interaction):", error);
                        return false;
                    });
                }
                
                this._isPlaying = true;
                return true;
            }
            
            // For advanced playback using Web Audio API
            // Create a buffer source node
            const sourceNode = this._audioContext.createMediaElementSource(this._audio);
            
            // Connect source -> gain -> destination
            sourceNode.connect(this._gainNode);
            
            // Set properties
            this._gainNode.gain.value = volume;
            this._audio.loop = loop;
            this._audio.playbackRate = rate;
            
            // Start playback
            this._audio.currentTime = options.startTime || this.startTime || 0;
            
            // Play with user interaction workaround if needed
            const playPromise = this._audio.play();
            if (playPromise) {
                await playPromise.catch(error => {
                    console.warn("Audio play error (may require user interaction):", error);
                    return false;
                });
            }
            
            this._sourceNode = sourceNode;
            this._isPlaying = true;
            this._startTime = this._audioContext.currentTime;
            
            return true;
            
        } catch (error) {
            console.error("Error playing audio:", error);
            return false;
        }
    }
    
    /**
     * Stop audio playback
     */
    stop() {
        if (!this._audio) return;
        
        try {
            // Stop playback
            this._audio.pause();
            this._audio.currentTime = 0;
            
            // Clean up source node if it exists
            if (this._sourceNode) {
                this._sourceNode.disconnect();
                this._sourceNode = null;
            }
            
            this._isPlaying = false;
        } catch (error) {
            console.error("Error stopping audio:", error);
        }
    }
    
    /**
     * Pause audio playback
     */
    pause() {
        if (!this._audio || !this._isPlaying) return;
        
        try {
            this._audio.pause();
            this._isPlaying = false;
        } catch (error) {
            console.error("Error pausing audio:", error);
        }
    }
    
    /**
     * Resume playback from paused state
     */
    resume() {
        if (!this._audio || this._isPlaying) return;
        
        try {
            const playPromise = this._audio.play();
            if (playPromise) {
                playPromise.catch(error => {
                    console.warn("Audio resume error:", error);
                });
            }
            this._isPlaying = true;
        } catch (error) {
            console.error("Error resuming audio:", error);
        }
    }
    
    /**
     * Set the audio volume
     * @param {number} value - Volume level (0-1)
     * @param {number} fadeTime - Time to fade to new volume (in seconds)
     */
    setVolume(value, fadeTime = 0) {
        this.volume = Math.max(0, Math.min(1, value));
        
        if (!this._audio) return;
        
        if (fadeTime > 0 && this._gainNode) {
            // Use Web Audio API for smooth volume transition
            const now = this._audioContext.currentTime;
            this._gainNode.gain.linearRampToValueAtTime(this.volume, now + fadeTime);
        } else {
            // Immediate volume change
            if (this._gainNode) {
                this._gainNode.gain.value = this.volume;
            } else {
                this._audio.volume = this.volume;
            }
        }
    }
    
    /**
     * Main update loop
     */
    loop(deltaTime) {
        // Handle position-based volume for spatial audio
        if (this.spatialBlend > 0 && this._isPlaying && this.gameObject) {
            this.updateSpatialAudio();
        }
    }
    
    /**
     * Update spatial audio effects based on camera distance
     */
    updateSpatialAudio() {
        if (!window.engine || !window.engine.scene || this.spatialBlend <= 0) return;
        
        // Get camera position from the scene settings
        const settings = window.engine.scene.settings || {};
        if (!settings.viewportX && !settings.viewportY) return;
        
        // Calculate camera position
        const cameraPos = new Vector2(
            settings.viewportX + (settings.viewportWidth / 2 / (settings.cameraZoom || 1)),
            settings.viewportY + (settings.viewportHeight / 2 / (settings.cameraZoom || 1))
        );
        
        // Get this object's position
        const objectPos = this.gameObject.getWorldPosition();
        
        // Calculate distance
        const distance = objectPos.distanceTo(cameraPos);
        
        // Calculate volume based on distance
        let distanceVolume = 1;
        if (distance > this.minDistance) {
            const fadeRange = this.maxDistance - this.minDistance;
            if (fadeRange > 0) {
                distanceVolume = 1 - Math.min(1, Math.max(0, 
                    (distance - this.minDistance) / fadeRange
                ));
            } else {
                distanceVolume = distance <= this.minDistance ? 1 : 0;
            }
        }
        
        // Apply spatial blend
        const effectiveVolume = this.volume * (1 - this.spatialBlend) + 
            (this.volume * distanceVolume * this.spatialBlend);
        
        // Set the actual volume (without fading to avoid constant changes)
        if (this._gainNode) {
            this._gainNode.gain.value = effectiveVolume;
        } else if (this._audio) {
            this._audio.volume = effectiveVolume;
        }
    }
    
    /**
     * Override to handle serialization
     */
    toJSON() {
        const json = super.toJSON() || {};
        
        // Serialize audio properties
        json.audioAsset = this.audioAsset ? this.audioAsset.toJSON() : null;
        json.volume = this.volume;
        json.loop = this.loop;
        json.playRate = this.playRate;
        json.autoplay = this.autoplay;
        json.playOnStart = this.playOnStart;
        json.startTime = this.startTime;
        json.endTime = this.endTime;
        json.fadeInTime = this.fadeInTime;
        json.fadeOutTime = this.fadeOutTime;
        json.spatialBlend = this.spatialBlend;
        json.minDistance = this.minDistance;
        json.maxDistance = this.maxDistance;
        
        return json;
    }
    
    /**
     * Override to handle deserialization
     */
    fromJSON(json) {
        super.fromJSON(json);
        
        if (!json) return;
        
        // Restore audio properties
        if (json.audioAsset) {
            this.audioAsset = AssetReference.fromJSON(json.audioAsset);
            this.loadAudio(); // Start loading the audio
        }
        
        if (json.volume !== undefined) this.volume = json.volume;
        if (json.loop !== undefined) this.loop = json.loop;
        if (json.playRate !== undefined) this.playRate = json.playRate;
        if (json.autoplay !== undefined) this.autoplay = json.autoplay;
        if (json.playOnStart !== undefined) this.playOnStart = json.playOnStart;
        if (json.startTime !== undefined) this.startTime = json.startTime;
        if (json.endTime !== undefined) this.endTime = json.endTime;
        if (json.fadeInTime !== undefined) this.fadeInTime = json.fadeInTime;
        if (json.fadeOutTime !== undefined) this.fadeOutTime = json.fadeOutTime;
        if (json.spatialBlend !== undefined) this.spatialBlend = json.spatialBlend;
        if (json.minDistance !== undefined) this.minDistance = json.minDistance;
        if (json.maxDistance !== undefined) this.maxDistance = json.maxDistance;
    }
}

// Register module globally
window.AudioPlayer = AudioPlayer;