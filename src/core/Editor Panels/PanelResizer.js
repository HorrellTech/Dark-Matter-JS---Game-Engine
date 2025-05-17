/**
 * PanelResizer - Handles all panel resizing with proper canvas positioning
 */
class PanelResizer {
    constructor() {
        // Wait a moment for the DOM to be fully ready
        setTimeout(() => {
            this.setupCSSVariables();
            this.setupResizers();
            this.listenForWindowResize();
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
            
            // Apply minimum width to prevent collapsing too small
            newWidth = Math.max(newWidth, 100);
            
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
    
    updateCenterPanelWidth() {
        const centerPanel = document.querySelector('.center-panel');
        const hierarchyPanel = document.querySelector('.hierarchy-panel');
        const modulePanel = document.querySelector('.module-panel');
        
        if (centerPanel && hierarchyPanel && modulePanel) {
            const totalWidth = hierarchyPanel.offsetWidth + modulePanel.offsetWidth;
            centerPanel.style.width = `calc(100% - ${totalWidth}px)`;
        }
    }

    updateCenterPanelHeight() {
        const centerPanel = document.querySelector('.center-panel');
        const bottomPanel = document.querySelector('.bottom-panel');
        
        if (centerPanel && bottomPanel) {
            const totalHeight = bottomPanel.offsetHeight;
            centerPanel.style.height = `calc(100% - ${totalHeight}px)`;
        }
    }
    
    updateScrollContainers() {
        // Update hierarchy container height
        const hierarchyHeader = document.querySelector('.hierarchy-panel .hierarchy-header');
        const hierarchyList = document.getElementById('gameObjectHierarchy');
        
        if (hierarchyHeader && hierarchyList) {
            const headerHeight = hierarchyHeader.offsetHeight;
            const panelHeight = document.querySelector('.hierarchy-panel').offsetHeight;
            hierarchyList.style.maxHeight = (panelHeight - headerHeight) + 'px';
        }
        
        // Update inspector container height
        const inspectorHeader = document.querySelector('.module-panel .hierarchy-header');
        const inspectorList = document.getElementById('moduleSettings');
        
        if (inspectorHeader && inspectorList) {
            const headerHeight = inspectorHeader.offsetHeight;
            const panelHeight = document.querySelector('.module-panel').offsetHeight;
            inspectorList.style.maxHeight = (panelHeight - headerHeight) + 'px';
        }
    }
    
    listenForWindowResize() {
        window.addEventListener('resize', () => {
            this.updateCenterPanelWidth();
            this.updateScrollContainers();
            this.refreshCanvas();
        });
    }
    
    refreshCanvas() {
        if (window.editor && window.editor.refreshCanvas) {
            requestAnimationFrame(() => window.editor.refreshCanvas());
        }
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.panelResizer = new PanelResizer();
});