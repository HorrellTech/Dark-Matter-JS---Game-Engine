// Initialize editor components
document.addEventListener('DOMContentLoaded', () => {
    // Tab functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // Context menu for hierarchy
    let contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.display = 'none';
    document.body.appendChild(contextMenu);

    function showContextMenu(e, items) {
        e.preventDefault();
        contextMenu.innerHTML = items.map(item => 
            `<div class="context-menu-item">${item.label}</div>`
        ).join('');
        
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        
        // Add click handlers
        contextMenu.querySelectorAll('.context-menu-item').forEach((element, index) => {
            element.onclick = items[index].action;
        });
    }

     // and make it available globally (only define it once)
     const fileBrowser = new FileBrowser('fileBrowserContainer');
     window.fileBrowser = fileBrowser;

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // Hierarchy context menu
    document.getElementById('gameObjectHierarchy').addEventListener('contextmenu', (e) => {
        showContextMenu(e, [
            { 
                label: 'Add GameObject',
                action: () => { /* Add implementation */ }
            },
            { 
                label: 'Delete Selected',
                action: () => { /* Add implementation */ }
            }
        ]);
    });

    // Canvas tabs
    document.querySelectorAll('.canvas-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.canvas-tab, .canvas-view').forEach(el => 
                el.classList.remove('active')
            );
            tab.classList.add('active');
            document.getElementById(tab.dataset.canvas + 'View').classList.add('active');
        });
    });

    // Panel resize functionality
    function initResize(resizer, panel, isHorizontal) {
        let startPos = 0;
        let startSize = 0;

        function startResize(e) {
            startPos = isHorizontal ? e.clientY : e.clientX;
            startSize = isHorizontal ? panel.offsetHeight : panel.offsetWidth;
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        }

        function resize(e) {
            const currentPos = isHorizontal ? e.clientY : e.clientX;
            const diff = isHorizontal ? startPos - currentPos : currentPos - startPos;
            const newSize = Math.max(32, startSize + diff);
            
            if (isHorizontal) {
                panel.style.height = newSize + 'px';
            } else {
                panel.style.width = newSize + 'px';
            }
        }

        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }

        resizer.addEventListener('mousedown', startResize);
    }

    // Initialize resizers
    document.querySelectorAll('.resizer-v').forEach(resizer => {
        initResize(resizer, resizer.parentElement, false);
    });
    document.querySelectorAll('.resizer-h').forEach(resizer => {
        initResize(resizer, resizer.parentElement, true);
    });

    // Initialize grid functionality
    const editorCanvas = document.getElementById('editorCanvas');
    const grid = new EditorGrid(editorCanvas);

    // Grid controls
    document.getElementById('showGrid').addEventListener('change', (e) => {
        grid.showGrid = e.target.checked;
    });

    document.getElementById('gridSize').addEventListener('change', (e) => {
        grid.gridSize = parseInt(e.target.value);
    });

    document.getElementById('snapToGrid').addEventListener('change', (e) => {
        grid.snapToGrid = e.target.checked;
    });
});
