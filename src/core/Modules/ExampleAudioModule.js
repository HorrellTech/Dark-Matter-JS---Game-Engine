/**
 * ExampleAudioModule - Demonstrates audio handling through AssetManager
 *
 * This is an example module showing how to load and play audio using
 * the AssetManager system. It's designed as a template for users to create
 * their own audio-based modules.
 *
 * Features demonstrated:
 * - Loading audio through AssetManager
 * - AssetReference integration
 * - Playback controls and properties
 * - Export-ready serialization
 * - Editor and runtime compatibility
 */
class ExampleAudioModule extends Module {
    static allowMultiple = true;
    static namespace = "Examples";
    static description = "Example module demonstrating audio asset handling";
    static iconClass = "fas fa-volume-up";

    constructor() {
        super("ExampleAudioModule");

        // Audio asset reference - demonstrates AssetManager integration
        this.audioAsset = new (window.AssetReference || function (p) { return { path: p }; })(null, 'audio');

        // Playback properties
        this.volume = 1.0;
        this.loop = false;
        this.playbackRate = 1.0;
        this.autoPlay = false;
        this.playOnStart = false;

        // Fade properties for smooth transitions
        this.fadeInTime = 0;
        this.fadeOutTime = 0;

        // Spatial audio properties (simplified)
        this.enableSpatialAudio = false;
        this.minDistance = 1;
        this.maxDistance = 500;

        // Internal state
        this._audio = null;
        this._isLoaded = false;
        this._isPlaying = false;
        this._audioContext = null;
        this._gainNode = null;
        this._startTime = 0;
        this._duration = 0;
        this._notifiedMissingPaths = new Set(); // Track paths we've already notified about

        // Register properties for the inspector
        this.registerProperties();
    }

    /**
     * Show user-friendly notification for missing audio assets
     * @param {string} path - The missing audio path
     */
    showMissingAudioNotification(path) {
        // Only show notification in editor mode, not in exported games
        if (window.editor && window.editor.fileBrowser && window.editor.fileBrowser.showNotification) {
            const fileName = path.split('/').pop().split('\\').pop();
            window.editor.fileBrowser.showNotification(
                `Audio file "${fileName}" not found. The audio module will work without sound.`,
                'warning'
            );
        }
    }

    /**
     * Register all properties for this module
     */
    registerProperties() {
        // Clear any previously registered properties
        this.clearProperties();

        // Audio asset property - demonstrates AssetManager integration
        this.exposeProperty("audioAsset", "asset", this.audioAsset, {
            description: "Audio asset to play (loaded through AssetManager)",
            assetType: 'audio',
            fileTypes: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
            onAssetSelected: (assetPath) => {
                this.setAudio(assetPath);
            }
        });

        // Playback properties
        this.exposeProperty("volume", "number", this.volume, {
            description: "Playback volume (0-1)",
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value) => {
                this.volume = value;
                this.updateVolume();
            }
        });

        this.exposeProperty("loop", "boolean", this.loop, {
            description: "Loop the audio playback",
            onChange: (value) => {
                this.loop = value;
                if (this._audio) {
                    this._audio.loop = value;
                }
            }
        });

        this.exposeProperty("playbackRate", "number", this.playbackRate, {
            description: "Playback speed (0.5-2.0)",
            min: 0.5,
            max: 2.0,
            step: 0.1,
            onChange: (value) => {
                this.playbackRate = value;
                if (this._audio) {
                    this._audio.playbackRate = value;
                }
            }
        });

        this.exposeProperty("autoPlay", "boolean", this.autoPlay, {
            description: "Automatically play when scene starts"
        });

        this.exposeProperty("playOnStart", "boolean", this.playOnStart, {
            description: "Play when this object becomes active"
        });

        // Fade properties
        this.exposeProperty("fadeInTime", "number", this.fadeInTime, {
            description: "Fade in time in seconds (0 = no fade)",
            min: 0,
            max: 10,
            step: 0.1
        });

