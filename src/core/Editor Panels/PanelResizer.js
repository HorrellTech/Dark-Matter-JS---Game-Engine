/**
 * PanelResizer - Handles all panel resizing with proper canvas positioning
 */
class PanelResizer {
    constructor() {
        // Set up minimum sizes
        this.MIN_CENTER_PANEL_WIDTH = 400; // Minimum width for center panel
        this.MIN_HIERARCHY_WIDTH = 150;
        this.MIN_MODULE_WIDTH = 150;
        
        // Wait a moment for the DOM to be fully ready
        setTimeout(() => {
            this.setupCSSVariables();
            this.setupResizers();
            this.listenForWindowResize();
            this.setupEditorCanvasHandling();
        }, 100);
    }

    setupResizers() {
        // Set up left panel (hierarchy) resizer
        const leftResizer = document.querySelector('.hierarchy-panel .resizer-v');
        if (leftResizer) {
            this.setupHorizontalResizer(leftResizer, '.hierarchy-panel', true);
        }
        
        // Set up right panel (inspector) resizer
        const rightResizer = document.querySelector('.module-panel .resizer-v');
        if (rightResizer) {
            this.setupHorizontalResizer(rightResizer, '.module-panel', false);
        }
        
        // Set up bottom panel resizer - this is the critical one
        const bottomResizer = document.querySelector('.bottom-panel .resizer-h');
        if (bottomResizer) {
            this.setupVerticalResizer(bottomResizer);
        }
    }
    
