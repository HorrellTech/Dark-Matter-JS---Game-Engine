// RubberDucky.js - A fun rubber ducky widget for Dark Matter JS
class RubberDucky {
    constructor() {
        this.isOpen = false;
        this.settings = this.loadSettings();
        this.ducky = null;
        this.isDragging = false;
        this.isSqueezing = false;
        this.velocity = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        this.lastTime = Date.now();
        this.position = { x: window.innerWidth - 150, y: window.innerHeight - 150 };

        // Animation state
        this.targetScale = 1;
        this.currentScale = 1;
        this.squeezeAmount = 0;
        this.targetSqueezeAmount = 0;

        // Physics constants
        this.friction = 0.95;
        this.bounceDamping = 0.7;
        this.minVelocity = 0.1;

        // New squash state for directional bouncing
        this.targetSquashX = 1;
        this.currentSquashX = 1;
        this.targetSquashY = 1;
        this.currentSquashY = 1;
        this.squashDecaySpeed = 0.1; // How fast squash returns to normal

        // Speech bubble state
        this.speechBubble = null;
        this.isSpeaking = false;
        this.speechTimeout = null;
        this.speechTexts = null;

        // Error bubbles
        this.isShowingErrorBubble = false; // Flag to pause random speeches
        this.originalConsoleError = console.error; // Store original methods
        this.originalConsoleWarn = console.warn;
        this.errorBubbleTimeout = null; // For auto-hiding the bubble
        this.errorWarningQueue = []; // Array of { type: 'error'|'warning', message: string }

        this.rubberDuckList = [
            'RubberDucks/Quackers.png',
            'RubberDucks/OG Quackers.png',
            'RubberDucks/Gordon Ducksly.png',
            'RubberDucks/General Duckles.png',
            'RubberDucks/Albert Quackstein.png',
            'RubberDucks/Quack Sparrow.png',
            'RubberDucks/Disco Quack.png',
            'RubberDucks/Iron Duck.png',
            'RubberDucks/The Incredible Duck.png',
            'RubberDucks/Inmate Quackers.png',
            'RubberDucks/King Duckon.png',
            'RubberDucks/Sir Quacksalot.png',
            'RubberDucks/Officer Duckson.png',
            'RubberDucks/Poinduckster.png',
            'RubberDucks/Quaaaaaaaaakssss.png',
            'RubberDucks/Lil Quackles.png',
            'RubberDucks/Mr Clip.png',
            'RubberDucks/Mr Pigsly.png',
            'RubberDucks/Rosie.png',
            'RubberDucks/Dilly The Dino.png'
        ];

        // Initialize duckList with a safe default to prevent undefined errors
        this.duckList = this.rubberDuckList;
        
        this.lastMoveTime = Date.now();
        
        // Load speech data
        this.loadSpeechData();

        this.init();
    }

    async init() {
        this.createToolbarButton();
        this.createDuckyElement();
        this.createSettingsModal();
        this.setupEventListeners();
        this.startAnimationLoop();

        // Override console methods to catch errors/warnings
        this.overrideConsoleMethods();

        // Load saved position if exists
        if (this.settings.position) {
            this.position = this.settings.position;
            this.updateDuckyPosition();
        }

        // Load duck list early and update image after it completes
        await this.loadDuckList();
        this.updateDuckyImage();

        // Load speech data (already async, but not awaited before)
        await this.loadSpeechData();

        // Set initial visibility
        if (this.settings.isOpen) {
            this.show();
        }
    }

    updateDuckyImage() {
        if (this.duckyImage) {
            this.duckyImage.src = this.getDuckSrc();
        }
    }

