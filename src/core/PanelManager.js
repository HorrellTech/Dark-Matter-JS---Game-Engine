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
        });
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
        };
        
        // Mouse up handler - stop resizing
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            resizer.classList.remove('resizing');
            
            // Final update of stored sizes
            this.storePanelSizes();
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
        // Ensure panels respect their container sizes
        document.querySelectorAll('.panel-content').forEach(content => {
            // Force a reflow of scrollable content
            if (content.querySelector('.hierarchy-list')) {
                content.querySelector('.hierarchy-list').style.maxHeight = 
                    content.offsetHeight + 'px';
            }
            
            if (content.querySelector('.inspector-scroll-container')) {
                content.querySelector('.inspector-scroll-container').style.maxHeight = 
                    content.offsetHeight + 'px';
            }
            
            if (content.querySelector('.file-browser-content')) {
                content.querySelector('.file-browser-content').style.maxHeight = 
                    content.offsetHeight + 'px';
            }
        });
        
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
}

// Initialize the panel manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.panelManager = new PanelManager();
});