/**
 * PanelManager - Handles panel resizing and layout management
 */
class PanelManager {
    constructor() {
        this.initializeResizers();
        this.initializeLayout();
        
        // Store last known panel sizes in localStorage
        this.setupPersistence();
        
        // Apply initial sizes
        this.applyStoredSizes();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateLayoutConstraints();
            this.checkMobileMode();
        });

        // Ensure CSS is loaded
        this.ensureMobileCSS();

        // Mobile mode
        this.mobileEnabled = false;
        this.setupMobileMode();
        this.checkMobileMode();
    }

    /**
     * Test mobile mode
     */
    testMobileMode() {
        console.log("Testing mobile mode");
        this.enableMobileMode();
        
        // Open each panel in sequence with delays
        setTimeout(() => {
            const hierarchyPanel = document.querySelector('.hierarchy-panel');
            const toggleHierarchy = document.getElementById('toggleHierarchy');
            if (hierarchyPanel && toggleHierarchy) {
                this.toggleMobilePanel(hierarchyPanel, toggleHierarchy);
                console.log("Opened hierarchy panel");
            } else {
                console.error("Could not find hierarchy panel or toggle button");
            }
        }, 500);
        
        setTimeout(() => {
            const modulePanel = document.querySelector('.module-panel');
            const toggleInspector = document.getElementById('toggleInspector');
            if (modulePanel && toggleInspector) {
                this.toggleMobilePanel(modulePanel, toggleInspector);
                console.log("Opened inspector panel");
            } else {
                console.error("Could not find module panel or toggle button");
            }
        }, 1500);
        
        setTimeout(() => {
            const bottomPanel = document.querySelector('.bottom-panel');
            const toggleBottom = document.getElementById('toggleBottom');
            if (bottomPanel && toggleBottom) {
                this.toggleMobilePanel(bottomPanel, toggleBottom);
                console.log("Opened bottom panel");
            } else {
                console.error("Could not find bottom panel or toggle button");
            }
        }, 2500);
    }

    /**
     * Create mobile toggle buttons if they don't exist
     */
    ensureMobileToggles() {
        // Check if mobile toggles container exists
        let toggleContainer = document.querySelector('.mobile-panel-toggles');
        
        // If not, create it
        if (!toggleContainer) {
            console.log("Creating mobile panel toggles");
            toggleContainer = document.createElement('div');
            toggleContainer.className = 'mobile-panel-toggles';
            document.body.appendChild(toggleContainer);
            
            // Find panels
            const panels = this.findPanels();
            const { hierarchyPanel, modulePanel, bottomPanel } = panels;
            
            // Create hierarchy toggle
            if (!document.getElementById('toggleHierarchy') && hierarchyPanel) {
                const toggleHierarchy = document.createElement('button');
                toggleHierarchy.id = 'toggleHierarchy';
                toggleHierarchy.className = 'mobile-panel-button';
                toggleHierarchy.innerHTML = '<i class="fas fa-sitemap"></i>';
                toggleHierarchy.title = 'Toggle Hierarchy';
                toggleContainer.appendChild(toggleHierarchy);
                
                // Add event listener
                toggleHierarchy.addEventListener('click', () => {
                    this.toggleMobilePanel(hierarchyPanel, toggleHierarchy);
                });
            }
            
            // Create inspector toggle
            if (!document.getElementById('toggleInspector') && modulePanel) {
                const toggleInspector = document.createElement('button');
                toggleInspector.id = 'toggleInspector';
                toggleInspector.className = 'mobile-panel-button';
                toggleInspector.innerHTML = '<i class="fas fa-sliders-h"></i>';
                toggleInspector.title = 'Toggle Inspector';
                toggleContainer.appendChild(toggleInspector);
                
                // Add event listener
                toggleInspector.addEventListener('click', () => {
                    this.toggleMobilePanel(modulePanel, toggleInspector);
                });
            }
            
            // Create bottom toggle
            if (!document.getElementById('toggleBottom') && bottomPanel) {
                const toggleBottom = document.createElement('button');
                toggleBottom.id = 'toggleBottom';
                toggleBottom.className = 'mobile-panel-button';
                toggleBottom.innerHTML = '<i class="fas fa-folder"></i>';
                toggleBottom.title = 'Toggle Files/Console';
                toggleContainer.appendChild(toggleBottom);
                
                // Add event listener
                toggleBottom.addEventListener('click', () => {
                    this.toggleMobilePanel(bottomPanel, toggleBottom);
                });
            }
        }
    }

    /**
     * Ensure mobile CSS is loaded
     */
    ensureMobileCSS() {
        // Check if mobile CSS is loaded
        let mobileCSSLoaded = false;
        document.querySelectorAll('link').forEach(link => {
            if (link.href.includes('mobile-panels.css') || link.href.includes('mobile-management.css')) {
                mobileCSSLoaded = true;
            }
        });
        
        // If not loaded, add it
        if (!mobileCSSLoaded) {
            console.log("Adding mobile CSS link");
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'src/styles/mobile-management.css';
            document.head.appendChild(cssLink);
            
            // Add the CSS content directly as a fallback
            const fallbackStyle = document.createElement('style');
            fallbackStyle.textContent = `
                /* Mobile panel management */
                :root {
                    --panel-transition-time: 0.3s;
                }
                
                body.mobile-mode .main-content {
                    position: relative;
                    flex-direction: column;
                    height: calc(100vh - 56px);
                    overflow: hidden;
                }
                
                body.mobile-mode .hierarchy-panel,
                body.mobile-mode .module-panel,
                body.mobile-mode .bottom-panel {
                    position: absolute;
                    z-index: 100;
                    background-color: rgba(37, 37, 38, 0.95);
                    transition: transform var(--panel-transition-time) ease;
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
                    overflow: auto;
                    max-height: 80vh;
                }
                
                body.mobile-mode .hierarchy-panel {
                    top: 0;
                    left: 0;
                    width: 80%;
                    height: auto;
                    max-height: 80vh;
                    transform: translateX(-100%);
                    border-radius: 0 0 5px 0;
                }
                
                body.mobile-mode .module-panel {
                    top: 0;
                    right: 0;
                    width: 80%;
                    height: auto;
                    max-height: 80vh;
                    transform: translateX(100%);
                    border-radius: 0 0 0 5px;
                }
                
                body.mobile-mode .bottom-panel {
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 50%;
                    transform: translateY(100%);
                    border-radius: 5px 5px 0 0;
                }
                
                /* When panel is open */
                body.mobile-mode .hierarchy-panel.mobile-open {
                    transform: translateX(0);
                }
                
                body.mobile-mode .module-panel.mobile-open {
                    transform: translateX(0);
                }
                
                body.mobile-mode .bottom-panel.mobile-open {
                    transform: translateY(0);
                }
                
                /* Panel toggle buttons */
                .mobile-panel-toggles {
                    display: none;
                    position: absolute;
                    z-index: 101;
                    bottom: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: rgba(45, 45, 45, 0.9);
                    border-radius: 30px;
                    padding: 5px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                }
                
                body.mobile-mode .mobile-panel-toggles {
                    display: flex;
                }
                
                .mobile-panel-button {
                    width: 40px;
                    height: 40px;
                    margin: 0 5px;
                    border-radius: 50%;
                    border: none;
                    color: #ccc;
                    background: #333;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background-color 0.2s, color 0.2s;
                }
                
                .mobile-panel-button:hover,
                .mobile-panel-button.active {
                    background-color: #454545;
                    color: #fff;
                }
                
                /* Hide resizers in mobile mode */
                body.mobile-mode .resizer-h,
                body.mobile-mode .resizer-v {
                    display: none;
                }
            `;
            document.head.appendChild(fallbackStyle);
        }
    }
    
    /**
     * Initialize panel resizers
     */
    initializeResizers() {
        // Find all panel resizers
        document.querySelectorAll('.panel-resizer').forEach(resizer => {
            this.setupResizer(resizer);
        });
    }
    
    /**
     * Set up event handlers for a panel resizer
     * @param {HTMLElement} resizer - The resizer element
     */
    setupResizer(resizer) {
        // Determine which panels this resizer controls
        const topPanel = resizer.previousElementSibling;
        const bottomPanel = resizer.nextElementSibling;
        
        if (!topPanel || !bottomPanel) return;
        
        let startY;
        let startTopHeight;
        let startBottomHeight;
        let parentHeight;
        
        // Mouse down event - start resizing
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startTopHeight = topPanel.offsetHeight;
            startBottomHeight = bottomPanel.offsetHeight;
            parentHeight = topPanel.parentNode.offsetHeight;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            document.body.style.cursor = 'ns-resize';
            resizer.classList.add('resizing');
        });
        
        // Mouse move handler
        const handleMouseMove = (e) => {
            const deltaY = e.clientY - startY;
            
            // Calculate new heights ensuring minimum sizes
            const minHeight = 150; // Minimum panel height
            const maxTopHeight = parentHeight - minHeight;
            
            let newTopHeight = Math.max(minHeight, Math.min(maxTopHeight, startTopHeight + deltaY));
            
            // Update panel heights
            topPanel.style.height = newTopHeight + 'px';
            
            // Store the new sizes
            this.storePanelSizes();
            
            // Update any content that needs to reflow
            this.updateLayoutConstraints();
            
            // Force editor canvas refresh
            if (window.editor) {
                window.editor.refreshCanvas();
            }
        };
        
        // Mouse up handler - stop resizing
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            resizer.classList.remove('resizing');
            
            // Final update of stored sizes
            this.storePanelSizes();
            
            // Force a final layout update and canvas refresh
            this.updateLayoutConstraints();
            if (window.editor) {
                window.editor.refreshCanvas();
            }
        };
    }
    
    /**
     * Initialize the layout structure
     */
    initializeLayout() {
        // Add classes to main containers if needed
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.classList.add('editor-layout');
        }
        
        // Update layout constraints
        this.updateLayoutConstraints();
    }
    
    /**
     * Update layout constraints when window resizes or panels are resized
     */
    updateLayoutConstraints() {
        // Ensure editor section fills available space
        const editorSection = document.querySelector('.editor-section');
        if (editorSection) {
            editorSection.style.flex = '1';
        }
    
        // Force the editor canvas to update when container size changes
        const editorContainer = document.querySelector('.editor-canvas-container');
        const editorCanvas = document.getElementById('editorCanvas');
        
        if (editorContainer && editorCanvas) {
            // Measure the container without including scrollbars
            // by using clientWidth/Height instead of getBoundingClientRect
            const containerWidth = editorContainer.clientWidth;
            const containerHeight = editorContainer.clientHeight;
            
            // Resize canvas to match container exactly
            if (editorCanvas.width !== containerWidth || 
                editorCanvas.height !== containerHeight) {
                
                editorCanvas.width = containerWidth;
                editorCanvas.height = containerHeight;
                
                // Refresh the canvas if editor exists
                if (window.editor) {
                    window.editor.refreshCanvas();
                }
            }
        }
        
        // Ensure panels respect their container sizes
        document.querySelectorAll('.panel-content').forEach(content => {
            const parentHeight = content.parentElement.clientHeight;
            const headerHeight = content.parentElement.querySelector('.panel-header')?.clientHeight || 0;
            content.style.height = `${parentHeight - headerHeight}px`;
            
            // Force a reflow of scrollable content
            if (content.querySelector('.hierarchy-list')) {
                content.querySelector('.hierarchy-list').style.maxHeight = 
                    (content.offsetHeight - 10) + 'px';
            }
            
            if (content.querySelector('.inspector-scroll-container')) {
                content.querySelector('.inspector-scroll-container').style.maxHeight = 
                    (content.offsetHeight - 10) + 'px';
            }
            
            if (content.querySelector('.file-browser-content')) {
                content.querySelector('.file-browser-content').style.maxHeight = 
                    (content.offsetHeight - 10) + 'px';
            }
        });
        
        // Special handling for inspector scroll container
        const inspector = document.querySelector('.inspector-container');
        if (inspector) {
            const scrollContainer = inspector.querySelector('.inspector-scroll-container');
            const header = inspector.querySelector('.inspector-header');
            if (scrollContainer && header) {
                scrollContainer.style.height = `calc(100% - ${header.offsetHeight}px)`;
            }
        }
        
        // Trigger a custom event that other components can listen for
        window.dispatchEvent(new CustomEvent('panelsResized'));
    }
    
    /**
     * Set up persistence for panel sizes using localStorage
     */
    setupPersistence() {
        this.storageKey = 'darkMatterPanelSizes';
        
        // Store sizes whenever they change
        window.addEventListener('panelsResized', () => {
            this.storePanelSizes();
        });
    }
    
    /**
     * Store current panel sizes to localStorage
     */
    storePanelSizes() {
        try {
            const topPanel = document.querySelector('.top-panel');
            const bottomPanel = document.querySelector('.bottom-panel');
            
            if (!topPanel || !bottomPanel) return;
            
            const sizes = {
                topPanelHeight: topPanel.offsetHeight,
                timestamp: Date.now()
            };
            
            // Set CSS variable for bottom panel height
            document.documentElement.style.setProperty('--bottom-panel-height', bottomPanel.offsetHeight + 'px');
            
            localStorage.setItem(this.storageKey, JSON.stringify(sizes));
        } catch (error) {
            console.warn('Failed to store panel sizes:', error);
        }
    }
    
    /**
     * Apply stored panel sizes from localStorage
     */
    applyStoredSizes() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) return;
            
            const sizes = JSON.parse(storedData);
            const topPanel = document.querySelector('.top-panel');
            
            if (topPanel && sizes.topPanelHeight) {
                topPanel.style.height = sizes.topPanelHeight + 'px';
                this.updateLayoutConstraints();
            }
        } catch (error) {
            console.warn('Failed to apply stored panel sizes:', error);
        }
    }

    /**
     * Set up mobile mode functionality
     */
    setupMobileMode() {
        console.log("Mobile elements check:", {
            toggleHierarchy: document.getElementById('toggleHierarchy'),
            toggleInspector: document.getElementById('toggleInspector'),
            toggleBottom: document.getElementById('toggleBottom'),
            hierarchyPanel: document.querySelector('.hierarchy-panel'),
            modulePanel: document.querySelector('.module-panel'),
            bottomPanel: document.querySelector('.bottom-panel'),
            mobileOverlay: document.querySelector('.mobile-detection-overlay')
        });

        const toggleHierarchy = document.getElementById('toggleHierarchy');
        const toggleInspector = document.getElementById('toggleInspector');
        const toggleBottom = document.getElementById('toggleBottom');
        const hierarchyPanel = document.querySelector('.hierarchy-panel');
        const modulePanel = document.querySelector('.module-panel');
        const bottomPanel = document.querySelector('.bottom-panel');
        
        console.log("Mobile panels:", {
            hierarchyPanel,
            modulePanel,
            bottomPanel
        });

        if (toggleHierarchy && hierarchyPanel) {
            toggleHierarchy.addEventListener('click', () => {
                this.toggleMobilePanel(hierarchyPanel, toggleHierarchy);
            });
        }

        if (toggleInspector && modulePanel) {
            toggleInspector.addEventListener('click', () => {
                this.toggleMobilePanel(modulePanel, toggleInspector);
            });
        }

        if (toggleBottom && bottomPanel) {
            toggleBottom.addEventListener('click', () => {
                this.toggleMobilePanel(bottomPanel, toggleBottom);
            });
        }

        // Mobile detection overlay buttons
        const enableMobileMode = document.getElementById('enableMobileMode');
        const disableMobileMode = document.getElementById('disableMobileMode');
        const mobileOverlay = document.querySelector('.mobile-detection-overlay');

        if (enableMobileMode) {
            enableMobileMode.addEventListener('click', () => {
                this.enableMobileMode();
                if (mobileOverlay) mobileOverlay.style.display = 'none';
                localStorage.setItem('preferMobileMode', 'true');
            });
        }

        if (disableMobileMode) {
            disableMobileMode.addEventListener('click', () => {
                this.disableMobileMode();
                if (mobileOverlay) mobileOverlay.style.display = 'none';
                localStorage.setItem('preferMobileMode', 'false');
            });
        }

        // Check stored preference
        const preferMobileMode = localStorage.getItem('preferMobileMode');
        if (preferMobileMode === 'true') {
            this.enableMobileMode();
        } else if (preferMobileMode === 'false') {
            this.disableMobileMode();
        }
    }

    /**
     * Toggle a panel in mobile mode
     * @param {HTMLElement} panel - The panel to toggle
     * @param {HTMLElement} button - The button that triggered the toggle
     */
    toggleMobilePanel(panel, button) {
        if (!this.mobileEnabled) return;
        
        console.log("Toggling panel:", panel.className, "Button:", button.id);
    
        const wasOpen = panel.classList.contains('mobile-open');
        
        // Close all panels first
        document.querySelectorAll('.hierarchy-panel, .module-panel, .bottom-panel').forEach(p => {
            p.classList.remove('mobile-open');
        });
    
        document.querySelectorAll('.mobile-panel-button').forEach(btn => {
            btn.classList.remove('active');
        });
    
        // Toggle this panel if it wasn't already open
        if (!wasOpen) {
            panel.classList.add('mobile-open');
            button.classList.add('active');
            console.log("Panel opened:", panel.className);
        } else {
            console.log("Panel closed:", panel.className);
        }
        
        // Update canvas after panel toggle - with a delay to allow for CSS transitions
        setTimeout(() => {
            this.updateLayoutConstraints();
            if (window.editor) {
                window.editor.refreshCanvas();
            }
        }, 310); // Slightly longer than the CSS transition time (300ms)
    }

   /**
     * Check if we should switch to mobile mode based on screen size
     */
    checkMobileMode() {
        const isMobileSize = window.innerWidth <= 768;
        const preferMobileMode = localStorage.getItem('preferMobileMode');
        let mobileOverlay = document.querySelector('.mobile-detection-overlay');
        
        // Create overlay if it doesn't exist
        if (!mobileOverlay) {
            console.log("Creating mobile detection overlay");
            mobileOverlay = document.createElement('div');
            mobileOverlay.className = 'mobile-detection-overlay';
            mobileOverlay.innerHTML = `
                <h2>Mobile Device Detected</h2>
                <p>Dark Matter JS works best on desktop. Would you like to use the mobile-optimized interface?</p>
                <div>
                    <button id="enableMobileMode">Yes, use mobile mode</button>
                    <button id="disableMobileMode">No, use desktop mode</button>
                </div>
            `;
            document.body.appendChild(mobileOverlay);
            
            // Add event listeners
            const enableMobileMode = mobileOverlay.querySelector('#enableMobileMode');
            const disableMobileMode = mobileOverlay.querySelector('#disableMobileMode');
            
            enableMobileMode.addEventListener('click', () => {
                this.enableMobileMode();
                mobileOverlay.style.display = 'none';
                localStorage.setItem('preferMobileMode', 'true');
            });
            
            disableMobileMode.addEventListener('click', () => {
                this.disableMobileMode();
                mobileOverlay.style.display = 'none';
                localStorage.setItem('preferMobileMode', 'false');
            });
        }
        
        console.log("Mobile check:", {
            width: window.innerWidth,
            isMobileSize,
            preferMobileMode,
            mobileOverlay,
            currentlyEnabled: this.mobileEnabled
        });

        // If on mobile device size and no preference set, ask user
        if (isMobileSize && !this.mobileEnabled && preferMobileMode === null) {
            // Show mobile detection overlay if preference not set
            if (mobileOverlay) {
                console.log("Showing mobile overlay");
                mobileOverlay.style.display = 'flex';
            }
        } 
        // If on mobile size and preference set to mobile mode, enable it
        else if (isMobileSize && preferMobileMode === 'true') {
            this.enableMobileMode();
        } 
        // If on desktop size but mobile mode is enabled, disable it
        else if (!isMobileSize && this.mobileEnabled) {
            this.disableMobileMode();
        }

        // Add a UI element to toggle between modes regardless of screen size
        this.ensureModeToggleButton();
    }

    /**
     * Ensure there's a button to toggle between mobile and desktop mode
     */
    ensureModeToggleButton() {
        // Check if toggle button already exists
        let modeToggle = document.getElementById('modeToggleButton');
        
        if (!modeToggle) {
            // Create toggle button
            modeToggle = document.createElement('button');
            modeToggle.id = 'modeToggleButton';
            modeToggle.className = 'mode-toggle-button';
            modeToggle.title = this.mobileEnabled ? 'Switch to Desktop Mode' : 'Switch to Mobile Mode';
            modeToggle.innerHTML = this.mobileEnabled ? 
                '<i class="fas fa-desktop"></i>' : 
                '<i class="fas fa-mobile-alt"></i>';
            
            // Add to the UI in a visible location
            const toolbar = document.querySelector('.editor-toolbar');
            if (toolbar) {
                toolbar.appendChild(modeToggle);
            } else {
                // Fallback - add to body
                document.body.appendChild(modeToggle);
                // Position it in the top-right corner
                modeToggle.style.position = 'fixed';
                modeToggle.style.top = '5px';
                modeToggle.style.right = '5px';
                modeToggle.style.zIndex = '9999';
            }
            
            // Add click event listener
            modeToggle.addEventListener('click', () => {
                if (this.mobileEnabled) {
                    this.disableMobileMode();
                    localStorage.setItem('preferMobileMode', 'false');
                } else {
                    this.enableMobileMode();
                    localStorage.setItem('preferMobileMode', 'true');
                }
                
                // Update button icon and title
                modeToggle.title = this.mobileEnabled ? 'Switch to Desktop Mode' : 'Switch to Mobile Mode';
                modeToggle.innerHTML = this.mobileEnabled ? 
                    '<i class="fas fa-desktop"></i>' : 
                    '<i class="fas fa-mobile-alt"></i>';
            });
        }
        
        // Update button state to match current mode
        modeToggle.title = this.mobileEnabled ? 'Switch to Desktop Mode' : 'Switch to Mobile Mode';
        modeToggle.innerHTML = this.mobileEnabled ? 
            '<i class="fas fa-desktop"></i>' : 
            '<i class="fas fa-mobile-alt"></i>';
    }

    /**
     * Enable mobile mode
     */
    enableMobileMode() {
        console.log("Enabling mobile mode");
    
        // Ensure CSS and toggles are available
        this.ensureMobileCSS();
        this.ensureMobileToggles();
    
        document.body.classList.add('mobile-mode');
        this.mobileEnabled = true;
    
        // Close all panels initially
        const panels = document.querySelectorAll('.hierarchy-panel, .module-panel, .bottom-panel');
        console.log(`Found ${panels.length} panels to reset`);
        
        panels.forEach(panel => {
            panel.classList.remove('mobile-open');
        });

        // Ensure center panel fills the screen in mobile mode
        const centerPanel = document.querySelector('.center-panel');
        if (centerPanel) {
            centerPanel.style.width = '100%';
            centerPanel.style.left = '0';
        }
    
        const buttons = document.querySelectorAll('.mobile-panel-button');
        console.log(`Found ${buttons.length} buttons to reset`);
        
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });
    
        // Ensure toggle buttons are visible above panels
        const toggleContainer = document.querySelector('.mobile-panel-toggles');
        if (toggleContainer) {
            toggleContainer.style.zIndex = '10001';
        }
    
        // Adjust editor grid size for touch
        if (window.editor && window.editor.grid) {
            console.log("Adjusting grid size for touch");
            window.editor.grid.gridSize = Math.max(32, window.editor.grid.gridSize);
        }
    
        // Update mode toggle button if it exists
        const modeToggle = document.getElementById('modeToggleButton');
        if (modeToggle) {
            modeToggle.title = 'Switch to Desktop Mode';
            modeToggle.innerHTML = '<i class="fas fa-desktop"></i>';
        }
    
        // Force layout update after a delay
        setTimeout(() => {
            this.updateLayoutConstraints();
            if (window.editor) {
                window.editor.refreshCanvas();
            }
        }, 100);
    }

    /**
     * Disable mobile mode
     */
    disableMobileMode() {
        console.log("Disabling mobile mode");
        
        document.body.classList.remove('mobile-mode');
        this.mobileEnabled = false;
    
        // Update mode toggle button if it exists
        const modeToggle = document.getElementById('modeToggleButton');
        if (modeToggle) {
            modeToggle.title = 'Switch to Mobile Mode';
            modeToggle.innerHTML = '<i class="fas fa-mobile-alt"></i>';
        }
    
        // Refresh canvas for proper rendering
        if (window.editor) {
            window.editor.refreshCanvas();
        }
    }

    /**
     * Find panel elements based on their contents
     */
    findPanels() {
        console.log("Finding panels by content or class name...");
        
        // Try find by class first
        let hierarchyPanel = document.querySelector('.hierarchy-panel');
        let modulePanel = document.querySelector('.module-panel');
        let bottomPanel = document.querySelector('.bottom-panel');
        
        // If not found, try to identify panels by their content
        if (!hierarchyPanel || !modulePanel || !bottomPanel) {
            // Look for panels by their content
            for (const element of document.querySelectorAll('div')) {
                // Check for hierarchy panel
                if (!hierarchyPanel && element.querySelector('#gameObjectHierarchy')) {
                    hierarchyPanel = element;
                    // Add class for future reference
                    element.classList.add('hierarchy-panel');
                }
                
                // Check for inspector panel
                if (!modulePanel && element.querySelector('#moduleSettings')) {
                    modulePanel = element;
                    element.classList.add('module-panel');
                }
                
                // Check for bottom panel (file browser/console)
                if (!bottomPanel && (element.querySelector('#fileManager') || element.querySelector('#console'))) {
                    bottomPanel = element;
                    element.classList.add('bottom-panel');
                }
            }
        }
        
        console.log("Panel elements found:", {
            hierarchyPanel,
            modulePanel,
            bottomPanel
        });
        
        return {
            hierarchyPanel,
            modulePanel,
            bottomPanel
        };
    }
}

// Ensure the panel manager is initialized and exposed globally
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Initializing panel manager from event listener");
        window.panelManager = new PanelManager();
    });
} else {
    // DOM is already ready, initialize immediately
    console.log("Initializing panel manager immediately");
    window.panelManager = new PanelManager();
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PanelManager };
}

window.PanelManager = PanelManager;