    loadSettings() {
        const defaultSettings = {
            size: 100,
            opacity: 1.0,
            bounciness: 0.7,
            wobbleEnabled: true,
            soundEnabled: true,
            position: null,
            isOpen: false,

            // Squeeze speed settings
            squeezeOutSpeed: 0.3,
            squeezeInSpeed: 0.08,
            squeezeAmount: 0.3,

            // Sound settings - Squeeze Out
            squeezeOutDuration: 0.18,
            squeezeOutBasePitch: 650,
            squeezeOutPitchVariation: 100,
            squeezeOutVolume: 0.12,

            // Sound settings - Squeeze In
            squeezeInDuration: 0.45,
            squeezeInBasePitch: 265,
            squeezeInPitchVariation: 80,
            squeezeInVolume: 0.08,

            // Speech bubble settings
            speechEnabled: true,
            speechMinDelay: 30,
            speechMaxDelay: 90,
            speechTypeSpeed: 100,
            speechSoundEnabled: true,

            // Color settings
            hue: 50,
            saturation: 100,
            lightness: 65,
            colorEnabled: false,

            // Duck image selection (filename or path)
            selectedDuck: 'rubber-ducky.png',

            // New physics settings
            accelerationMultiplier: 1.0,
            friction: 0.95
        };

        try {
            const saved = localStorage.getItem('rubberDuckySettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            console.warn('Failed to load rubber ducky settings:', e);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            this.settings.position = this.position;
            this.settings.isOpen = this.isOpen;
            localStorage.setItem('rubberDuckySettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save rubber ducky settings:', e);
        }
    }

    createToolbarButton() {
        // Find the toolbar group with the Sprite Code button
        const spriteCodeBtn = document.getElementById('launchSpriteCodeBtn');

        if (!spriteCodeBtn) {
            console.warn('Sprite Code button not found, adding to first toolbar group');
            const toolbar = document.querySelector('.toolbar-group');
            if (!toolbar) {
                console.error('No toolbar found!');
                return;
            }
            this.addButtonToToolbar(toolbar);
            return;
        }

        const button = document.createElement('button');
        button.className = 'launch-btn';
        button.id = 'launchRubberDuckyBtn';
        button.title = 'Toggle Rubber Ducky';
        button.style.cssText = `
            background: transparent;
            border: none;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s ease;
        `;

        // Create duck emoji as button content
        button.innerHTML = '<span style="font-size: 16px; line-height: 1;">🐤</span>';

        button.addEventListener('click', () => this.toggle());
        button.addEventListener('mouseenter', () => {
            button.style.opacity = '1';
        });
        button.addEventListener('mouseleave', () => {
            button.style.opacity = this.isOpen ? '1' : '0.6';
        });

        // Insert right after the Sprite Code button
        spriteCodeBtn.parentNode.insertBefore(button, spriteCodeBtn.nextSibling);

        this.toolbarButton = button;
    }

    addButtonToToolbar(toolbar) {
        const button = document.createElement('button');
        button.className = 'toolbar-button';
        button.title = 'Toggle Rubber Ducky';
        button.style.cssText = `
            background: transparent;
            border: none;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0.6;
        `;
        button.innerHTML = '<span style="font-size: 28px; line-height: 1;">🦆</span>';

        button.addEventListener('click', () => this.toggle());
        toolbar.appendChild(button);

        this.toolbarButton = button;
    }

    createDuckyElement() {
        this.ducky = document.createElement('div');
        this.ducky.className = 'rubber-ducky';
        this.ducky.style.cssText = `
        position: fixed;
        width: ${this.settings.size}px;
        height: ${this.settings.size}px;
        cursor: grab;
        z-index: 99998;
        opacity: ${this.settings.opacity};
        display: none;
        user-select: none;
        pointer-events: auto;
        transition: filter 0.1s ease;
    `;

        const img = document.createElement('img');
        img.src = this.getDuckSrc();
        img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 50px rgba(0, 0, 0, 0.6));
    `;
        img.draggable = false;

        this.duckyImage = img;
        this.updateDuckyColor();

        this.ducky.appendChild(img);
        document.body.appendChild(this.ducky);

        this.updateDuckyPosition();
    }

    updateDuckyColor() {
        if (this.settings.colorEnabled && this.duckyImage) {
            this.duckyImage.style.filter = `
                hue-rotate(${this.settings.hue}deg) 
                saturate(${this.settings.saturation}%) 
                brightness(${this.settings.lightness}%)
            `;
        } else if (this.duckyImage) {
            this.duckyImage.style.filter = 'none';
        }
    }

    playBounceSound(volumeMultiplier = 1.0) {
        if (!this.settings.soundEnabled) return;

        // Create audio context if needed
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const duration = 0.15;
        const now = ctx.currentTime;

        // Cap the volume at squeeze out volume
        const maxVolume = this.settings.squeezeOutVolume * 0.8;
        const volume = Math.min(0.1 * volumeMultiplier, maxVolume);

        // Ensure volume is above zero for exponential ramps
        const safeVolume = Math.max(volume, 0.01);

        // Create a soft, muted bounce sound (like rubber hitting a surface)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filterNode = ctx.createBiquadFilter();

        // Low-pass filter for soft, muted sound
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(400, now);
        filterNode.frequency.exponentialRampToValueAtTime(150, now + duration);
        filterNode.Q.setValueAtTime(0.5, now);

        // Two oscillators for a richer, softer bounce
        osc1.frequency.setValueAtTime(120, now);
        osc1.frequency.exponentialRampToValueAtTime(60, now + duration);
        osc1.type = 'sine';

        osc2.frequency.setValueAtTime(80, now);
        osc2.frequency.exponentialRampToValueAtTime(40, now + duration);
        osc2.type = 'sine';

        // Soft envelope - quick attack, gentle decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(safeVolume, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(safeVolume * 0.3, now + duration * 0.4);
        gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

        // Add subtle noise for texture
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.03;
        }
        noise.buffer = noiseBuffer;

        const noiseGain = ctx.createGain();
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(300, now);
        noiseFilter.Q.setValueAtTime(1, now);

        noiseGain.gain.setValueAtTime(safeVolume * 0.4, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + duration);

        // Connect everything
        osc1.connect(filterNode);
        osc2.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        // Play
        osc1.start(now);
        osc2.start(now);
        noise.start(now);

        osc1.stop(now + duration);
        osc2.stop(now + duration);
        noise.stop(now + duration);
    }

    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'rubber-ducky-settings-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2a2a2a;
            border: 2px solid #444;
            border-radius: 8px;
            padding: 20px;
            z-index: 10001;
            min-width: 400px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            font-family: Arial, sans-serif;
        `;

        modal.innerHTML = `
            <h3 style="margin-top: 0; color: #FFD700; font-family: Arial, sans-serif;">
                🦆 Rubber Ducky Settings
            </h3>
            
            <!-- Tabs -->
            <div style="display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #444; flex-wrap: wrap;">
                <button class="ducky-tab" data-tab="general" style="flex: 1; min-width: 80px; padding: 10px; background: #FFD700; color: #000; border: none; border-radius: 4px 4px 0 0; cursor: pointer; font-weight: bold;">
                    General
                </button>
                <button class="ducky-tab" data-tab="squeeze" style="flex: 1; min-width: 80px; padding: 10px; background: #444; color: #ccc; border: none; border-radius: 4px 4px 0 0; cursor: pointer;">
                    Squeeze
                </button>
                <button class="ducky-tab" data-tab="sound" style="flex: 1; min-width: 80px; padding: 10px; background: #444; color: #ccc; border: none; border-radius: 4px 4px 0 0; cursor: pointer;">
                    Sound
                </button>
                <button class="ducky-tab" data-tab="speech" style="flex: 1; min-width: 80px; padding: 10px; background: #444; color: #ccc; border: none; border-radius: 4px 4px 0 0; cursor: pointer;">
                    Speech
                </button>
                <button class="ducky-tab" data-tab="color" style="flex: 1; min-width: 80px; padding: 10px; background: #444; color: #ccc; border: none; border-radius: 4px 4px 0 0; cursor: pointer;">
                    Color
                </button>
                <button class="ducky-tab" data-tab="duck" style="flex: 1; min-width: 80px; padding: 10px; background: #444; color: #ccc; border: none; border-radius: 4px 4px 0 0; cursor: pointer;">
                    Duck
                </button>
            </div>
            
            <!-- General Tab -->
            <div class="ducky-tab-content" data-tab="general" style="display: block;">
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Size: <span id="duckySizeValue">${this.settings.size}</span>px
                    </label>
                    <input type="range" id="duckySize" min="50" max="200" value="${this.settings.size}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Opacity: <span id="duckyOpacityValue">${Math.round(this.settings.opacity * 100)}</span>%
                    </label>
                    <input type="range" id="duckyOpacity" min="0.1" max="1" step="0.1" value="${this.settings.opacity}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Bounciness: <span id="duckyBouncinessValue">${Math.round(this.settings.bounciness * 100)}</span>%
                    </label>
                    <input type="range" id="duckyBounciness" min="0.1" max="1" step="0.1" value="${this.settings.bounciness}" 
                        style="width: 100%;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Acceleration Multiplier: <span id="accelerationMultiplierValue">${this.settings.accelerationMultiplier.toFixed(1)}</span>x
                    </label>
                    <input type="range" id="accelerationMultiplier" min="1" max="5" step="0.1" value="${this.settings.accelerationMultiplier}" 
                        style="width: 100%;">
                    <small style="color: #888;">How fast the duck accelerates (1-5)</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Friction: <span id="frictionValue">${this.settings.friction.toFixed(2)}</span>
                    </label>
                    <input type="range" id="friction" min="0" max="0.99" step="0.01" value="${this.settings.friction}" 
                        style="width: 100%;">
                    <small style="color: #888;">How quickly the duck slows down (0-0.99)</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="duckyWobble" ${this.settings.wobbleEnabled ? 'checked' : ''}>
                        Enable Idle Wobble
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="duckySound" ${this.settings.soundEnabled ? 'checked' : ''}>
                        Enable Quack Sound
                    </label>
                </div>
                
                <button id="duckyResetPosition" style="width: 100%; padding: 8px; background: #444; color: #ccc; border: 1px solid #555; border-radius: 4px; cursor: pointer;">
                    Reset Position
                </button>
            </div>
            
            <!-- Squeeze Tab -->
            <div class="ducky-tab-content" data-tab="squeeze" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Squeeze Out Speed: <span id="squeezeOutSpeedValue">${this.settings.squeezeOutSpeed.toFixed(2)}</span>
                    </label>
                    <input type="range" id="squeezeOutSpeed" min="0.1" max="1" step="0.05" value="${this.settings.squeezeOutSpeed}" 
                        style="width: 100%;">
                    <small style="color: #888;">How fast the ducky squeezes when grabbed</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Squeeze In Speed: <span id="squeezeInSpeedValue">${this.settings.squeezeInSpeed.toFixed(2)}</span>
                    </label>
                    <input type="range" id="squeezeInSpeed" min="0.01" max="0.3" step="0.01" value="${this.settings.squeezeInSpeed}" 
                        style="width: 100%;">
                    <small style="color: #888;">How fast the ducky returns to normal shape</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Squeeze Amount: <span id="squeezeAmountValue">${this.settings.squeezeAmount.toFixed(2)}</span>
                    </label>
                    <input type="range" id="squeezeAmount" min="0.1" max="0.8" step="0.05" value="${this.settings.squeezeAmount}" 
                        style="width: 100%;">
                    <small style="color: #888;">How much the ducky deforms when squeezed</small>
                </div>
                
                <button id="resetSqueezeSettings" style="width: 100%; padding: 8px; background: #444; color: #ccc; border: 1px solid #555; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    Reset Squeeze Settings to Default
                </button>
            </div>

            <!-- Speech Tab -->
            <div class="ducky-tab-content" data-tab="speech" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="duckySpeechEnabled" ${this.settings.speechEnabled ? 'checked' : ''}>
                        Enable Speech Bubbles
                    </label>
                </div>
                
                <div id="speechControls" style="${this.settings.speechEnabled ? '' : 'opacity: 0.5; pointer-events: none;'}">
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; display: block; margin-bottom: 5px;">
                            Min Delay: <span id="speechMinDelayValue">${this.settings.speechMinDelay}</span>s
                        </label>
                        <input type="range" id="speechMinDelay" min="10" max="60" value="${this.settings.speechMinDelay}" 
                            style="width: 100%;">
                        <small style="color: #888;">Minimum time between speeches</small>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; display: block; margin-bottom: 5px;">
                            Max Delay: <span id="speechMaxDelayValue">${this.settings.speechMaxDelay}</span>s
                        </label>
                        <input type="range" id="speechMaxDelay" min="30" max="180" value="${this.settings.speechMaxDelay}" 
                            style="width: 100%;">
                        <small style="color: #888;">Maximum time between speeches</small>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; display: block; margin-bottom: 5px;">
                            Typing Speed: <span id="speechTypeSpeedValue">${this.settings.speechTypeSpeed}</span>ms
                        </label>
                        <input type="range" id="speechTypeSpeed" min="30" max="200" step="10" value="${this.settings.speechTypeSpeed}" 
                            style="width: 100%;">
                        <small style="color: #888;">Delay between each word</small>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; cursor: pointer;">
                            <input type="checkbox" id="duckySpeechSound" ${this.settings.speechSoundEnabled ? 'checked' : ''}>
                            Enable Word Quacks
                        </label>
                        <small style="display: block; color: #888; margin-left: 20px; margin-top: 5px;">
                            Play a small quack for each word typed
                        </small>
                    </div>
                </div>
                
                <button id="resetSpeechSettings" style="width: 100%; padding: 8px; background: #444; color: #ccc; border: 1px solid #555; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    Reset Speech Settings to Default
                </button>
            </div>
            
            <!-- Sound Tab -->
            <div class="ducky-tab-content" data-tab="sound" style="display: none;">
                <h4 style="color: #FFD700; margin-top: 0;">Squeeze Out Sound</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Duration: <span id="squeezeOutDurationValue">${this.settings.squeezeOutDuration.toFixed(2)}</span>s
                    </label>
                    <input type="range" id="squeezeOutDuration" min="0.05" max="0.5" step="0.01" value="${this.settings.squeezeOutDuration}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Base Pitch: <span id="squeezeOutBasePitchValue">${this.settings.squeezeOutBasePitch}</span>Hz
                    </label>
                    <input type="range" id="squeezeOutBasePitch" min="200" max="1000" step="10" value="${this.settings.squeezeOutBasePitch}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Pitch Variation: <span id="squeezeOutPitchVariationValue">${this.settings.squeezeOutPitchVariation}</span>Hz
                    </label>
                    <input type="range" id="squeezeOutPitchVariation" min="0" max="300" step="10" value="${this.settings.squeezeOutPitchVariation}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Volume: <span id="squeezeOutVolumeValue">${this.settings.squeezeOutVolume.toFixed(2)}</span>
                    </label>
                    <input type="range" id="squeezeOutVolume" min="0.01" max="0.3" step="0.01" value="${this.settings.squeezeOutVolume}" 
                        style="width: 100%;">
                </div>
                
                <hr style="border: 1px solid #444; margin: 20px 0;">
                
                <h4 style="color: #FFD700;">Squeeze In Sound</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Duration: <span id="squeezeInDurationValue">${this.settings.squeezeInDuration.toFixed(2)}</span>s
                    </label>
                    <input type="range" id="squeezeInDuration" min="0.1" max="1" step="0.05" value="${this.settings.squeezeInDuration}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Base Pitch: <span id="squeezeInBasePitchValue">${this.settings.squeezeInBasePitch}</span>Hz
                    </label>
                    <input type="range" id="squeezeInBasePitch" min="100" max="800" step="10" value="${this.settings.squeezeInBasePitch}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Pitch Variation: <span id="squeezeInPitchVariationValue">${this.settings.squeezeInPitchVariation}</span>Hz
                    </label>
                    <input type="range" id="squeezeInPitchVariation" min="0" max="200" step="10" value="${this.settings.squeezeInPitchVariation}" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; display: block; margin-bottom: 5px;">
                        Volume: <span id="squeezeInVolumeValue">${this.settings.squeezeInVolume.toFixed(2)}</span>
                    </label>
                    <input type="range" id="squeezeInVolume" min="0.01" max="0.2" step="0.01" value="${this.settings.squeezeInVolume}" 
                        style="width: 100%;">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button id="testSqueezeOutSound" style="flex: 1; padding: 8px; background: #555; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                        Test Squeeze Out
                    </button>
                    <button id="testSqueezeInSound" style="flex: 1; padding: 8px; background: #555; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                        Test Squeeze In
                    </button>
                </div>
                
                <button id="resetSoundSettings" style="width: 100%; padding: 8px; background: #444; color: #ccc; border: 1px solid #555; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    Reset Sound Settings to Default
                </button>
            </div>
            
            <!-- Color Tab -->
            <div class="ducky-tab-content" data-tab="color" style="display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="duckyColorEnabled" ${this.settings.colorEnabled ? 'checked' : ''}>
                        Enable Color Customization
                    </label>
                </div>
                
                <div id="colorControls" style="${this.settings.colorEnabled ? '' : 'opacity: 0.5; pointer-events: none;'}">
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; display: block; margin-bottom: 5px;">
                            Hue: <span id="duckyHueValue">${this.settings.hue}</span>°
                        </label>
                        <input type="range" id="duckyHue" min="0" max="360" value="${this.settings.hue}" 
                            style="width: 100%;">
                        <small style="color: #888;">Rotate through the color spectrum</small>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; display: block; margin-bottom: 5px;">
                            Saturation: <span id="duckySaturationValue">${this.settings.saturation}</span>%
                        </label>
                        <input type="range" id="duckySaturation" min="0" max="200" value="${this.settings.saturation}" 
                            style="width: 100%;">
                        <small style="color: #888;">Color intensity (0 = grayscale, 100 = normal)</small>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="color: #ccc; display: block; margin-bottom: 5px;">
                            Brightness: <span id="duckyLightnessValue">${this.settings.lightness}</span>%
                        </label>
                        <input type="range" id="duckyLightness" min="20" max="150" value="${this.settings.lightness}" 
                            style="width: 100%;">
                        <small style="color: #888;">Overall brightness</small>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 15px; background: #1a1a1a; border-radius: 4px;">
                        <div style="color: #888; margin-bottom: 10px; font-size: 12px;">Quick Presets:</div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                            <button class="color-preset" data-preset="default" style="padding: 8px; background: #FFD700; border: 2px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Default
                            </button>
                            <button class="color-preset" data-preset="pink" style="padding: 8px; background: #FF69B4; border: 2px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Pink
                            </button>
                            <button class="color-preset" data-preset="blue" style="padding: 8px; background: #00BFFF; border: 2px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Blue
                            </button>
                            <button class="color-preset" data-preset="green" style="padding: 8px; background: #32CD32; border: 2px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Green
                            </button>
                            <button class="color-preset" data-preset="purple" style="padding: 8px; background: #9370DB; border: 2px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Purple
                            </button>
                            <button class="color-preset" data-preset="orange" style="padding: 8px; background: #FF8C00; border: 2px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Orange
                            </button>
                        </div>
                    </div>
                </div>
                
                <button id="resetColorSettings" style="width: 100%; padding: 8px; background: #444; color: #ccc; border: 1px solid #555; border-radius: 4px; cursor: pointer; margin-top: 15px;">
                    Reset Color to Default
                </button>
            </div>

            <!-- Duck Tab -->
            <div class="ducky-tab-content" data-tab="duck" style="display: none;">
                <div style="color: #ccc; margin-bottom: 10px;">
                    Choose your duck image. Add new images to the RubberDucks folder. If you want automatic detection, create a RubberDucks/list.json array of filenames.
                </div>
                <div id="duckSelectionGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px;">
                    <!-- thumbnails inserted here -->
                </div>

                <div style="margin-top: 12px; color: #888; font-size: 12px;">
                    Tip: you can drop images into RubberDucks and add them to list.json for precise control.
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 2px solid #444;">
                <button id="duckyCloseSettings" style="flex: 1; padding: 10px; background: #FFD700; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Close
                </button>
            </div>
        `;

        document.body.appendChild(modal);
        this.settingsModal = modal;

        this.setupSettingsListeners();
        this.setupTabListeners();
    }

