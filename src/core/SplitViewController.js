/**
 * SplitViewController - Manages split view between editor and game
 */
class SplitViewController {
    constructor() {
        this.isSplitView = false;
        this.orientation = 'horizontal'; // horizontal or vertical split
        this.splitRatio = 0.5; // 50% split by default
        
        // Find DOM elements
        this.editorView = document.getElementById('editorView');
        this.gameView = document.getElementById('gameView');
        this.centerPanel = document.querySelector('.center-panel');
        this.canvasContainer = document.querySelector('.canvas-container');
        
        // Check if elements were found
        if (!this.editorView || !this.gameView || !this.centerPanel || !this.canvasContainer) {
            console.warn("SplitViewController: Some required DOM elements not found");
        }
        
        // Store original styles to restore when disabling split view
        this.originalStyles = {
            editor: {},
            game: {},
            container: {}
        };
        
        console.log("SplitViewController initialized");
        
        // Initialize after a short delay to ensure DOM is ready
        setTimeout(() => this.init(), 100);

        // Add resize observer to monitor container dimensions
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    if (entry.target === this.canvasContainer && this.isSplitView) {
                        console.log("Container resized:", entry.contentRect.width, entry.contentRect.height);
                        // Update split view if dimensions change
                        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                            this.updateSplitViewSizes();
                        }
                    }
                }
            });
            
            if (this.canvasContainer) {
                this.resizeObserver.observe(this.canvasContainer);
            }
        }
    }
    
    /**
     * Initialize the controller
     */
    init() {
        // Increase initialization delay to ensure DOM is fully rendered
        setTimeout(() => {
            // First check if container is actually visible in DOM
            if (this.canvasContainer && this.canvasContainer.offsetParent === null) {
                console.warn("Canvas container is not visible in DOM. Making parent elements visible...");
                
                // Try to make all parent elements visible
                let parent = this.canvasContainer.parentElement;
                while (parent) {
                    if (window.getComputedStyle(parent).display === 'none') {
                        console.log("Making hidden parent visible:", parent);
                        parent.style.display = 'flex';
                    }
                    parent = parent.parentElement;
                }
            }
            
            // Ensure parent container has a valid display mode
            if (this.centerPanel) {
                if (getComputedStyle(this.centerPanel).display === 'none') {
                    this.centerPanel.style.display = 'flex';
                }
            }
            
            // Then ensure canvas container is properly displayed with explicit dimensions
            if (this.canvasContainer) {
                this.canvasContainer.style.display = 'flex';
                this.canvasContainer.style.minWidth = '400px';
                this.canvasContainer.style.minHeight = '300px';
                
                // Force a reflow to apply these styles
                this.canvasContainer.offsetHeight;
                
                // Store original dimensions and styles after ensuring minimum size
                this.saveOriginalStyles();
                
                // Log dimensions to check if they're valid
                console.log("SplitViewController initialized with dimensions:", 
                    this.canvasContainer.clientWidth, 
                    this.canvasContainer.clientHeight);
                    
                // If dimensions are still invalid, add another delayed check
                if (this.canvasContainer.clientWidth === 0 || this.canvasContainer.clientHeight === 0) {
                    console.log("Container still has invalid dimensions, scheduling final check");
                    setTimeout(() => {
                        // Apply explicit dimensions if still zero
                        if (this.canvasContainer.clientWidth === 0 || this.canvasContainer.clientHeight === 0) {
                            this.canvasContainer.style.width = '100%';
                            this.canvasContainer.style.height = '100%';
                            console.log("Forced explicit dimensions on container");
                        }
                    }, 300);
                }
            }
        }, 500); // Increased from 250ms to 500ms
        
        // Listen for window resize events
        window.addEventListener('resize', () => {
            if (this.isSplitView) {
                this.updateSplitViewSizes();
            }
        });
    }
    
    /**
     * Update split view dimensions when window resizes
     */
    updateSplitViewSizes() {
        if (!this.isSplitView) return;
    
        // First force the container to be visible with minimum dimensions
        this.canvasContainer.style.display = 'flex';
        this.canvasContainer.style.minWidth = '400px';
        this.canvasContainer.style.minHeight = '300px';
        
        // Force views to have minimum dimensions too
        this.editorView.style.minWidth = '200px';
        this.editorView.style.minHeight = '200px';
        this.gameView.style.minWidth = '200px';
        this.gameView.style.minHeight = '200px';
        
        // Set display mode explicitly
        this.editorView.style.display = 'block';
        this.gameView.style.display = 'block';
        
        // Force an immediate layout recalculation
        this.canvasContainer.offsetWidth;
        this.canvasContainer.offsetHeight;
        
        const totalWidth = this.canvasContainer.clientWidth;
        const totalHeight = this.canvasContainer.clientHeight;
        
        // Add more debug info to help track down the issue
        console.log("Container dimensions check:", {
            width: totalWidth,
            height: totalHeight,
            displayMode: window.getComputedStyle(this.canvasContainer).display,
            visibility: window.getComputedStyle(this.canvasContainer).visibility,
            containerExists: !!this.canvasContainer
        });
        
        if (totalWidth === 0 || totalHeight === 0) {
            console.warn("Container has invalid dimensions:", totalWidth, totalHeight);
            
            // IMPORTANT FIX: Check if container is actually visible in the DOM
            if (this.canvasContainer.offsetParent === null) {
                console.error("Container is not visible in DOM - parent elements may be hidden");
                
                // Try to make all parent elements visible
                let parent = this.canvasContainer.parentElement;
                while (parent) {
                    if (window.getComputedStyle(parent).display === 'none') {
                        console.log("Making hidden parent visible:", parent);
                        parent.style.display = 'block';
                    }
                    parent = parent.parentElement;
                }
            }
            
            const retryDelay = this._retryCount ? 
                Math.min(100 * Math.pow(2, this._retryCount), 2000) : 
                100;
            this._retryCount = (this._retryCount || 0) + 1;
            
            if (this._retryCount > 10) {
                console.error("Too many retry attempts, forcing dimensions anyway");
                this.editorView.style.width = '50%';
                this.gameView.style.width = '50%';
                this.editorView.style.height = '100%';
                this.gameView.style.height = '100%';
                this.forceCanvasResize();
                return;
            }
            
            console.log(`Scheduling retry #${this._retryCount} in ${retryDelay}ms`);
            setTimeout(() => this.updateSplitViewSizes(), retryDelay);
            return;
        }
        
        // Reset retry counter on success
        this._retryCount = 0;
        
        // Apply split dimensions
        if (this.orientation === 'horizontal') {
            this.editorView.style.width = `${this.splitRatio * 100}%`;
            this.gameView.style.width = `${(1 - this.splitRatio) * 100}%`;
            
            // Ensure heights are 100%
            this.editorView.style.height = '100%';
            this.gameView.style.height = '100%';
        } else {
            this.editorView.style.height = `${this.splitRatio * 100}%`;
            this.gameView.style.height = `${(1 - this.splitRatio) * 100}%`;
            
            // Ensure widths are 100%
            this.editorView.style.width = '100%';
            this.gameView.style.width = '100%';
        }
        
        // Force a reflow to ensure dimensions are applied
        this.canvasContainer.offsetHeight;
        
        // Give a bit more time for styles to fully apply before measuring
        setTimeout(() => {
            const editorRect = this.editorView.getBoundingClientRect();
            const gameRect = this.gameView.getBoundingClientRect();
            
            // Log the dimensions for debugging
            console.log(`Editor dimensions: ${editorRect.width}x${editorRect.height}`);
            console.log(`Game dimensions: ${gameRect.width}x${gameRect.height}`);
            
            // Force canvas resize
            this.forceCanvasResize();
        }, 50);
    }

    /**
     * Force both canvases to resize - extracted to a separate method for reuse
     */
    forceCanvasResize() {
        // Explicitly resize canvases if possible
        if (window.editor) {
            console.log("Refreshing editor canvas");
            window.editor.refreshCanvas();
        }
        if (window.engine) {
            console.log("Resizing game canvas");
            window.engine.resizeCanvas();
        }
        
        // Dispatch a resize event for any other listeners
        window.dispatchEvent(new Event('resize'));
    }
    
    /**
     * Toggle split view on/off
     */
    toggleSplitView() {
        if (this.isSplitView) {
            this.disableSplitView();
        } else {
            this.enableSplitView();
        }
    }
    
    /**
     * Enable split view mode
     */
    enableSplitView() {
        if (this.isSplitView) return;
    
        // Reset retry counters
        this._retryCount = 0;
        this._viewRetryCount = 0;
        
        // Store original styles
        this.saveOriginalStyles();
        
        // Check for container visibility first
        if (this.canvasContainer.offsetParent === null) {
            console.warn("Container is not visible in DOM, attempting to fix...");
            // Try to make all parent elements visible
            let parent = this.canvasContainer.parentElement;
            while (parent) {
                if (window.getComputedStyle(parent).display === 'none') {
                    console.log("Making hidden parent visible:", parent);
                    parent.style.display = 'flex';
                }
                parent = parent.parentElement;
            }
        }
        
        // IMPORTANT: First make sure the canvas container is visible and has dimensions
        this.canvasContainer.style.display = 'flex';
        this.canvasContainer.style.width = '100%'; // Add explicit width
        this.canvasContainer.style.height = '100%'; // Add explicit height
        this.canvasContainer.style.minWidth = '400px';
        this.canvasContainer.style.minHeight = '300px';
        this.canvasContainer.style.flexDirection = this.orientation === 'horizontal' ? 'row' : 'column';
        this.canvasContainer.style.overflow = 'hidden';
        this.canvasContainer.classList.add('split-active');
        
        // Force a reflow to apply these styles immediately
        this.canvasContainer.offsetWidth;
        this.canvasContainer.offsetHeight;
        
        // Check if dimensions are valid before continuing
        if (this.canvasContainer.clientWidth === 0 || this.canvasContainer.clientHeight === 0) {
            console.warn("Container still has invalid dimensions after style application:", 
                this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
            console.log("Will attempt to continue anyway...");
        }
        
        // Set dimensions based on orientation
        if (this.orientation === 'horizontal') {
            this.editorView.style.width = `${this.splitRatio * 100}%`;
            this.editorView.style.height = '100%';
            this.gameView.style.width = `${(1 - this.splitRatio) * 100}%`;
            this.gameView.style.height = '100%';
        } else {
            this.editorView.style.width = '100%';
            this.editorView.style.height = `${this.splitRatio * 100}%`;
            this.gameView.style.width = '100%';
            this.gameView.style.height = `${(1 - this.splitRatio) * 100}%`;
        }
        
        // Force a reflow after setting dimensions
        this.canvasContainer.offsetWidth;
        this.canvasContainer.offsetHeight;
        
        // Add resizer
        this.addSplitViewResizer();
        
        // Update tab states
        document.querySelectorAll('.canvas-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.classList.add('split-active');
        });
        
        this.isSplitView = true;
        
        // Check if the container now has valid dimensions before proceeding
        console.log("Container dimensions after setup:", 
            this.canvasContainer.clientWidth, 
            this.canvasContainer.clientHeight);
        
        // Use a single longer timeout to ensure all styles have been applied
        setTimeout(() => {
            // Measure again after delay
            console.log("Container dimensions after delay:", 
                this.canvasContainer.clientWidth, 
                this.canvasContainer.clientHeight);
            
            // Update sizes and force resize
            this.updateSplitViewSizes();
            
            // Start engine after split view is ready
            setTimeout(() => {
                if (window.engine && !window.engine.running) {
                    const gameRect = this.gameView.getBoundingClientRect();
                    if (gameRect.width > 10 && gameRect.height > 10) {
                        console.log("Starting engine with valid dimensions:", 
                            gameRect.width, gameRect.height);
                        window.engine.start();
                    } else {
                        console.warn("Game view still has invalid dimensions:", 
                            gameRect.width, gameRect.height);
                    }
                }
            }, 200);
        }, 200);
    }
    
    /**
     * Disable split view and return to tabbed mode
     */
    disableSplitView() {
        if (!this.isSplitView) return;
        
        // Remove resizer
        const resizer = document.querySelector('.split-view-resizer');
        if (resizer) resizer.remove();

        this.canvasContainer.classList.remove('split-active'); // Add this line
        
        // Restore original styles
        this.restoreOriginalStyles();
        
        // Hide game view, show only editor by default
        this.editorView.classList.add('active');
        this.editorView.classList.remove('split-view');
        this.gameView.classList.remove('active', 'split-view');
        
        // Update tab states
        document.querySelectorAll('.canvas-tab').forEach(tab => {
            tab.classList.remove('split-active');
            if (tab.getAttribute('data-canvas') === 'editor') {
                tab.classList.add('active');
            }
        });
        
        this.isSplitView = false;
        
        // Trigger resize events with a delay
        setTimeout(() => {
            if (window.editor) {
                window.editor.resizeCanvas();
            }
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
    
    /**
     * Change split orientation (horizontal/vertical)
     */
    toggleOrientation() {
        this.orientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        if (this.isSplitView) {
            // Re-apply split view with new orientation
            this.disableSplitView();
            this.enableSplitView();
        }
    }
    
    /**
     * Save original styles before modifying
     */
    saveOriginalStyles() {
        this.originalStyles.editor = {
            width: this.editorView.style.width,
            height: this.editorView.style.height,
            position: this.editorView.style.position,
            display: this.editorView.style.display
        };
        
        this.originalStyles.game = {
            width: this.gameView.style.width,
            height: this.gameView.style.height,
            position: this.gameView.style.position,
            display: this.gameView.style.display
        };
        
        this.originalStyles.container = {
            display: this.canvasContainer.style.display,
            flexDirection: this.canvasContainer.style.flexDirection
        };
    }
    
    /**
     * Restore original styles
     */
    restoreOriginalStyles() {
        Object.keys(this.originalStyles.editor).forEach(prop => {
            this.editorView.style[prop] = this.originalStyles.editor[prop];
        });
        
        Object.keys(this.originalStyles.game).forEach(prop => {
            this.gameView.style[prop] = this.originalStyles.game[prop];
        });
        
        Object.keys(this.originalStyles.container).forEach(prop => {
            this.canvasContainer.style[prop] = this.originalStyles.container[prop];
        });
    }
    
    /**
     * Add a resizer between the split views
     */
    addSplitViewResizer() {
        const resizer = document.createElement('div');
        resizer.className = 'split-view-resizer';
        
        // Set styles based on orientation
        if (this.orientation === 'horizontal') {
            resizer.style.cursor = 'col-resize';
            resizer.style.width = '8px';
            resizer.style.height = '100%';
        } else {
            resizer.style.cursor = 'row-resize';
            resizer.style.width = '100%';
            resizer.style.height = '8px';
        }
        
        // Add drag functionality
        let startPos, startEditorSize, startGameSize;
        
        resizer.addEventListener('mousedown', e => {
            e.preventDefault();
            
            startPos = this.orientation === 'horizontal' ? e.clientX : e.clientY;
            startEditorSize = this.orientation === 'horizontal' 
                ? this.editorView.getBoundingClientRect().width
                : this.editorView.getBoundingClientRect().height;
            startGameSize = this.orientation === 'horizontal' 
                ? this.gameView.getBoundingClientRect().width
                : this.gameView.getBoundingClientRect().height;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = e => {
            e.preventDefault();
            
            const currentPos = this.orientation === 'horizontal' ? e.clientX : e.clientY;
            const delta = currentPos - startPos;
            
            const totalSize = startEditorSize + startGameSize;
            const newEditorSize = Math.max(200, Math.min(totalSize - 200, startEditorSize + delta));
            const newGameSize = totalSize - newEditorSize;
            
            this.splitRatio = newEditorSize / totalSize;
            
            if (this.orientation === 'horizontal') {
                this.editorView.style.width = `${this.splitRatio * 100}%`;
                this.gameView.style.width = `${(1 - this.splitRatio) * 100}%`;
            } else {
                this.editorView.style.height = `${this.splitRatio * 100}%`;
                this.gameView.style.height = `${(1 - this.splitRatio) * 100}%`;
            }
            
            // Trigger resize events
            window.dispatchEvent(new Event('resize'));
        };
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // Trigger final resize events
            window.dispatchEvent(new Event('resize'));
        };
        
        // Insert resizer between views
        this.canvasContainer.insertBefore(resizer, this.gameView);
    }
}

// Export the class
window.SplitViewController = SplitViewController;

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.splitViewController = new SplitViewController();
});