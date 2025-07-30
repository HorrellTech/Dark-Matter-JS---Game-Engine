class ProjectManager {
    constructor(editor, sceneManager, fileBrowser) {
        this.editor = editor;
        this.sceneManager = sceneManager;
        this.fileBrowser = fileBrowser;
        this.currentProjectName = "UntitledProject";
        this.isSavingOrLoading = false; // To prevent concurrent operations

        this.lastSaveTime = Date.now();
        this._startSaveReminderTimer();
        this.showSaveReminder = true;
        
        this.lastProjectFileHandle = null;
        this._loadLastProjectFileHandle();
        this._setupKeyboardShortcuts();

        console.log("ProjectManager initialized");
    }

    async _confirmUnsavedChanges() {
        if (this.editor.activeScene && this.editor.activeScene.dirty) {
            const choice = await this.sceneManager.showUnsavedChangesDialog(); // 'save', 'dont-save', 'cancel'
            if (choice === 'cancel') {
                this.isSavingOrLoading = false;
                return false; // User cancelled
            }
            if (choice === 'save') {
                const saved = await this.sceneManager.saveCurrentScene();
                if (!saved) return false; // Save failed or was cancelled
            }
        }
        return true; // Proceed
    }

    _startSaveReminderTimer() {
        setInterval(() => {
            if (this.isSavingOrLoading) return;
            const now = Date.now();
            const interval = 5; // 5 minutes
            if (now - this.lastSaveTime > interval * 60 * 1000) {
                this._showSaveReminderToast();
            }
        }, 60 * 1000); // Check every minute
    }

    _showSaveReminderToast() {
        if (document.getElementById('save-reminder-toast')) return; // Only one at a time

        if(!this.showSaveReminder) return; // User has disabled reminders

        // Play a "boop" sound
        try {
            //playSoftBloop(); // Play the bloop sound
        } catch (e) {
            // Ignore sound errors
        }

        const toast = document.createElement('div');
        toast.id = 'save-reminder-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '32px';
        toast.style.right = '-400px'; // Start off-screen
        toast.style.background = 'linear-gradient(90deg, #232526 0%, #414345 100%)';
        toast.style.color = '#fff';
        toast.style.padding = '18px 36px';
        toast.style.borderRadius = '12px';
        toast.style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)';
        toast.style.zIndex = '9999';
        toast.style.fontSize = '17px';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '24px';
        toast.style.transition = 'right 0.5s cubic-bezier(.68,-0.55,.27,1.55), opacity 0.3s';
        toast.style.opacity = '1';

        toast.innerHTML = `
            <span style="display:flex;align-items:center;gap:8px;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;">
                    <circle cx="12" cy="12" r="12" fill="#ffb400"/>
                    <text x="12" y="16" text-anchor="middle" font-size="14" fill="#222" font-family="Arial" font-weight="bold">!</text>
                </svg>
                <span>It's been a while since your last save. <b>Don't forget to save your project!</b></span>
            </span>
            <button style="background:#444;color:#fff;border:none;padding:6px 18px;border-radius:6px;cursor:pointer;font-size:15px;">Close</button>
        `;

        const closeBtn = toast.querySelector('button');
        closeBtn.onclick = () => {
            toast.style.opacity = '0';
            toast.style.right = '-400px';
            setTimeout(() => toast.remove(), 500);
        };

        document.body.appendChild(toast);

        // Slide in
        setTimeout(() => {
            toast.style.right = '32px';
        }, 10);

        // Auto-dismiss after 8 seconds (slide out)
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.right = '-400px';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    async newProject() {
        if (this.isSavingOrLoading) {
            console.warn("Project operation already in progress.");
            this.editor.fileBrowser.showNotification("Operation in progress. Please wait.", "warn");
            return;
        }
        this.isSavingOrLoading = true;
        this.editor.fileBrowser.showNotification("Creating new project...", "info");

        try {
            if (!await this._confirmUnsavedChanges()) {
                this.isSavingOrLoading = false;
                return;
            }

            console.log("Creating new project...");

            if (this.fileBrowser.db) {
                this.fileBrowser.db.close();
                this.fileBrowser.db = null;
            }

            // 1. Reset File Browser
            await this.fileBrowser.resetDatabase(); // This clears and re-initializes with root
            await this.fileBrowser.navigateTo('/'); // Navigate to root after reset

            // 2. Reset Scenes
            this.editor.scenes = [];
            this.editor.createDefaultScene(); // Creates a new scene and sets it active

            // 3. Reset Editor State
            if (this.editor.camera.position && typeof this.editor.camera.position.set === 'function') {
                this.editor.camera.position.set(0, 0);
            } else {
                this.editor.camera.position = { x: 0, y: 0 };
            }
            this.editor.camera.zoom = 1.0;
            this.editor.updateZoomLevelDisplay();
            if (this.editor.hierarchy) {
                this.editor.hierarchy.selectedObject = null;
                this.editor.hierarchy.refreshHierarchy();
            }
            if (this.editor.inspector) {
                this.editor.inspector.inspectObject(null);
            }
            // Reset other specific editor settings if needed (e.g., grid to defaults)
            this.editor.grid.showGrid = true;
            this.editor.grid.gridSize = 32;
            this.editor.grid.snapToGrid = false;
            // Update UI for grid settings
            const showGridCheckbox = document.getElementById('showGrid');
            const gridSizeInput = document.getElementById('gridSize');
            const snapToGridCheckbox = document.getElementById('snapToGrid');
            if (showGridCheckbox) showGridCheckbox.checked = this.editor.grid.showGrid;
            if (gridSizeInput) gridSizeInput.value = this.editor.grid.gridSize;
            if (snapToGridCheckbox) snapToGridCheckbox.checked = this.editor.grid.snapToGrid;


            this.currentProjectName = "UntitledProject";
            document.title = `Dark Matter JS - ${this.currentProjectName}*`;
            this.editor.refreshCanvas();
            this.editor.fileBrowser.showNotification("New project created.", "success");
            console.log("New project created successfully.");

            // Wait before scanning for scripts to let the database initialize fully
            setTimeout(() => {
                if (this.fileBrowser) {
                    this.fileBrowser.scanForModuleScripts()
                        .catch(err => console.warn("Post-creation script scan error:", err));
                }
            }, 1000);

        } catch (error) {
            console.error("Error creating new project:", error);
            this.editor.fileBrowser.showNotification(`Error creating new project: ${error.message}`, "error");
            this.isSavingOrLoading = false;
        } finally {
            this.isSavingOrLoading = false;
        }
    }

    async gatherProjectData() {
        console.log("Gathering project data...");
        const projectData = {
            projectName: this.currentProjectName,
            version: "1.0", // Project format version
            timestamp: Date.now(),
            editorSettings: {
                activeSceneName: this.editor.activeScene ? this.editor.activeScene.name : null,
                camera: {
                    x: this.editor.camera.position.x,
                    y: this.editor.camera.position.y,
                    zoom: this.editor.camera.zoom,
                },
                grid: {
                    showGrid: this.editor.grid.showGrid,
                    gridSize: this.editor.grid.gridSize,
                    snapToGrid: this.editor.grid.snapToGrid,
                },
                selectedObjectId: this.editor.hierarchy.selectedObject ? this.editor.hierarchy.selectedObject.id : null,
                inspectorCollapseStates: JSON.parse(localStorage.getItem('moduleCollapseStates') || '{}'),
                inspectorFolderCollapseStates: JSON.parse(localStorage.getItem('moduleFolderCollapseStates') || '{}'),
                activeBottomTab: document.querySelector('.tab-buttons .tab-button.active')?.dataset.tab || 'fileManager',
                activeCanvasTab: document.querySelector('.canvas-tabs .canvas-tab.active')?.dataset.canvas || 'editor',
            },
            scenes: [],
            assets: [],
        };

        // Gather scenes
        for (const scene of this.editor.scenes) {
            projectData.scenes.push(scene.toJSON());
        }
        console.log(`Gathered ${projectData.scenes.length} scenes.`);

        // Gather assets from FileBrowser - Make sure to handle the promise
        try {
            const allFiles = await this.fileBrowser.getAllFiles();
            projectData.assets = allFiles
                .filter(file => file.path !== '/') // Exclude root folder entry if it's just a placeholder
                .map(file => ({
                    path: file.path, // Full path including name
                    type: file.type, // 'file' or 'folder'
                    content: file.type === 'file' ? file.content : null, // Content for files
                    created: file.created,
                    modified: file.modified,
                }));
            console.log(`Gathered ${projectData.assets.length} asset entries.`);
        } catch (error) {
            console.error("Error gathering asset data:", error);
            projectData.assets = []; // Default to empty if there's an error
        }

        return projectData;
    }

    async saveProjectAs() {
        await this.saveProject({ saveAs: true });
    }

    async saveProject() {
        // Set a safety timeout to reset the loading state after 30 seconds
        // This prevents the UI from being permanently locked if something goes wrong
        const safetyTimeout = setTimeout(() => {
            if (this.isSavingOrLoading) {
                console.warn("Project operation timed out, resetting state.");
                this.isSavingOrLoading = false;
                this.editor.fileBrowser.showNotification("Operation timed out. Try again.", "error");
            }
        }, 30000); // 30 seconds timeout

        if (this.isSavingOrLoading) {
            console.warn("Project operation already in progress.");
            this.editor.fileBrowser.showNotification("Operation in progress. Please wait.", "warn");
            return;
        }
        this.isSavingOrLoading = true;
        this.editor.fileBrowser.showNotification("Saving project...", "info");

        try {
            const projectNameInput = prompt("Enter project name for saving:", this.currentProjectName);
            if (!projectNameInput) {
                this.editor.fileBrowser.showNotification("Save cancelled.", "warn");
                this.isSavingOrLoading = false;
                return;
            }
            this.currentProjectName = projectNameInput;

            const projectData = await this.gatherProjectData();
            const zip = new JSZip();

            // Add project.json
            zip.file("project.json", JSON.stringify(projectData, null, 2));

            // Add assets
            const assetsFolder = zip.folder("assets");
            for (const asset of projectData.assets) {
                if (asset.type === 'file') {
                    // JSZip handles paths correctly, remove leading '/' if present for consistency
                    const assetPath = asset.path.startsWith('/') ? asset.path.substring(1) : asset.path;
                    assetsFolder.file(assetPath, asset.content || ""); // Ensure content is not null
                } else if (asset.type === 'folder') {
                    // Create folder entries (JSZip creates folders implicitly if files are added to them,
                    // but explicit creation can be done if needed, or ensure paths are correct)
                    const folderPath = asset.path.startsWith('/') ? asset.path.substring(1) : asset.path;
                    if (folderPath) { // Avoid trying to create empty root folder ""
                        assetsFolder.folder(folderPath);
                    }
                }
            }

            const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

            this._triggerDownload(zipBlob, `${this.currentProjectName}.dmproj`);

            // Mark scenes as not dirty after successful save
            this.editor.scenes.forEach(s => s.dirty = false);
            if (this.editor.activeScene) this.editor.activeScene.dirty = false;
            document.title = `Dark Matter JS - ${this.currentProjectName}`; // Remove asterisk

            this.editor.fileBrowser.showNotification("Project saved successfully!", "success");
            console.log("Project saved successfully.");

        } catch (error) {
            console.error("Error saving project:", error);
            this.editor.fileBrowser.showNotification(`Error saving project: ${error.message}`, "error");
        } finally {
            clearTimeout(safetyTimeout);
            this.isSavingOrLoading = false;
        }
    }

    async loadProject() {
        // First ensure core classes are available
        if (!await this.ensureCoreDependencies()) {
            this.isSavingOrLoading = false;
            return;  // Stop if dependencies are missing
        }

        if (this.isSavingOrLoading) {
            console.warn("Project operation already in progress.");
            this.editor.fileBrowser.showNotification("Operation in progress. Please wait.", "warn");
            return;
        }
        this.isSavingOrLoading = true;

        // Set a safety timeout to reset the loading state after 30 seconds
        // This prevents the UI from being permanently locked if something goes wrong
        const safetyTimeout = setTimeout(() => {
            if (this.isSavingOrLoading) {
                console.warn("Project operation timed out, resetting state.");
                this.isSavingOrLoading = false;
                this.editor.fileBrowser.showNotification("Operation timed out. Try again.", "error");
            }
        }, 30000); // 30 seconds timeout

        if (!await this._confirmUnsavedChanges()) {
            this.isSavingOrLoading = false;
            clearTimeout(safetyTimeout);
            return;
        }
        this.editor.fileBrowser.showNotification("Loading project...", "info");

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.dmproj';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                this.editor.fileBrowser.showNotification("Load cancelled.", "warn");
                this.isSavingOrLoading = false;
                return;
            }

            try {
                const zip = await JSZip.loadAsync(file);
                console.log("Project archive loaded.");

                if (this.fileBrowser.db) {
                    this.fileBrowser.db.close();
                    this.fileBrowser.db = null;
                }

                // 1. Clear current project state
                await this.fileBrowser.resetDatabase();
                this.editor.scenes = [];
                this.editor.activeScene = null;
                if (this.editor.hierarchy) {
                    this.editor.hierarchy.selectedObject = null;
                    this.editor.hierarchy.refreshHierarchy();
                }
                if (this.editor.inspector) {
                    this.editor.inspector.inspectObject(null);
                }
                console.log("Cleared current project state.");

                // 2. Load project.json
                const projectJsonFile = zip.file("project.json");
                if (!projectJsonFile) {
                    throw new Error("project.json not found in the archive.");
                }
                const projectData = JSON.parse(await projectJsonFile.async("string"));
                this.currentProjectName = projectData.projectName || "LoadedProject";
                console.log(`Loaded project.json for: ${this.currentProjectName}`);

                // 3. Restore assets
                console.log("Restoring assets...");
                const assetPromises = [];
                zip.folder("assets").forEach((relativePath, fileEntry) => {
                    const fullPath = `/${relativePath}`; // FileBrowser uses leading slash
                    if (!fileEntry.dir) {
                        assetPromises.push(async () => {
                            const content = await fileEntry.async("string"); // Or "blob", "arraybuffer" depending on file type
                            await this.fileBrowser.writeFile(fullPath, content, true);
                        });
                    } else {
                        // Ensure directory exists (writeFile should handle parent dirs, but explicit can be added)
                        // assetPromises.push(this.fileBrowser.createDirectory(fullPath));
                    }
                });
                await Promise.all(assetPromises.map(p => p()));
                await this.fileBrowser.navigateTo('/'); // Refresh file browser view
                console.log("Assets restored.");

                console.log("Scanning for module scripts...");
                await this.fileBrowser.scanForModuleScripts();
                console.log("Module scripts scanned and registered.");

                // 4. Restore scenes
                console.log("Restoring scenes...");
                const loadedScenes = [];
                for (const sceneJSON of projectData.scenes) {
                    try {
                        const scene = Scene.fromJSON(sceneJSON);
                        scene.dirty = false;

                        // If GameObject was loaded after scene, try to complete loading
                        if (scene.gameObjectsJSON && scene.completeLoading) {
                            scene.completeLoading();
                        }

                        loadedScenes.push(scene);
                    } catch (error) {
                        console.error("Error loading scene:", error);
                        this.editor.fileBrowser.showNotification(`Error loading scene: ${error.message}`, "error");
                    }
                }
                this.editor.scenes = loadedScenes;
                console.log(`${this.editor.scenes.length} scenes restored.`);

                // 5. Restore editor settings
                console.log("Restoring editor settings...");
                const settings = projectData.editorSettings;
                if (settings) {
                    if (settings.camera) {
                        // Check if position is an object with set method (Vector2)
                        if (this.editor.camera.position && typeof this.editor.camera.position.set === 'function') {
                            this.editor.camera.position.set(settings.camera.x, settings.camera.y);
                        } else {
                            // Fallback: directly assign x and y properties
                            this.editor.camera.position = {
                                x: settings.camera.x,
                                y: settings.camera.y
                            };
                        }
                        this.editor.camera.zoom = settings.camera.zoom;
                        this.editor.updateZoomLevelDisplay();
                    }
                    if (settings.grid) {
                        this.editor.grid.showGrid = settings.grid.showGrid;
                        this.editor.grid.gridSize = settings.grid.gridSize;
                        this.editor.grid.snapToGrid = settings.grid.snapToGrid;
                        document.getElementById('showGrid').checked = settings.grid.showGrid;
                        document.getElementById('gridSize').value = settings.grid.gridSize;
                        document.getElementById('snapToGrid').checked = settings.grid.snapToGrid;
                    }
                    if (settings.inspectorCollapseStates) {
                        localStorage.setItem('moduleCollapseStates', JSON.stringify(settings.inspectorCollapseStates));
                    }
                    if (settings.inspectorFolderCollapseStates) {
                        localStorage.setItem('moduleFolderCollapseStates', JSON.stringify(settings.inspectorFolderCollapseStates));
                    }

                    // Restore active scene
                    const activeScene = this.editor.scenes.find(s => s.name === settings.activeSceneName);
                    if (activeScene) {
                        this.editor.setActiveScene(activeScene);
                    } else if (this.editor.scenes.length > 0) {
                        this.editor.setActiveScene(this.editor.scenes[0]); // Fallback
                    } else {
                        this.editor.createDefaultScene(); // Fallback if no scenes loaded
                    }

                    // Restore selected object (after hierarchy is populated by setActiveScene)
                    if (settings.selectedObjectId && this.editor.activeScene) {
                        const findObjectById = (id, gameObjects) => {
                            for (const obj of gameObjects) {
                                if (obj.id === id) return obj;
                                if (obj.children) {
                                    const found = findObjectById(id, obj.children);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        const selectedObj = findObjectById(settings.selectedObjectId, this.editor.activeScene.gameObjects);
                        if (selectedObj && this.editor.hierarchy) {
                            this.editor.hierarchy.selectGameObject(selectedObj);
                        }
                    }

                    // Restore active tabs
                    if (settings.activeBottomTab) {
                        document.querySelector(`.tab-buttons .tab-button[data-tab="${settings.activeBottomTab}"]`)?.click();
                    }
                    if (settings.activeCanvasTab) {
                        document.querySelector(`.canvas-tabs .canvas-tab[data-canvas="${settings.activeCanvasTab}"]`)?.click();
                    }
                }
                console.log("Editor settings restored.");

                document.title = `Dark Matter JS - ${this.currentProjectName}`;
                this.editor.refreshCanvas();
                this.editor.fileBrowser.showNotification("Project loaded successfully!", "success");
                console.log("Project loaded successfully.");

                this.isSavingOrLoading = false;

            } catch (error) {
                console.error("Error loading project:", error);
                this.editor.fileBrowser.showNotification(`Error loading project: ${error.message}`, "error");
                // Attempt to revert to a clean state if loading fails badly
                this.isSavingOrLoading = false;
                await this.newProject(); // Or a more specific error recovery
            } finally {
                clearTimeout(safetyTimeout);
                this.isSavingOrLoading = false;
                input.value = ''; // Clear file input
            }
        };
        input.click();
    }

    async ensureCoreDependencies() {
        // Check for essential classes
        const requiredClasses = ['GameObject', 'Scene', 'Vector2', 'Module'];
        const missingClasses = requiredClasses.filter(name => !window[name]);

        if (missingClasses.length === 0) {
            return true; // All classes are already available globally
        }

        // Try to load missing classes from their files
        for (const className of missingClasses) {
            try {
                await window.fileBrowser.loadScriptIfNeeded(className);
            } catch (err) {
                console.error(`Failed to load ${className}:`, err);
            }
        }

        console.warn(`Missing core classes in global scope: ${missingClasses.join(', ')}`);
        this.editor.fileBrowser.showNotification(
            `Making core classes globally available: ${missingClasses.join(', ')}...`,
            "info"
        );

        try {
            // Try to find classes that might be loaded but not on window object
            let success = true;

            // Common ways classes might be available
            for (const className of missingClasses) {
                // Try different approaches to find the class
                if (typeof eval(className) !== 'undefined') {
                    // Class exists in current scope but not on window
                    window[className] = eval(className);
                    console.log(`Made ${className} globally available from local scope`);
                } else {
                    // If not found in current scope, we need to load it
                    try {
                        console.log(`Attempting to load ${className} from file...`);
                        await this.loadClassFile(className);

                        // Check if it's now available
                        if (!window[className]) {
                            console.error(`${className} still not available globally after loading`);
                            success = false;
                        }
                    } catch (err) {
                        console.error(`Error loading ${className} from file:`, err);
                        success = false;
                    }
                }
            }

            // Check if we resolved all dependencies
            const stillMissing = requiredClasses.filter(name => !window[name]);
            if (stillMissing.length > 0) {
                throw new Error(`Failed to make required classes globally available: ${stillMissing.join(', ')}`);
            }

            this.editor.fileBrowser.showNotification(
                "Core dependencies are now globally available",
                "success"
            );
            return true;

        } catch (error) {
            console.error("Error ensuring core dependencies:", error);
            this.editor.fileBrowser.showNotification(
                `Error with core classes: ${error.message}`,
                "error"
            );
            return false;
        }
    }

    async tryAutoOpenLastProject() {
        // Try to open last project on startup
        if ('showOpenFilePicker' in window && this.lastProjectFileHandle) {
            try {
                const handle = await window.showOpenFilePicker({
                    types: [{ description: 'Dark Matter Project', accept: { 'application/zip': ['.dmproj'] } }],
                    startIn: this.lastProjectFileHandle
                });
                if (handle && handle[0]) {
                    await this._loadProjectFromHandle(handle[0]);
                    return true;
                }
            } catch {}
        } else if (this.lastProjectFileHandle) {
            // Not supported, just show a message
            // Could auto-load from IndexedDB or similar if implemented
        }
        return false;
    }

    _loadLastProjectFileHandle() {
        // Try to restore last file handle (if File System Access API is supported)
        if ('showOpenFilePicker' in window) {
            const handleStr = localStorage.getItem('lastProjectFileHandle');
            if (handleStr) {
                try {
                    this.lastProjectFileHandle = JSON.parse(handleStr);
                } catch {}
            }
        } else {
            this.lastProjectFileHandle = localStorage.getItem('lastProjectFileName') || null;
        }
    }

    _saveLastProjectFileHandle(handle, fileName) {
        if (handle) {
            // File System Access API
            localStorage.setItem('lastProjectFileHandle', JSON.stringify(handle));
        }
        if (fileName) {
            localStorage.setItem('lastProjectFileName', fileName);
        }
    }

    // Helper method to load class files
    async loadClassFile(className) {
        const classFilePaths = {
            'GameObject': './src/core/GameObject.js',
            'Scene': './src/core/Scene.js',
            'Vector2': './src/core/Math/Vector2.js',
            'Module': './src/core/Module.js'
        };

        const path = classFilePaths[className];
        if (!path) {
            throw new Error(`Path mapping not found for ${className}`);
        }

        // Try to get class from existing instances/prototypes if possible
        if (className === 'GameObject' && this.editor.activeScene) {
            // Try to get GameObject constructor from an existing instance
            if (this.editor.activeScene.gameObjects && this.editor.activeScene.gameObjects.length > 0) {
                const obj = this.editor.activeScene.gameObjects[0];
                if (obj && obj.constructor) {
                    window[className] = obj.constructor;
                    console.log(`Got ${className} constructor from existing instance`);
                    return;
                }
            }
        } else if (className === 'Scene') {
            // Try to get Scene constructor
            if (this.editor.activeScene && this.editor.activeScene.constructor) {
                window[className] = this.editor.activeScene.constructor;
                console.log(`Got ${className} constructor from existing instance`);
                return;
            }
        }

        // If we couldn't get the class from existing instances, try a more direct approach
        // Just define minimal versions of the classes that should work with serialization
        if (className === 'GameObject') {
            // Define a minimal GameObject class if it doesn't exist globally
            if (!window.GameObject) {
                window.GameObject = class GameObject {
                    constructor(name = "GameObject", transform = null) {
                        this.id = this.generateUUID();
                        this.name = name;
                        this.transform = transform || { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } };
                        this.components = [];
                        this.children = [];
                        this.parent = null;
                        this.active = true;
                        this.layer = "Default";
                        this.tags = [];
                    }

                    generateUUID() {
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    }

                    static fromJSON(json) {
                        const gameObject = new GameObject(json.name, json.transform);
                        gameObject.id = json.id;
                        gameObject.active = json.active;
                        gameObject.layer = json.layer || "Default";
                        gameObject.tags = json.tags || [];

                        if (json.children && json.children.length > 0) {
                            gameObject.children = json.children.map(childJson => {
                                const child = GameObject.fromJSON(childJson);
                                child.parent = gameObject;
                                return child;
                            });
                        }

                        return gameObject;
                    }
                };
                console.log("Created fallback GameObject class");
            }
        } else if (className === 'Scene') {
            // Define a minimal Scene class if it doesn't exist globally
            if (!window.Scene) {
                window.Scene = class Scene {
                    constructor(name = "New Scene") {
                        this.name = name;
                        this.gameObjects = [];
                        this.activeCamera = null;
                        this.settings = {};
                        this.dirty = false;
                    }

                    static fromJSON(json) {
                        const scene = new Scene(json.name);
                        scene.settings = json.settings || {};
                        scene.activeCamera = json.activeCamera;

                        if (json.gameObjects && Array.isArray(json.gameObjects)) {
                            if (window.GameObject) {
                                scene.gameObjects = json.gameObjects.map(objJson => GameObject.fromJSON(objJson));
                            } else {
                                scene.gameObjectsJSON = json.gameObjects;
                                console.warn("GameObject class not available. Game objects will be loaded when GameObject class is available.");
                            }
                        }

                        return scene;
                    }

                    completeLoading() {
                        if (this.gameObjectsJSON && window.GameObject) {
                            this.gameObjects = this.gameObjectsJSON.map(objJson => GameObject.fromJSON(objJson));
                            delete this.gameObjectsJSON;
                            return true;
                        }
                        return false;
                    }
                };
                console.log("Created fallback Scene class");
            }
        } else if (className === 'Vector2') {
            if (!window.Vector2) {
                window.Vector2 = class Vector2 {
                    constructor(x = 0, y = 0) {
                        this.x = x;
                        this.y = y;
                    }

                    set(x, y) {
                        this.x = x;
                        this.y = y;
                        return this;
                    }
                };
                console.log("Created fallback Vector2 class");
            }
        } else if (className === 'Module') {
            if (!window.Module) {
                window.Module = class Module {
                    constructor(name, properties = {}) {
                        this.name = name;
                        this.properties = properties;
                    }
                };
                console.log("Created fallback Module class");
            }
        }
    }

    _triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Download triggered for ${fileName}`);
    }

    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    this.saveProject();
                }
                if (e.key === 'o' || e.key === 'O') {
                    e.preventDefault();
                    this.loadProject();
                }
                if (e.shiftKey && (e.key === 's' || e.key === 'S')) {
                    e.preventDefault();
                    this.saveProjectAs();
                }
            }
        });
    }
}




// Create a soft bloop sound with reverb
function playSoftBloop() {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create oscillator for the main tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Create convolver for reverb effect
    const convolver = audioContext.createConvolver();
    const reverbGain = audioContext.createGain();

    // Generate impulse response for reverb
    function createReverbImpulse(duration, decay) {
        const length = audioContext.sampleRate * duration;
        const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const n = length - i;
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
            }
        }
        return impulse;
    }

    // Set up reverb
    convolver.buffer = createReverbImpulse(2, 2);
    reverbGain.gain.setValueAtTime(0.3, audioContext.currentTime); // Moderate reverb mix

    // Configure the bloop sound
    oscillator.type = 'sine'; // Soft sine wave
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime); // Starting frequency
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1); // Drop to lower frequency

    // Soft volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02); // Quick attack, not too loud
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4); // Gentle decay

    // Connect the audio graph
    // Dry signal path
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Wet (reverb) signal path
    gainNode.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(audioContext.destination);

    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Clean up
    oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        convolver.disconnect();
        reverbGain.disconnect();
    };
}

// You can also create a version that returns a promise for chaining
function playSoftBloopAsync() {
    return new Promise((resolve) => {
        playSoftBloop();
        setTimeout(resolve, 500); // Resolve after sound completes
    });
}

window.ProjectManager = ProjectManager;