    setupTabListeners() {
        const tabs = this.settingsModal.querySelectorAll('.ducky-tab');
        const contents = this.settingsModal.querySelectorAll('.ducky-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Update tab buttons
                tabs.forEach(t => {
                    if (t.dataset.tab === targetTab) {
                        t.style.background = '#FFD700';
                        t.style.color = '#000';
                        t.style.fontWeight = 'bold';
                    } else {
                        t.style.background = '#444';
                        t.style.color = '#ccc';
                        t.style.fontWeight = 'normal';
                    }
                });

                // Update content visibility
                contents.forEach(content => {
                    content.style.display = content.dataset.tab === targetTab ? 'block' : 'none';
                });
            });
        });
    }

    setupSettingsListeners() {
        // General Tab
        const sizeSlider = document.getElementById('duckySize');
        const sizeValue = document.getElementById('duckySizeValue');
        sizeSlider.addEventListener('input', (e) => {
            this.settings.size = parseInt(e.target.value);
            sizeValue.textContent = this.settings.size;
            this.ducky.style.width = `${this.settings.size}px`;
            this.ducky.style.height = `${this.settings.size}px`;
            this.saveSettings();
        });

        const opacitySlider = document.getElementById('duckyOpacity');
        const opacityValue = document.getElementById('duckyOpacityValue');
        opacitySlider.addEventListener('input', (e) => {
            this.settings.opacity = parseFloat(e.target.value);
            opacityValue.textContent = Math.round(this.settings.opacity * 100);
            this.ducky.style.opacity = this.settings.opacity;
            this.saveSettings();
        });

        const bouncinessSlider = document.getElementById('duckyBounciness');
        const bouncinessValue = document.getElementById('duckyBouncinessValue');
        bouncinessSlider.addEventListener('input', (e) => {
            this.settings.bounciness = parseFloat(e.target.value);
            bouncinessValue.textContent = Math.round(this.settings.bounciness * 100);
            this.bounceDamping = this.settings.bounciness;
            this.saveSettings();
        });

        // Acceleration Multiplier
        const accelerationSlider = document.getElementById('accelerationMultiplier');
        const accelerationValue = document.getElementById('accelerationMultiplierValue');
        accelerationSlider.addEventListener('input', (e) => {
            this.settings.accelerationMultiplier = parseFloat(e.target.value);
            accelerationValue.textContent = this.settings.accelerationMultiplier.toFixed(1);
            this.saveSettings();
        });

        // Friction
        const frictionSlider = document.getElementById('friction');
        const frictionValue = document.getElementById('frictionValue');
        frictionSlider.addEventListener('input', (e) => {
            this.settings.friction = parseFloat(e.target.value);
            frictionValue.textContent = this.settings.friction.toFixed(2);
            this.friction = this.settings.friction;
            this.saveSettings();
        });

        const wobbleCheckbox = document.getElementById('duckyWobble');
        wobbleCheckbox.addEventListener('change', (e) => {
            this.settings.wobbleEnabled = e.target.checked;
            this.saveSettings();
        });

        const soundCheckbox = document.getElementById('duckySound');
        soundCheckbox.addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.saveSettings();
        });

        const resetButton = document.getElementById('duckyResetPosition');
        resetButton.addEventListener('click', () => {
            this.position = { x: window.innerWidth - 150, y: window.innerHeight - 150 };
            this.velocity = { x: 0, y: 0 };
            this.updateDuckyPosition();
            this.saveSettings();
        });

        // Squeeze Tab
        this.setupSlider('squeezeOutSpeed', 'squeezeOutSpeedValue', (val) => {
            this.settings.squeezeOutSpeed = parseFloat(val);
            return val;
        }, 2);

        this.setupSlider('squeezeInSpeed', 'squeezeInSpeedValue', (val) => {
            this.settings.squeezeInSpeed = parseFloat(val);
            return val;
        }, 2);

        this.setupSlider('squeezeAmount', 'squeezeAmountValue', (val) => {
            this.settings.squeezeAmount = parseFloat(val);
            return val;
        }, 2);

        document.getElementById('resetSqueezeSettings').addEventListener('click', () => {
            this.settings.squeezeOutSpeed = 0.3;
            this.settings.squeezeInSpeed = 0.08;
            this.settings.squeezeAmount = 0.3;
            this.updateSqueezeSliders();
            this.saveSettings();
        });

        // Sound Tab
        this.setupSlider('squeezeOutDuration', 'squeezeOutDurationValue', (val) => {
            this.settings.squeezeOutDuration = parseFloat(val);
            return val;
        }, 2);

        this.setupSlider('squeezeOutBasePitch', 'squeezeOutBasePitchValue', (val) => {
            this.settings.squeezeOutBasePitch = parseInt(val);
            return val;
        }, 0);

        this.setupSlider('squeezeOutPitchVariation', 'squeezeOutPitchVariationValue', (val) => {
            this.settings.squeezeOutPitchVariation = parseInt(val);
            return val;
        }, 0);

        this.setupSlider('squeezeOutVolume', 'squeezeOutVolumeValue', (val) => {
            this.settings.squeezeOutVolume = parseFloat(val);
            return val;
        }, 2);

        this.setupSlider('squeezeInDuration', 'squeezeInDurationValue', (val) => {
            this.settings.squeezeInDuration = parseFloat(val);
            return val;
        }, 2);

        this.setupSlider('squeezeInBasePitch', 'squeezeInBasePitchValue', (val) => {
            this.settings.squeezeInBasePitch = parseInt(val);
            return val;
        }, 0);

        this.setupSlider('squeezeInPitchVariation', 'squeezeInPitchVariationValue', (val) => {
            this.settings.squeezeInPitchVariation = parseInt(val);
            return val;
        }, 0);

        this.setupSlider('squeezeInVolume', 'squeezeInVolumeValue', (val) => {
            this.settings.squeezeInVolume = parseFloat(val);
            return val;
        }, 2);

        document.getElementById('testSqueezeOutSound').addEventListener('click', () => {
            this.playSqueezeSound(true);
        });

        document.getElementById('testSqueezeInSound').addEventListener('click', () => {
            this.playSqueezeSound(false);
        });

        document.getElementById('resetSoundSettings').addEventListener('click', () => {
            this.settings.squeezeOutDuration = 0.18;
            this.settings.squeezeOutBasePitch = 650;
            this.settings.squeezeOutPitchVariation = 100;
            this.settings.squeezeOutVolume = 0.12;
            this.settings.squeezeInDuration = 0.45;
            this.settings.squeezeInBasePitch = 265;
            this.settings.squeezeInPitchVariation = 80;
            this.settings.squeezeInVolume = 0.08;
            this.updateSoundSliders();
            this.saveSettings();
        });

        // Color Tab
        const colorEnabledCheckbox = document.getElementById('duckyColorEnabled');
        const colorControls = document.getElementById('colorControls');

        colorEnabledCheckbox.addEventListener('change', (e) => {
            this.settings.colorEnabled = e.target.checked;
            colorControls.style.opacity = e.target.checked ? '1' : '0.5';
            colorControls.style.pointerEvents = e.target.checked ? 'auto' : 'none';
            this.updateDuckyColor();
            this.saveSettings();
        });

        this.setupSlider('duckyHue', 'duckyHueValue', (val) => {
            this.settings.hue = parseInt(val);
            this.updateDuckyColor();
            return val;
        }, 0);

        this.setupSlider('duckySaturation', 'duckySaturationValue', (val) => {
            this.settings.saturation = parseInt(val);
            this.updateDuckyColor();
            return val;
        }, 0);

        this.setupSlider('duckyLightness', 'duckyLightnessValue', (val) => {
            this.settings.lightness = parseInt(val);
            this.updateDuckyColor();
            return val;
        }, 0);

        this.updateDuckSelectionGrid();

        // Color presets
        const presets = {
            default: { hue: 50, saturation: 100, lightness: 65 },
            pink: { hue: 330, saturation: 150, lightness: 80 },
            blue: { hue: 200, saturation: 120, lightness: 70 },
            green: { hue: 120, saturation: 130, lightness: 75 },
            purple: { hue: 270, saturation: 110, lightness: 80 },
            orange: { hue: 30, saturation: 140, lightness: 70 }
        };

        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets[btn.dataset.preset];
                this.settings.hue = preset.hue;
                this.settings.saturation = preset.saturation;
                this.settings.lightness = preset.lightness;
                this.updateColorSliders();
                this.updateDuckyColor();
                this.saveSettings();
            });
        });

        document.getElementById('resetColorSettings').addEventListener('click', () => {
            this.settings.hue = 50;
            this.settings.saturation = 100;
            this.settings.lightness = 65;
            this.settings.colorEnabled = false;
            colorEnabledCheckbox.checked = false;
            colorControls.style.opacity = '0.5';
            colorControls.style.pointerEvents = 'none';
            this.updateColorSliders();
            this.updateDuckyColor();
            this.saveSettings();
        });

        // Close button
        const closeButton = document.getElementById('duckyCloseSettings');
        closeButton.addEventListener('click', () => {
            this.settingsModal.style.display = 'none';
        });
    }

    getDuckSrc() {
        // If the selectedDuck already looks like a path, use it
        if (!this.settings.selectedDuck) return 'rubber-ducky.png';
        // Prefer RubberDucks/<filename> if it is in duckList (normalized)
        if (this.duckList && this.duckList.length) {
            const normalized = this.settings.selectedDuck.startsWith('RubberDucks/') ? this.settings.selectedDuck : 'RubberDucks/' + this.settings.selectedDuck;
            if (this.duckList.indexOf(normalized) !== -1) return normalized;
        }
        // fallback: use the raw setting (works for root-level rubber-ducky.png)
        return this.settings.selectedDuck;
    }

    // Try to populate this.duckList from RubberDucks/list.json; fallback to probing common filenames
    async loadDuckList() {
        this.duckList = [];

        // First try list.json
        /*try {
            const resp = await fetch('RubberDucks/list.json');
            if (resp.ok) {
                const arr = await resp.json();
                if (Array.isArray(arr) && arr.length) {
                    this.duckList = arr.map(f => f.startsWith('RubberDucks/') ? f : 'RubberDucks/' + f);
                }
            }
        } catch (e) {
            // ignore and fallback
        }*/

        // If no ducks found, probe some common candidates
        if (!this.duckList.length) {
            const candidates = this.rubberDuckList.map(f => f.startsWith('RubberDucks/') ? f : 'RubberDucks/' + f);

            const existsPromises = candidates.map(async (c) => {
                const ok = await this.checkImageExists(c);
                return ok ? c : null;
            });

            const results = await Promise.all(existsPromises);
            this.duckList = results.filter(Boolean);
        }

        // Ensure there is at least one entry
        if (!this.duckList.length) {
            // final fallback to root default (may 404 but keeps code simple)
            this.duckList = ['rubber-ducky.png'];
        }

        // If saved selected duck missing, try to pick first available
        const saved = this.settings.selectedDuck;
        if (saved) {
            const normalizedSaved = saved.startsWith('RubberDucks/') ? saved : ('RubberDucks/' + saved);
            if (this.duckList.indexOf(normalizedSaved) === -1 && this.duckList.indexOf(saved) === -1) {
                // Use first available
                const first = this.duckList[0];
                // store filename-only for convenience if under RubberDucks
                this.settings.selectedDuck = first.startsWith('RubberDucks/') ? first.replace(/^RubberDucks\//, '') : first;
                this.saveSettings();
            }
        } else {
            const first = this.duckList[0];
            this.settings.selectedDuck = first.startsWith('RubberDucks/') ? first.replace(/^RubberDucks\//, '') : first;
            this.saveSettings();
        }
    }

    // Check image exists by trying to load it (works without CORS errors for basic existence check)
    checkImageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url + '?_=' + Date.now(); // bust cache
        });
    }

    updateDuckSelectionGrid() {
        const grid = document.getElementById('duckSelectionGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const selectedNormalized = this.settings.selectedDuck && !this.settings.selectedDuck.startsWith('RubberDucks/') ? 'RubberDucks/' + this.settings.selectedDuck : this.settings.selectedDuck;

        this.duckList.forEach(src => {
            const thumb = document.createElement('div');
            thumb.style.cssText = `
                width: 64px;
                height: 64px;
                border-radius: 6px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #222;
                cursor: pointer;
                transition: transform 0.08s ease, box-shadow 0.08s ease;
                border: 2px solid transparent;
            `;
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                display: block;
                pointer-events: none;
            `;
            thumb.appendChild(img);

            // highlight if selected
            const isSelected = (src === selectedNormalized) || (src === this.settings.selectedDuck) || (src.endsWith('/' + this.settings.selectedDuck));
            if (isSelected) {
                thumb.style.boxShadow = '0 0 0 3px rgba(255,215,0,0.15)';
                thumb.style.borderColor = '#FFD700';
            }

            thumb.addEventListener('click', () => {
                this.selectDuck(src);
                // update highlight
                this.updateDuckSelectionGrid();
            });

            thumb.addEventListener('mouseenter', () => thumb.style.transform = 'scale(1.03)');
            thumb.addEventListener('mouseleave', () => thumb.style.transform = '');

            grid.appendChild(thumb);
        });
    }

    selectDuck(src) {
        // store filename (strip RubberDucks/ if present) for compact settings
        const filename = src.startsWith('RubberDucks/') ? src.replace(/^RubberDucks\//, '') : src;
        this.settings.selectedDuck = filename;
        // update image src used by main duck element
        if (this.duckyImage) {
            this.duckyImage.src = this.getDuckSrc();
        }
        this.saveSettings();
    }

    setupSlider(sliderId, valueId, callback, decimals) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);

        slider.addEventListener('input', (e) => {
            const value = callback(e.target.value);
            valueDisplay.textContent = decimals > 0 ? parseFloat(value).toFixed(decimals) : value;
            this.saveSettings();
        });
    }

    updateSqueezeSliders() {
        document.getElementById('squeezeOutSpeed').value = this.settings.squeezeOutSpeed;
        document.getElementById('squeezeOutSpeedValue').textContent = this.settings.squeezeOutSpeed.toFixed(2);
        document.getElementById('squeezeInSpeed').value = this.settings.squeezeInSpeed;
        document.getElementById('squeezeInSpeedValue').textContent = this.settings.squeezeInSpeed.toFixed(2);
        document.getElementById('squeezeAmount').value = this.settings.squeezeAmount;
        document.getElementById('squeezeAmountValue').textContent = this.settings.squeezeAmount.toFixed(2);
    }

    updateSoundSliders() {
        document.getElementById('squeezeOutDuration').value = this.settings.squeezeOutDuration;
        document.getElementById('squeezeOutDurationValue').textContent = this.settings.squeezeOutDuration.toFixed(2);
        document.getElementById('squeezeOutBasePitch').value = this.settings.squeezeOutBasePitch;
        document.getElementById('squeezeOutBasePitchValue').textContent = this.settings.squeezeOutBasePitch;
        document.getElementById('squeezeOutPitchVariation').value = this.settings.squeezeOutPitchVariation;
        document.getElementById('squeezeOutPitchVariationValue').textContent = this.settings.squeezeOutPitchVariation;
        document.getElementById('squeezeOutVolume').value = this.settings.squeezeOutVolume;
        document.getElementById('squeezeOutVolumeValue').textContent = this.settings.squeezeOutVolume.toFixed(2);

        document.getElementById('squeezeInDuration').value = this.settings.squeezeInDuration;
        document.getElementById('squeezeInDurationValue').textContent = this.settings.squeezeInDuration.toFixed(2);
        document.getElementById('squeezeInBasePitch').value = this.settings.squeezeInBasePitch;
        document.getElementById('squeezeInBasePitchValue').textContent = this.settings.squeezeInBasePitch;
        document.getElementById('squeezeInPitchVariation').value = this.settings.squeezeInPitchVariation;
        document.getElementById('squeezeInPitchVariationValue').textContent = this.settings.squeezeInPitchVariation;
        document.getElementById('squeezeInVolume').value = this.settings.squeezeInVolume;
        document.getElementById('squeezeInVolumeValue').textContent = this.settings.squeezeInVolume.toFixed(2);
    }

    updateColorSliders() {
        document.getElementById('duckyHue').value = this.settings.hue;
        document.getElementById('duckyHueValue').textContent = this.settings.hue;
        document.getElementById('duckySaturation').value = this.settings.saturation;
        document.getElementById('duckySaturationValue').textContent = this.settings.saturation;
        document.getElementById('duckyLightness').value = this.settings.lightness;
        document.getElementById('duckyLightnessValue').textContent = this.settings.lightness;
    }

    setupEventListeners() {
        // Mouse down on ducky
        this.ducky.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.button !== 0) return; // only left button
            this.isDragging = true;
            this.isSqueezing = true;
            this.targetSqueezeAmount = 1;
            this.ducky.style.cursor = 'grabbing';

            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.lastTime = Date.now();
            this.lastMoveTime = Date.now(); // Reset on start of drag
            this.velocity = { x: 0, y: 0 };

            // Play squeeze-out sound
            this.playSqueezeSound(true);
        });

        // Mouse move (drag)
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const currentTime = Date.now();
                const dt = (currentTime - this.lastTime) / 1000;

                if (dt > 0) {
                    this.velocity.x = (e.clientX - this.lastMousePos.x) / dt;
                    this.velocity.y = (e.clientY - this.lastMousePos.y) / dt;
                }

                this.position.x = e.clientX - this.settings.size / 2;
                this.position.y = e.clientY - this.settings.size / 2;

                this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.lastTime = currentTime;
                this.lastMoveTime = currentTime; // Update last move time

                this.updateDuckyPosition();
            }
        });

        // Mouse up
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.isSqueezing = false;
                this.ducky.style.cursor = 'grab';

                // Only apply velocity if mouse was moving recently (within 100ms)
                const timeSinceLastMove = Date.now() - this.lastMoveTime;
                if (timeSinceLastMove < 100) {
                    // Apply acceleration multiplier to velocity on release
                    this.velocity.x *= this.settings.accelerationMultiplier;
                    this.velocity.y *= this.settings.accelerationMultiplier;
                } else {
                    // Reset velocity if no recent movement
                    this.velocity = { x: 0, y: 0 };
                }

                // Play squeeze-in sound (slower, longer)
                this.playSqueezeSound(false);
            }
        });

        // Mouse enter (hover effect)
        this.ducky.addEventListener('mouseenter', () => {
            if (!this.isDragging) {
                this.targetScale = 1.1;
            }
        });

        // Mouse leave
        this.ducky.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                this.targetScale = 1;
            }
        });

        // Speech Tab
        const speechEnabledCheckbox = document.getElementById('duckySpeechEnabled');
        const speechControls = document.getElementById('speechControls');

        speechEnabledCheckbox.addEventListener('change', (e) => {
            this.settings.speechEnabled = e.target.checked;
            speechControls.style.opacity = e.target.checked ? '1' : '0.5';
            speechControls.style.pointerEvents = e.target.checked ? 'auto' : 'none';

            if (e.target.checked) {
                this.scheduleSpeech();
            } else {
                if (this.speechTimeout) {
                    clearTimeout(this.speechTimeout);
                }
                if (this.isSpeaking) {
                    this.hideSpeech();
                }
            }
            this.saveSettings();
        });

        this.setupSlider('speechMinDelay', 'speechMinDelayValue', (val) => {
            this.settings.speechMinDelay = parseInt(val);
            return val;
        }, 0);

        this.setupSlider('speechMaxDelay', 'speechMaxDelayValue', (val) => {
            this.settings.speechMaxDelay = parseInt(val);
            return val;
        }, 0);

        this.setupSlider('speechTypeSpeed', 'speechTypeSpeedValue', (val) => {
            this.settings.speechTypeSpeed = parseInt(val);
            return val;
        }, 0);

        const speechSoundCheckbox = document.getElementById('duckySpeechSound');
        speechSoundCheckbox.addEventListener('change', (e) => {
            this.settings.speechSoundEnabled = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('resetSpeechSettings').addEventListener('click', () => {
            this.settings.speechEnabled = true;
            this.settings.speechMinDelay = 30;
            this.settings.speechMaxDelay = 90;
            this.settings.speechTypeSpeed = 100;
            this.settings.speechSoundEnabled = true;

            speechEnabledCheckbox.checked = true;
            speechControls.style.opacity = '1';
            speechControls.style.pointerEvents = 'auto';

            document.getElementById('speechMinDelay').value = 30;
            document.getElementById('speechMinDelayValue').textContent = 30;
            document.getElementById('speechMaxDelay').value = 90;
            document.getElementById('speechMaxDelayValue').textContent = 90;
            document.getElementById('speechTypeSpeed').value = 100;
            document.getElementById('speechTypeSpeedValue').textContent = 100;
            speechSoundCheckbox.checked = true;

            this.saveSettings();
            this.scheduleSpeech();
        });

        // Right click for settings
        this.ducky.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.settingsModal.style.display = 'block';
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.constrainPosition();
            this.updateDuckyPosition();
        });
    }

    startAnimationLoop() {
        const animate = () => {
            this.update();
            requestAnimationFrame(animate);
        };
        animate();
    }

    update() {
        if (!this.isOpen) return;

        // Smooth scale interpolation
        this.currentScale += (this.targetScale - this.currentScale) * 0.2;

        // Smooth squeeze interpolation - use custom speeds from settings
        const squeezeSpeed = this.isSqueezing ? this.settings.squeezeOutSpeed : this.settings.squeezeInSpeed;
        this.squeezeAmount += (this.targetSqueezeAmount - this.squeezeAmount) * squeezeSpeed;

        // Gradually return to normal when not squeezing
        if (!this.isSqueezing) {
            this.targetSqueezeAmount = 0;
        }

        // Update speech bubble position if visible
        if (this.speechBubble && this.speechBubble.style.display !== 'none') {
            this.updateSpeechBubblePosition();
        }

        // Smooth squash interpolation
        this.currentSquashX += (this.targetSquashX - this.currentSquashX) * this.squashDecaySpeed;
        this.currentSquashY += (this.targetSquashY - this.currentSquashY) * this.squashDecaySpeed;

        // Gradually return squash to normal
        this.targetSquashX += (1 - this.targetSquashX) * this.squashDecaySpeed;
        this.targetSquashY += (1 - this.targetSquashY) * this.squashDecaySpeed;

        // Apply physics when not dragging
        if (!this.isDragging) {
            // Apply friction
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;

            // Stop if velocity is too low
            if (Math.abs(this.velocity.x) < this.minVelocity) this.velocity.x = 0;
            if (Math.abs(this.velocity.y) < this.minVelocity) this.velocity.y = 0;

            // Update position
            this.position.x += this.velocity.x * 0.016; // Assuming 60fps
            this.position.y += this.velocity.y * 0.016;

            // Bounce off walls with directional squash
            const halfSize = this.settings.size / 2;

            if (this.position.x < -halfSize) {
                this.position.x = -halfSize;
                this.velocity.x *= -this.bounceDamping;
                // Squash horizontally (wider), stretch vertically (taller)
                this.targetSquashX = 1.3;
                this.targetSquashY = 0.7;
                const velocityMagnitude = Math.abs(this.velocity.x);
                if (velocityMagnitude > 0) {
                    const volumeMultiplier = Math.min(Math.max(velocityMagnitude / 5, 3), 10.0);
                    this.playBounceSound(volumeMultiplier);
                }
            }
            if (this.position.x > window.innerWidth - halfSize) {
                this.position.x = window.innerWidth - halfSize;
                this.velocity.x *= -this.bounceDamping;
                // Squash horizontally (wider), stretch vertically (taller)
                this.targetSquashX = 1.3;
                this.targetSquashY = 0.7;
                const velocityMagnitude = Math.abs(this.velocity.x);
                if (velocityMagnitude > 0) {
                    const volumeMultiplier = Math.min(Math.max(velocityMagnitude / 5, 3), 10.0);
                    this.playBounceSound(volumeMultiplier);
                }
            }
            if (this.position.y < -halfSize) {
                this.position.y = -halfSize;
                this.velocity.y *= -this.bounceDamping;
                // Squash vertically (taller), stretch horizontally (wider)
                this.targetSquashX = 0.7;
                this.targetSquashY = 1.3;
                const velocityMagnitude = Math.abs(this.velocity.y);
                if (velocityMagnitude > 0) {
                    const volumeMultiplier = Math.min(Math.max(velocityMagnitude / 5, 3), 10.0);
                    this.playBounceSound(volumeMultiplier);
                }
            }
            if (this.position.y > window.innerHeight - halfSize) {
                this.position.y = window.innerHeight - halfSize;
                this.velocity.y *= -this.bounceDamping;
                // Squash vertically (taller), stretch horizontally (wider)
                this.targetSquashX = 0.7;
                this.targetSquashY = 1.3;
                const velocityMagnitude = Math.abs(this.velocity.y);
                if (velocityMagnitude > 0) {
                    const volumeMultiplier = Math.min(Math.max(velocityMagnitude / 5, 3), 10.0);
                    this.playBounceSound(volumeMultiplier);
                }
            }

            this.updateDuckyPosition();
        }

        // Apply wobble animation if enabled
        let wobbleRotation = 0;
        if (this.settings.wobbleEnabled && !this.isDragging) {
            wobbleRotation = Math.sin(Date.now() * 0.002) * 3;
        }

        // Apply transforms - include squash scales
        const squeezeScaleX = 1 - this.squeezeAmount * this.settings.squeezeAmount;
        const squeezeScaleY = 1 + this.squeezeAmount * (this.settings.squeezeAmount * 1.3);

        this.ducky.style.transform = `
            translate(-50%, -50%) 
            scale(${this.currentScale * squeezeScaleX * this.currentSquashX}, ${this.currentScale * squeezeScaleY * this.currentSquashY})
            rotate(${wobbleRotation}deg)
        `;
    }

    updateDuckyPosition() {
        this.ducky.style.left = `${this.position.x + this.settings.size / 2}px`;
        this.ducky.style.top = `${this.position.y + this.settings.size / 2}px`;
    }

    constrainPosition() {
        const halfSize = this.settings.size / 2;
        this.position.x = Math.max(-halfSize, Math.min(window.innerWidth - halfSize, this.position.x));
        this.position.y = Math.max(-halfSize, Math.min(window.innerHeight - halfSize, this.position.y));
    }

    playSqueezeSound(isSqueezeOut) {
        if (!this.settings.soundEnabled) return;

        // Create audio context if needed
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Use custom durations from settings
        const duration = isSqueezeOut ? this.settings.squeezeOutDuration : this.settings.squeezeInDuration;

        // Create oscillators for a more authentic squeaky toy sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();

        const gainNode = ctx.createGain();
        const filterNode = ctx.createBiquadFilter();

        // Bandpass filter for that classic squeaky toy frequency range
        filterNode.type = 'bandpass';
        filterNode.Q.setValueAtTime(3, now); // Higher Q for more pronounced squeak

        if (isSqueezeOut) {
            // Squeeze OUT sound - sharp, descending squeak (air escaping quickly)
            const basePitch = this.settings.squeezeOutBasePitch + Math.random() * this.settings.squeezeOutPitchVariation;

            // Main squeak
            osc1.frequency.setValueAtTime(basePitch, now);
            osc1.frequency.exponentialRampToValueAtTime(basePitch * 0.5, now + duration);

            // Harmonic for richness
            osc2.frequency.setValueAtTime(basePitch * 2, now);
            osc2.frequency.exponentialRampToValueAtTime(basePitch, now + duration);

            // Sub harmonic for body
            osc3.frequency.setValueAtTime(basePitch * 0.5, now);
            osc3.frequency.exponentialRampToValueAtTime(basePitch * 0.25, now + duration);

            // Filter sweep for squeak character
            filterNode.frequency.setValueAtTime(basePitch * 1.5, now);
            filterNode.frequency.exponentialRampToValueAtTime(basePitch * 0.6, now + duration);

            // Sharp attack, quick decay like real squeeze toy
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.settings.squeezeOutVolume, now + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(this.settings.squeezeOutVolume * 0.4, now + duration * 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        } else {
            // Squeeze IN sound - gentler, ascending inhale (air being drawn in)
            const basePitch = this.settings.squeezeInBasePitch + Math.random() * this.settings.squeezeInPitchVariation;

            // Main inhale tone
            osc1.frequency.setValueAtTime(basePitch, now);
            osc1.frequency.exponentialRampToValueAtTime(basePitch * 2, now + duration);

            // Harmonic
            osc2.frequency.setValueAtTime(basePitch * 1.5, now);
            osc2.frequency.exponentialRampToValueAtTime(basePitch * 2.5, now + duration);

            // Sub harmonic
            osc3.frequency.setValueAtTime(basePitch * 0.6, now);
            osc3.frequency.exponentialRampToValueAtTime(basePitch * 1.2, now + duration);

            // Filter sweep for inhale character
            filterNode.frequency.setValueAtTime(basePitch * 0.8, now);
            filterNode.frequency.exponentialRampToValueAtTime(basePitch * 2, now + duration);

            // Gradual swell and fade like real inhale
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.settings.squeezeInVolume * 0.5, now + duration * 0.2);
            gainNode.gain.linearRampToValueAtTime(this.settings.squeezeInVolume, now + duration * 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        }

        // Use square wave for more toy-like character, mixed with sine for smoothness
        osc1.type = isSqueezeOut ? 'square' : 'sine';
        osc2.type = 'sine';
        osc3.type = 'sine';

        // Add air noise texture
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        noise.buffer = noiseBuffer;

        const noiseGain = ctx.createGain();
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.Q.setValueAtTime(0.5, now);

        // More prominent noise for squeeze out (air rushing)
        const noiseVolume = isSqueezeOut ? 0.08 : 0.03;
        noiseGain.gain.setValueAtTime(noiseVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        // Connect nodes
        osc1.connect(filterNode);
        osc2.connect(filterNode);
        osc3.connect(filterNode);
        filterNode.connect(gainNode);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        gainNode.connect(ctx.destination);
        noiseGain.connect(ctx.destination);

        // Start and stop
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        noise.start(now);

        osc1.stop(now + duration);
        osc2.stop(now + duration);
        osc3.stop(now + duration);
        noise.stop(now + duration);
    }

    playBounceSound(volumeMultiplier = 1.0) {
        if (!this.settings.soundEnabled) return;

        // Create audio context if needed
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const duration = 0.08;
        const now = ctx.currentTime;

        // Soft bounce sound
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + duration);
        osc.type = 'sine';

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08 * volumeMultiplier, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    async loadSpeechData() {
        try {
            const response = await fetch('duck-speeches.json');
            this.speechTexts = await response.json();

            // Start the speech cycle if enabled
            if (this.settings.speechEnabled) {
                this.scheduleSpeech();
            }
        } catch (e) {
            console.warn('Failed to load duck speeches:', e);
            // Fallback to minimal data
            this.speechTexts = {
                "motivation": {
                    "speeches": ["You've got this!", "Keep coding!"]
                }
            };
        }
    }

    overrideConsoleMethods() {
        console.error = (...args) => {
            const fullMessage = args.map(arg => String(arg)).join(' '); // Convert to string
            const truncatedMessage = fullMessage.length > 256 ? fullMessage.substring(0, 2056) + '...' : fullMessage;
            this.showErrorWarningBubble('error', truncatedMessage);
            this.originalConsoleError.apply(console, args); // Still log the full message to original console
        };

        console.warn = (...args) => {
            const fullMessage = args.map(arg => String(arg)).join(' '); // Convert to string
            const truncatedMessage = fullMessage.length > 256 ? fullMessage.substring(0, 256) + '...' : fullMessage;
            this.showErrorWarningBubble('warning', truncatedMessage);
            this.originalConsoleWarn.apply(console, args); // Still log the full message to original console
        };
    }

    showErrorWarningBubble(type, message) {
        if (this.isOpen === false) return;
        // Avoid queuing duplicates to prevent spam
        const isDuplicate = this.errorWarningQueue.some(item => item.type === type && item.message === message);
        if (isDuplicate) return;

        // If already showing a bubble, queue this one
        if (this.isShowingErrorBubble) {
            this.errorWarningQueue.push({ type, message });
            return;
        }

        this.isShowingErrorBubble = true;
        this.isSpeaking = true; // Pause random speeches

        // Create bubble if needed
        if (!this.speechBubble) {
            this.createSpeechBubble();
        }

        // Clear any ongoing typewriter from previous bubbles (safety net)
        if (this.isTyping) {
            clearTimeout(this.typeTimeout);
            this.isTyping = false;
        }

        // Set title based on type
        this.speechBubbleTitle.textContent = type === 'error' ? '❌ Error!' : '⚠️ Warning!';

        // Style based on type
        if (type === 'error') {
            this.speechBubble.style.background = '#ffcccc'; // Reddish tinge
            this.speechBubble.style.borderColor = '#cc0000';
        } else if (type === 'warning') {
            this.speechBubble.style.background = '#ffffcc'; // Yellowish tinge
            this.speechBubble.style.borderColor = '#cccc00';
        }

        // Position and show
        this.updateSpeechBubblePosition();
        this.speechBubble.style.display = 'block';

        // Clear previous dynamic content (tail and textContainer), but keep title
        while (this.speechBubble.children.length > 1) {
            this.speechBubble.removeChild(this.speechBubble.lastChild);
        }

        // Add tail with matching colors
        const tail = document.createElement('div');
        tail.style.cssText = `
        position: absolute;
        bottom: -15px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 15px solid transparent;
        border-right: 15px solid transparent;
        border-top: 15px solid ${type === 'error' ? '#cc0000' : type === 'warning' ? '#cccc00' : '#333'};
    `;
        const tailInner = document.createElement('div');
        tailInner.style.cssText = `
        position: absolute;
        bottom: 3px;
        left: -12px;
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 12px solid ${type === 'error' ? '#ffcccc' : type === 'warning' ? '#ffffcc' : 'white'};
    `;
        tail.appendChild(tailInner);
        this.speechBubble.appendChild(tail);

        const textContainer = document.createElement('div');
        this.speechBubble.appendChild(textContainer);

        // Expand bubble
        setTimeout(() => {
            this.speechBubble.style.transform = 'scale(1)';
        }, 10);

        // Typewriter effect for the message - no auto-hide timeout; let typewriter handle it
        setTimeout(() => {
            this.typewriterEffect(textContainer, message, this.hideErrorWarningBubble);
        }, 400);

        // Removed: Auto-hide setTimeout to prevent interrupting typewriter
    }

    // New method: Hide error/warning bubble and resume speeches
    hideErrorWarningBubble() {
        if (!this.speechBubble) return;

        // Clear any ongoing typewriter to prevent continued quacking or text additions
        if (this.isTyping) {
            clearTimeout(this.typeTimeout);
            this.isTyping = false;
        }

        this.speechBubble.style.transform = 'scale(0)';
        setTimeout(() => {
            this.speechBubble.style.display = 'none';
            this.isShowingErrorBubble = false;
            this.isSpeaking = false;

            // Process queue: Show next bubble only after full hide
            if (this.errorWarningQueue.length > 0) {
                const next = this.errorWarningQueue.shift();
                // Skip empty messages to avoid "nothing" displays
                if (next.message.trim()) {
                    this.showErrorWarningBubble(next.type, next.message);
                } else {
                    // Recursively check next in queue
                    this.hideErrorWarningBubble();
                }
            } else {
                // Resume random speeches if enabled and no queue
                if (this.settings.speechEnabled) {
                    this.scheduleSpeech();
                }
            }
        }, 300);
    }

    createSpeechBubble() {
        if (this.isOpen === false) return;

        this.speechBubble = document.createElement('div');
        this.speechBubble.className = 'duck-speech-bubble';
        this.speechBubble.style.cssText = `
            position: fixed;
            background: white; /* Default; will be overridden for errors/warnings */
            border: 3px solid #333;
            border-radius: 20px;
            padding: 15px 20px;
            font-family: 'Comic Sans MS', cursive, sans-serif;
            font-size: 16px;
            font-weight: bold;
            color: #333;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 99999;
            display: none;
            transform-origin: bottom center;
            transform: scale(0);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            pointer-events: auto;  // Allow clicks
        `;

        // Add title div
        this.speechBubbleTitle = document.createElement('div');
        this.speechBubbleTitle.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
            text-align: center;
        `;
        this.speechBubble.appendChild(this.speechBubbleTitle);

        const tail = document.createElement('div');
        tail.style.cssText = `
            position: absolute;
            bottom: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 15px solid #333;
        `;

        const tailInner = document.createElement('div');
        tailInner.style.cssText = `
        position: absolute;
        bottom: 3px;
        left: -12px;
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 12px solid white;
    `;

        tail.appendChild(tailInner);
        this.speechBubble.appendChild(tail);

        // Add click event listener to handle skipping typewriter or hiding bubble
        this.speechBubble.addEventListener('click', () => {
            if (this.isTyping) {
                // Skip typewriter: clear timeout, show full text, and schedule hide
                clearTimeout(this.typeTimeout);
                this.currentTextElement.textContent = this.currentFullText;
                this.isTyping = false;
                setTimeout(() => {
                    if (this.currentOnComplete) {
                        this.currentOnComplete.call(this);
                    } else {
                        this.hideSpeech();
                    }
                }, 2000);
            } else {
                // Hide bubble immediately
                if (this.currentOnComplete) {
                    this.currentOnComplete.call(this);
                } else {
                    this.hideSpeech();
                }
            }
        });

        document.body.appendChild(this.speechBubble);
    }

    scheduleSpeech() {
        if (!this.settings.speechEnabled || this.isOpen === false || this.isShowingErrorBubble) return;

        const minDelay = this.settings.speechMinDelay * 1000;
        const maxDelay = this.settings.speechMaxDelay * 1000;
        const delay = minDelay + Math.random() * (maxDelay - minDelay);

        this.speechTimeout = setTimeout(() => {
            this.showSpeech();
        }, delay);
    }

    showSpeech() {
        if (this.isSpeaking || this.isOpen === false || !this.speechTexts || this.isShowingErrorBubble) return;

        this.isSpeaking = true;

        // Create speech bubble if it doesn't exist
        if (!this.speechBubble) {
            this.createSpeechBubble();
        }

        // Reset to white background and default border for normal speech
        this.speechBubble.style.background = 'white';
        this.speechBubble.style.borderColor = '#333';

        // Get random topic and speech
        const topics = Object.keys(this.speechTexts);
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const speeches = this.speechTexts[randomTopic].speeches;
        const randomSpeech = speeches[Math.floor(Math.random() * speeches.length)];

        // Set title to category name with spaces
        // Set title to category name with spaces
        this.speechBubbleTitle.textContent = randomTopic.replace(/_/g, ' ');

        // Position speech bubble
        this.updateSpeechBubblePosition();

        // Show and animate bubble
        this.speechBubble.style.display = 'block';

        // Clear previous dynamic content (tail and textContainer), but keep title
        while (this.speechBubble.children.length > 1) {
            this.speechBubble.removeChild(this.speechBubble.lastChild);
        }

        // Add tail with default colors (white background)
        const tail = document.createElement('div');
        tail.style.cssText = `
            position: absolute;
            bottom: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 15px solid #333;
        `;

        const tailInner = document.createElement('div');
        tailInner.style.cssText = `
        position: absolute;
        bottom: 3px;
        left: -12px;
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 12px solid white;
    `;

        tail.appendChild(tailInner);
        this.speechBubble.appendChild(tail);

        const textContainer = document.createElement('div');
        this.speechBubble.appendChild(textContainer);

        // Expand bubble
        setTimeout(() => {
            this.speechBubble.style.transform = 'scale(1)';
        }, 10);

        // Wait for expansion, then type text
        setTimeout(() => {
            this.typewriterEffect(textContainer, randomSpeech);
        }, 400);
    }

    typewriterEffect(element, text, onComplete = null) {
        // Skip if text is empty to avoid issues
        if (!text.trim()) {
            if (onComplete) onComplete.call(this);
            return;
        }

        this.isTyping = true;
        this.currentTextElement = element;
        this.currentFullText = text;
        this.currentOnComplete = onComplete;

        const words = text.split(' ');
        let currentWord = 0;

        const typeNextWord = () => {
            if (currentWord < words.length) {
                if (currentWord > 0) {
                    element.textContent += ' ';
                }
                element.textContent += words[currentWord];

                // Play mini quack for each word
                this.playWordQuack();

                currentWord++;
                this.typeTimeout = setTimeout(typeNextWord, this.settings.speechTypeSpeed);
            } else {
                this.isTyping = false;
                // Text complete, wait then call onComplete (e.g., hide)
                setTimeout(() => {
                    if (onComplete) {
                        onComplete.call(this);
                    } else {
                        this.hideSpeech();
                    }
                }, 2000);
            }
        };

        typeNextWord();
    }

    playWordQuack() {
        if (!this.settings.speechSoundEnabled) return;
        if (this.isOpen === false) return;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const duration = 0.05;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Vary pitch slightly for each word
        const basePitch = 400 + Math.random() * 100;
        osc.frequency.setValueAtTime(basePitch, now);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 1.3, now + duration);
        osc.type = 'square';

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.03, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    hideSpeech() {
        if (!this.speechBubble) return;

        this.speechBubble.style.transform = 'scale(0)';

        setTimeout(() => {
            this.speechBubble.style.display = 'none';
            this.isSpeaking = false;

            // Schedule next speech
            this.scheduleSpeech();
        }, 300);
    }

    updateSpeechBubblePosition() {
        if (!this.speechBubble) return;

        // Position bubble above the duck with some spacing
        const bubbleHeight = this.speechBubble.offsetHeight || 100; // Estimate if not rendered
        const bubbleWidth = this.speechBubble.offsetWidth || 300; // Estimate if not rendered
        const spacing = 30; // Space between duck and bubble

        // Center the bubble horizontally on the duck, offset to account for transform
        this.speechBubble.style.left = `${this.position.x + this.settings.size / 2 - bubbleWidth / 2}px`;
        this.speechBubble.style.top = `${this.position.y - bubbleHeight - spacing}px`;
    }

    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.isOpen = true;
        this.ducky.style.display = 'block';
        if (this.toolbarButton) {
            this.toolbarButton.style.opacity = '1';
        }
        this.saveSettings();

        if (this.settings.speechEnabled) {
            this.scheduleSpeech();
        }
    }

    hide() {
        this.isOpen = false;
        this.ducky.style.display = 'none';
        if (this.toolbarButton) {
            this.toolbarButton.style.opacity = '0.6';
        }
        this.saveSettings();

        if (this.speechTimeout) {
            clearTimeout(this.speechTimeout);
        }
        if (this.isSpeaking) {
            this.hideSpeech();
        }
    }
}

// Initialize immediately - don't wait for DOMContentLoaded since we're already in app.js
if (!window.rubberDucky) {
    window.rubberDucky = new RubberDucky();
}