class ProjectManager {
    constructor(editor, sceneManager, fileBrowser) {
        this.editor = editor;
        this.sceneManager = sceneManager;
        this.fileBrowser = fileBrowser;
        this.currentProjectName = "UntitledProject";
        this.isSavingOrLoading = false; // To prevent concurrent operations

        console.log("ProjectManager initialized");
    }

    async _confirmUnsavedChanges() {
        if (this.editor.activeScene && this.editor.activeScene.dirty) {
            const choice = await this.sceneManager.showUnsavedChangesDialog(); // 'save', 'dont-save', 'cancel'
            if (choice === 'cancel') {
                return false; // User cancelled
            }
            if (choice === 'save') {
                const saved = await this.sceneManager.saveCurrentScene();
                if (!saved) return false; // Save failed or was cancelled
            }
        }
        return true; // Proceed
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

            // 1. Reset File Browser
            await this.fileBrowser.resetDatabase(); // This clears and re-initializes with root
            await this.fileBrowser.navigateTo('/'); // Navigate to root after reset

            // 2. Reset Scenes
            this.editor.scenes = [];
            this.editor.createDefaultScene(); // Creates a new scene and sets it active

            // 3. Reset Editor State
            this.editor.camera.position.set(0, 0);
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

        } catch (error) {
            console.error("Error creating new project:", error);
            this.editor.fileBrowser.showNotification(`Error creating new project: ${error.message}`, "error");
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

        // Gather assets from FileBrowser
        const allFiles = await this.fileBrowser.getAllFiles(); // Assumes this gets all files with content
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
        return projectData;
    }

    async saveProject() {
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
            this.isSavingOrLoading = false;
        }
    }

    async loadProject() {
        if (this.isSavingOrLoading) {
            console.warn("Project operation already in progress.");
            this.editor.fileBrowser.showNotification("Operation in progress. Please wait.", "warn");
            return;
        }

        if (!await this._confirmUnsavedChanges()) {
            return;
        }
        this.isSavingOrLoading = true;
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

                // 4. Restore scenes
                console.log("Restoring scenes...");
                const loadedScenes = [];
                for (const sceneJSON of projectData.scenes) {
                    const scene = Scene.fromJSON(sceneJSON);
                    scene.dirty = false; // Loaded scenes are initially not dirty
                    loadedScenes.push(scene);
                }
                this.editor.scenes = loadedScenes;
                console.log(`${this.editor.scenes.length} scenes restored.`);

                // 5. Restore editor settings
                console.log("Restoring editor settings...");
                const settings = projectData.editorSettings;
                if (settings) {
                    if (settings.camera) {
                        this.editor.camera.position.set(settings.camera.x, settings.camera.y);
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

            } catch (error) {
                console.error("Error loading project:", error);
                this.editor.fileBrowser.showNotification(`Error loading project: ${error.message}`, "error");
                // Attempt to revert to a clean state if loading fails badly
                await this.newProject(); // Or a more specific error recovery
            } finally {
                this.isSavingOrLoading = false;
                input.value = ''; // Clear file input
            }
        };
        input.click();
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
}