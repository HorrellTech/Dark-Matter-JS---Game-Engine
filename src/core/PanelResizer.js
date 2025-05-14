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
            e.preventDefault();
            startX = e.clientX;
            const panel = document.querySelector(panelSelector);
            startWidth = panel.offsetWidth;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.classList.add('resizing');
        });
        
        function handleMouseMove(e) {
            const dx = isGrowing ? (e.clientX - startX) : (startX - e.clientX);
            const newWidth = Math.max(150, Math.min(window.innerWidth / 2.5, startWidth + dx));
            
            const panel = document.querySelector(panelSelector);
            panel.style.width = `${newWidth}px`;
            
            // This is just to trigger a CSS variable update for horizontal panels
            if (panelSelector === '.hierarchy-panel') {
                document.documentElement.style.setProperty('--hierarchy-panel-width', `${newWidth}px`);
            } else if (panelSelector === '.module-panel') {
                document.documentElement.style.setProperty('--module-panel-width', `${newWidth}px`);
            }
            
            // Update center panel width to maintain layout
            self.updateCenterPanelWidth();
            //self.updateCenterPanelHeight()
            
            // Force canvas refresh
            self.refreshCanvas();
        }
        
        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.classList.remove('resizing');
            
            // One final refresh
            self.refreshCanvas();
        }
    }
    
    setupVerticalResizer(resizer) {
        let startY, startHeight;
        const self = this;
        
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            startY = e.clientY;
            const bottomPanel = document.querySelector('.bottom-panel');
            startHeight = bottomPanel.offsetHeight;
            
            // IMPORTANT: Add a resizing class to body to maintain state
            document.body.classList.add('resizing-bottom-panel');
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
        });
        
        function handleMouseMove(e) {
            const deltaY = startY - e.clientY;
            const newHeight = Math.max(50, Math.min(window.innerHeight * 0.7, startHeight + deltaY));
            
            // Update the CSS variable
            document.documentElement.style.setProperty('--bottom-panel-height', `${newHeight}px`);
            
            // CRITICAL: DON'T manipulate other element heights directly
            // ONLY update the CSS variable and let the CSS layout system handle it
            
            // Force canvas refresh WITHOUT changing its position
            self.refreshCanvas();
        }
        
        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.classList.remove('resizing-bottom-panel');
            
            // Final refresh without position changes
            self.refreshCanvas();
            self.updateScrollContainers();
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