        this.exposeProperty("fadeOutTime", "number", this.fadeOutTime, {
            description: "Fade out time in seconds (0 = no fade)",
            min: 0,
            max: 10,
            step: 0.1
        });

        // Spatial audio properties
        this.exposeProperty("enableSpatialAudio", "boolean", this.enableSpatialAudio, {
            description: "Enable distance-based volume attenuation"
        });

        this.exposeProperty("minDistance", "number", this.minDistance, {
            description: "Minimum distance for spatial audio (full volume)",
            min: 0,
            max: 1000,
            step: 1
        });

        this.exposeProperty("maxDistance", "number", this.maxDistance, {
            description: "Maximum distance for spatial audio (no volume)",
            min: 1,
            max: 2000,
            step: 1
        });
    }

    /**
     * Clear previously registered properties
     */
    clearProperties() {
        if (this.properties) {
            for (const prop in this.properties) {
                if (this.properties.hasOwnProperty(prop)) {
                    delete this.properties[prop];
                }
            }
        }
    }

    /**
     * Called when the module is first activated
     */
    async start() {
        // Load the audio file if we have one
        if (this.audioAsset && this.audioAsset.path) {
            await this.loadAudio();
        }

        // Auto-play if enabled
        if ((this.autoPlay || this.playOnStart) && this._isLoaded) {
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
      * Set the audio by path and load it through AssetManager
      * @param {string} path - File path to the audio
      */
    async setAudio(path) {
        console.log('ExampleAudioModule: Setting audio to:', path);

        if (path === null || path === undefined || path.trim() === '') {
            this.audioAsset = null;
            this._audio = null;
            this._isLoaded = false;
            return;
        }

        if (this.audioAsset && this.audioAsset.path === path) {
            console.log('ExampleAudioModule: Audio path unchanged, skipping');
            return;
        }

        try {
            // Clear previous missing path notifications when setting new audio
            if (path && this._notifiedMissingPaths) {
                this._notifiedMissingPaths.clear();
            }

            // Create new asset reference
            if (window.AssetReference) {
                this.audioAsset = new window.AssetReference(path, 'audio');
            } else {
                this.audioAsset = {
                    path: path,
                    type: 'audio',
                    load: () => this.loadFromAssetManager(path)
                };
            }

            // Load the audio through AssetManager
            await this.loadAudio();

        } catch (error) {
            console.warn("ExampleAudioModule: Error setting audio path:", path, "- audio will not be available");

            // Show user notification for missing audio path
            if (path && !this._notifiedMissingPaths.has(path)) {
                this._notifiedMissingPaths.add(path);
                this.showMissingAudioNotification(path);
            }

            this.audioAsset = null;
            this._audio = null;
            this._isLoaded = false;
        }
    }

    async loadFromAssetManager(path) {
        if (!path) return null;

        try {
            // Try to load from AssetManager first
            if (window.assetManager) {
                const asset = await window.assetManager.getAssetByPath(path);
                if (asset && asset instanceof HTMLAudioElement) {
                    this._audio = asset;
                    this._isLoaded = true;
                    this._duration = asset.duration;
                    console.log('ExampleAudioModule: Audio loaded from AssetManager:', path);

                    // Initialize Web Audio API for advanced features
                    this.initializeAudioContext();

                    // Register for export if in editor
                    if (window.assetManager && !window.assetManager.hasAsset(this.getAssetId(path))) {
                        const assetId = this.getAssetId(path);
                        window.assetManager.addAsset(assetId, asset, 'audio', {
                            path: path,
                            originalPath: path
                        }).catch(error => {
                            console.warn('Failed to register audio for export:', error);
                        });
                    }

                    return asset;
                }
            }

            // Fallback for exported games or when AssetManager fails
            return await this.fallbackLoadAudio(path);

        } catch (error) {
            console.warn('ExampleAudioModule: AssetManager failed to load audio:', path, '- trying fallback method');
            return null;
        }
    }

    /**
     * Get a unique asset ID for this module's asset
     * @param {string} path - Asset path
     * @returns {string} - Unique asset ID
     */
    getAssetId(path) {
        return path.replace(/^[\/\\]+/, '').replace(/[\/\\]/g, '_');
    }

    /**
      * Fallback method to load audio for exported games
      * @param {string} path - Path to the audio
      * @returns {Promise<HTMLAudioElement>} - Loaded audio
      */
    fallbackLoadAudio(path) {
        return new Promise((resolve, reject) => {
            if (!path || path.trim() === '' || path === '/Into the Void.wav') {
                console.warn('ExampleAudioModule: Invalid audio path provided:', path);
                resolve(null); // Resolve with null for invalid paths instead of rejecting
                return;
            }

            const audio = new Audio();

            // For exported games, try to load from asset cache
            if (window.assetManager && window.assetManager.cache) {
                const normalizedPath = window.assetManager.normalizePath ?
                    window.assetManager.normalizePath(path) :
                    path.replace(/^\/+/, '').replace(/\\/g, '/');

                console.log('ExampleAudioModule: Looking for cached audio asset:', normalizedPath);

                // Try multiple path variations for lookup
                const pathVariations = [
                    path,
                    normalizedPath,
                    path.replace(/^[\/\\]+/, ''),
                    path.replace(/\\/g, '/'),
                    path.split('/').pop(),
                    path.split('\\').pop(),
                ];

                let cached = null;
                let foundPath = null;

                for (const variation of pathVariations) {
                    if (window.assetManager.cache[variation]) {
                        cached = window.assetManager.cache[variation];
                        foundPath = variation;
                        console.log('ExampleAudioModule: Found cached audio asset with path variation:', foundPath);
                        break;
                    }
                }

                if (cached) {
                    if (cached instanceof HTMLAudioElement) {
                        console.log('ExampleAudioModule: Using cached HTMLAudioElement');
                        this._audio = cached;
                        this._isLoaded = true;
                        this._duration = cached.duration;
                        this.initializeAudioContext();
                        resolve(cached);
                        return;
                    } else if (typeof cached === 'string' && cached.startsWith('data:')) {
                        console.log('ExampleAudioModule: Loading cached audio data URL');
                        audio.src = cached;
                    }
                } else {
                    console.warn('ExampleAudioModule: Audio asset not in cache, trying direct load');
                    audio.src = path;
                }
            } else {
                console.warn('ExampleAudioModule: No asset manager available');
                audio.src = path;
            }

            audio.oncanplaythrough = () => {
                console.log('ExampleAudioModule: Audio loaded successfully');
                this._audio = audio;
                this._isLoaded = true;
                this._duration = audio.duration;
                this.initializeAudioContext();
                resolve(audio);
            };

            audio.onerror = (error) => {
                console.warn('ExampleAudioModule: Audio file not found or failed to load:', path, '- This is normal if no audio is set');
                this._audio = null;
                this._isLoaded = false;

                // Show user notification for missing audio (only once per path)
                if (!this._notifiedMissingPaths) {
                    this._notifiedMissingPaths = new Set();
                }
                if (!this._notifiedMissingPaths.has(path)) {
                    this._notifiedMissingPaths.add(path);
                    this.showMissingAudioNotification(path);
                }

                resolve(null); // Resolve with null instead of rejecting for missing files
            };
        });
    }

    /**
      * Load the audio from the asset reference
      */
    async loadAudio() {
        if (!this.audioAsset || (!this.audioAsset.path && !this.audioAsset.embedded)) {
            console.warn('ExampleAudioModule: No audio asset path to load');
            return null;
        }

        // Validate the audio path before attempting to load
        const path = this.audioAsset.path;
        if (!path || path.trim() === '' || path === '/Into the Void.wav') {
            console.warn('ExampleAudioModule: Invalid or missing audio path:', path);
            this._audio = null;
            this._isLoaded = false;

            // Show notification for the specific missing file
            if (path && path === '/Into the Void.wav' && !this._notifiedMissingPaths.has(path)) {
                this._notifiedMissingPaths.add(path);
                this.showMissingAudioNotification(path);
            }
            return null;
        }

        try {
            console.log('ExampleAudioModule: Loading audio:', path);

            // Load through AssetManager
            const audio = await this.loadFromAssetManager(path);

            if (audio) {
                console.log('ExampleAudioModule: Audio loaded successfully');
            } else {
                console.warn('ExampleAudioModule: Failed to load audio');
            }

            return audio;

        } catch (error) {
            console.warn('ExampleAudioModule: Failed to load audio asset:', path, '- continuing without audio');
            this._audio = null;
            this._isLoaded = false;
            return null;
        }
    }

    /**
     * Initialize the Web Audio API context and nodes for advanced features
     */
    initializeAudioContext() {
        // Create audio context if needed and supported
        if (!this._audioContext && window.AudioContext) {
            try {
                this._audioContext = new AudioContext();
            } catch (error) {
                console.warn("ExampleAudioModule: Web Audio API not supported");
                return false;
            }
        }

        // Create gain node for volume control if needed
        if (!this._gainNode && this._audioContext) {
            this._gainNode = this._audioContext.createGain();
            this._gainNode.gain.value = this.volume;
            this._gainNode.connect(this._audioContext.destination);
        }

        return true;
    }

    /**
     * Play the audio
     * @param {Object} options - Playback options
     * @returns {Promise<boolean>} Success or failure
     */
    async play(options = {}) {
        if (!this._isLoaded) {
            await this.loadAudio();
        }

        if (!this._audio || !this._isLoaded) {
            console.warn("ExampleAudioModule: Cannot play audio: not loaded");
            return false;
        }

        // Stop current playback if any
        this.stop();

        try {
            // Use options or default properties
            const loop = options.loop !== undefined ? options.loop : this.loop;
            const volume = options.volume !== undefined ? options.volume : this.volume;
            const rate = options.rate !== undefined ? options.rate : this.playbackRate;

            // Set properties
            this._audio.currentTime = 0; // Start from beginning for this example
            this._audio.loop = loop;
            this._audio.volume = volume;
            this._audio.playbackRate = rate;

            // Play with user interaction workaround if needed
            const playPromise = this._audio.play();
            if (playPromise) {
                await playPromise.catch(error => {
                    console.warn("ExampleAudioModule: Audio play error (may require user interaction):", error);
                    return false;
                });
            }

            this._isPlaying = true;
            this._startTime = Date.now();

            console.log('ExampleAudioModule: Started playing audio');
            return true;

        } catch (error) {
            console.error("ExampleAudioModule: Error playing audio:", error);
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
            this._isPlaying = false;

            console.log('ExampleAudioModule: Stopped audio playback');
        } catch (error) {
            console.error("ExampleAudioModule: Error stopping audio:", error);
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
            console.log('ExampleAudioModule: Paused audio playback');
        } catch (error) {
            console.error("ExampleAudioModule: Error pausing audio:", error);
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
                    console.warn("ExampleAudioModule: Audio resume error:", error);
                });
            }
            this._isPlaying = true;
            console.log('ExampleAudioModule: Resumed audio playback');
        } catch (error) {
            console.error("ExampleAudioModule: Error resuming audio:", error);
        }
    }

    /**
     * Update volume with optional fade
     * @param {number} targetVolume - Target volume (0-1)
     * @param {number} fadeTime - Fade time in seconds
     */
    setVolume(targetVolume, fadeTime = 0) {
        const newVolume = Math.max(0, Math.min(1, targetVolume));
        this.volume = newVolume;

        if (!this._audio) return;

        if (fadeTime > 0 && this._gainNode && this._audioContext) {
            // Use Web Audio API for smooth volume transition
            const now = this._audioContext.currentTime;
            this._gainNode.gain.linearRampToValueAtTime(newVolume, now + fadeTime);
        } else {
            // Immediate volume change
            if (this._gainNode) {
                this._gainNode.gain.value = newVolume;
            } else {
                this._audio.volume = newVolume;
            }
        }
    }

    /**
     * Update volume based on current property
     */
    updateVolume() {
        this.setVolume(this.volume);
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        // Handle spatial audio if enabled
        if (this.enableSpatialAudio && this._isPlaying && this.gameObject) {
            this.updateSpatialAudio();
        }
    }

    /**
     * Update spatial audio effects based on camera distance
     */
    updateSpatialAudio() {
        if (!window.engine || !window.engine.scene || !this.enableSpatialAudio) return;

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

        // Apply the distance-based volume
        const effectiveVolume = this.volume * distanceVolume;
        this.setVolume(effectiveVolume);
    }

    /**
     * Override to handle serialization for export
     */
    toJSON() {
        const json = super.toJSON() || {};

        // Store asset reference for export
        json.audioAsset = this.audioAsset ? {
            path: this.audioAsset.path,
            type: 'audio',
            embedded: this.audioAsset.embedded || false
        } : null;

        // Store playback properties
        json.volume = this.volume;
        json.loop = this.loop;
        json.playbackRate = this.playbackRate;
        json.autoPlay = this.autoPlay;
        json.playOnStart = this.playOnStart;

        // Store fade properties
        json.fadeInTime = this.fadeInTime;
        json.fadeOutTime = this.fadeOutTime;

        // Store spatial audio properties
        json.enableSpatialAudio = this.enableSpatialAudio;
        json.minDistance = this.minDistance;
        json.maxDistance = this.maxDistance;

        return json;
    }

    /**
     * Override to handle deserialization from export
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        // Restore playback properties
        if (json.volume !== undefined) this.volume = json.volume;
        if (json.loop !== undefined) this.loop = json.loop;
        if (json.playbackRate !== undefined) this.playbackRate = json.playbackRate;
        if (json.autoPlay !== undefined) this.autoPlay = json.autoPlay;
        if (json.playOnStart !== undefined) this.playOnStart = json.playOnStart;

        // Restore fade properties
        if (json.fadeInTime !== undefined) this.fadeInTime = json.fadeInTime;
        if (json.fadeOutTime !== undefined) this.fadeOutTime = this.fadeOutTime;

        // Restore spatial audio properties
        if (json.enableSpatialAudio !== undefined) this.enableSpatialAudio = json.enableSpatialAudio;
        if (json.minDistance !== undefined) this.minDistance = json.minDistance;
        if (json.maxDistance !== undefined) this.maxDistance = this.maxDistance;

        // Restore asset reference and load from AssetManager
        if (json.audioAsset && json.audioAsset.path) {
            console.log('ExampleAudioModule: Loading audio from AssetManager:', json.audioAsset.path);

            try {
                if (window.AssetReference) {
                    this.audioAsset = new window.AssetReference(json.audioAsset.path, 'audio');
                } else {
                    this.audioAsset = {
                        path: json.audioAsset.path,
                        type: 'audio',
                        embedded: json.audioAsset.embedded || false,
                        load: () => this.loadFromAssetManager(json.audioAsset.path)
                    };
                }

                // Clear previous missing path notifications when loading from saved data
                if (json.audioAsset.path && this._notifiedMissingPaths) {
                    this._notifiedMissingPaths.clear();
                }

                // Load the asset from AssetManager
                this.loadFromAssetManager(json.audioAsset.path);
            } catch (error) {
                console.warn("ExampleAudioModule: Error restoring audio asset:", json.audioAsset.path, "- audio will not be available");

                // Show user notification for missing audio from saved scene
                if (json.audioAsset && json.audioAsset.path && !this._notifiedMissingPaths.has(json.audioAsset.path)) {
                    this._notifiedMissingPaths.add(json.audioAsset.path);
                    this.showMissingAudioNotification(json.audioAsset.path);
                }

                this.audioAsset = null;
                this._audio = null;
                this._isLoaded = false;
            }
        } else {
            this.audioAsset = {
                path: null,
                type: 'audio',
                load: () => Promise.resolve(null)
            };
            this._audio = null;
            this._isLoaded = false;
        }
    }
}

// Register module globally
window.ExampleAudioModule = ExampleAudioModule;