    setupHorizontalResizer(resizer, panelSelector, isGrowing) {
        let startX, startWidth;
        const self = this;
        
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault(); // Prevent text selection
            document.body.classList.add('panel-resizing');
            
            startX = e.clientX;
            const panel = document.querySelector(panelSelector);
            startWidth = panel.offsetWidth;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        function handleMouseMove(e) {
            const panel = document.querySelector(panelSelector);
            let newWidth;
            
            if (isGrowing) {
                newWidth = startWidth + (e.clientX - startX);
            } else {
                newWidth = startWidth - (e.clientX - startX);
            }
            
            // Get total available width
            const totalWidth = window.innerWidth;
            const otherPanel = document.querySelector(isGrowing ? '.module-panel' : '.hierarchy-panel');
            const otherPanelWidth = otherPanel ? otherPanel.offsetWidth : 0;
            
            // Calculate max width to ensure center panel doesn't go below minimum width
            const maxWidth = totalWidth - otherPanelWidth - self.MIN_CENTER_PANEL_WIDTH;
            
            // Apply minimum and maximum width constraints
            newWidth = Math.max(
                isGrowing ? self.MIN_HIERARCHY_WIDTH : self.MIN_MODULE_WIDTH, 
                Math.min(newWidth, maxWidth)
            );
            
            // Update panel width
            panel.style.width = `${newWidth}px`;
            
            // Update CSS custom property
            document.documentElement.style.setProperty(
                `--${panelSelector.substring(1)}-width`,
                `${newWidth}px`
            );
            
            self.updateCenterPanelWidth();
            
            // Notify the game engine of panel resize during mouse move
            if (window.engine) {
                window.engine.resizeCanvas();
            }
        }
        
        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('panel-resizing');
            
            // Dispatch custom event for panel resize
            window.dispatchEvent(new CustomEvent('panel-resized'));
            
            // Force canvas resize now that panel resizing is complete
            if (window.engine) {
                window.engine.resizeCanvas();
            }
        }
    }
    
    setupVerticalResizer(resizer) {
        let startY, startHeight;
        const self = this;
        
        resizer.addEventListener('mousedown', function(e) {
            startY = e.clientY;
            const bottomPanel = document.querySelector('.bottom-panel');
            startHeight = bottomPanel.offsetHeight;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        function handleMouseMove(e) {
            const bottomPanel = document.querySelector('.bottom-panel');
            const deltaY = startY - e.clientY;
            const newHeight = startHeight + deltaY;
            
            // Apply minimum height to prevent collapsing too small
            const appliedHeight = Math.max(newHeight, 50);
            
            // Update panel height
            bottomPanel.style.height = `${appliedHeight}px`;
            
            // Update CSS custom property
            document.documentElement.style.setProperty(
                '--bottom-panel-height',
                `${appliedHeight}px`
            );
            
            self.updateCenterPanelHeight();
            
            // Notify the game engine of panel resize during mouse move
            if (window.engine) {
                window.engine.resizeCanvas();
            }
        }
        
        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            // Dispatch custom event for panel resize
            window.dispatchEvent(new CustomEvent('panel-resized'));
            
            // Force canvas resize now that panel resizing is complete
            if (window.engine) {
                window.engine.resizeCanvas();
            }
        }
    }
    
    updateCenterPanelHeight() {
        const centerPanel = document.querySelector('.center-panel');
        const bottomPanel = document.querySelector('.bottom-panel');
        
        if (centerPanel && bottomPanel) {
            const bottomHeight = bottomPanel.offsetHeight;
            const containerHeight = document.querySelector('.panels-container').offsetHeight;
            const centerHeight = containerHeight - bottomHeight;
            
            centerPanel.style.height = `${centerHeight}px`;
            
            // Dispatch panel resized event
            window.dispatchEvent(new CustomEvent('panel-resized'));
        }
    }
    
    setupCSSVariables() {
        // Set initial values for CSS variables
        const bottomPanel = document.querySelector('.bottom-panel');
        if (bottomPanel) {
            const height = bottomPanel.offsetHeight;
            document.documentElement.style.setProperty('--bottom-panel-height', `${height}px`);
        }
        
        const hierarchyPanel = document.querySelector('.hierarchy-panel');
        if (hierarchyPanel) {
            const width = hierarchyPanel.offsetWidth;
            document.documentElement.style.setProperty('--hierarchy-panel-width', `${width}px`);
        }
        
        const modulePanel = document.querySelector('.module-panel');
        if (modulePanel) {
            const width = modulePanel.offsetWidth;
            document.documentElement.style.setProperty('--module-panel-width', `${width}px`);
        }
    }
    
    maintainCanvasAspectRatio() {
        const canvas = document.getElementById('editorCanvas');
        if (!canvas) return;
        
        const container = canvas.closest('.editor-canvas-container');
        if (!container) return;
        
        // If we don't have an original ratio, get it now
        if (!this.originalCanvasRatio && canvas.width && canvas.height) {
            this.originalCanvasRatio = canvas.width / canvas.height;
        }
        
        // Default ratio if we still don't have one
        const aspectRatio = this.originalCanvasRatio || 16/9;
        
        // Get available space in container
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calculate dimensions that maintain aspect ratio
        let newWidth, newHeight;
        
        if (containerWidth / containerHeight > aspectRatio) {
            // Container is wider than needed - constrain by height
            newHeight = containerHeight;
            newWidth = containerHeight * aspectRatio;
        } else {
            // Container is taller than needed - constrain by width
            newWidth = containerWidth;
            newHeight = containerWidth / aspectRatio;
        }
        
        // Remove any minimum width constraints on the canvas
        canvas.style.minWidth = 'unset';
        canvas.style.minHeight = 'unset';
        
        // Apply new dimensions without stretching
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
        
        // Center the canvas in the container
        canvas.style.position = 'absolute';
        canvas.style.left = `${(containerWidth - newWidth) / 2}px`;
        canvas.style.top = `${(containerHeight - newHeight) / 2}px`;
        
        // Override any conflicting styles
        canvas.style.maxWidth = 'none';
        canvas.style.objectFit = 'contain';
    }
    
    updateCenterPanelWidth() {
        const centerPanel = document.querySelector('.center-panel');
        const hierarchyPanel = document.querySelector('.hierarchy-panel');
        const modulePanel = document.querySelector('.module-panel');
        
        if (centerPanel && hierarchyPanel && modulePanel) {
            const totalWidth = hierarchyPanel.offsetWidth + modulePanel.offsetWidth;
            const availableWidth = window.innerWidth;
            
            // Ensure center panel never goes below minimum width
            const centerWidth = Math.max(this.MIN_CENTER_PANEL_WIDTH, availableWidth - totalWidth);
            
            centerPanel.style.width = `${centerWidth}px`;
            
            // Add this call to maintain canvas aspect ratio
            this.maintainCanvasAspectRatio();
        }
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.panelResizer = new PanelResizer();
});