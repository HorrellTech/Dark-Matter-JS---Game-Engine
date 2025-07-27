class AssetManager {
    constructor(fileBrowser) {
        this.fileBrowser = fileBrowser;
        this.cache = {};
        this.loadingPromises = {};
        this.modal = null;
        this.initModal();
    }

    initModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'asset-modal';
        this.modal.innerHTML = `
            <div class="asset-modal-content">
                <div class="asset-modal-header">
                    <h2 class="asset-modal-title">Export Assets</h2>
                    <button class="asset-modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="asset-modal-body">
                    <div class="asset-tree"></div>
                    <div class="asset-actions">
                        <button class="asset-button select-all">Select All</button>
                        <button class="asset-button export">Export Selected</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        this.modal.querySelector('.asset-modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        // Select all button
        this.modal.querySelector('.select-all').addEventListener('click', () => {
            const checkboxes = this.modal.querySelectorAll('.asset-item input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        });

        // Export button
        this.modal.querySelector('.export').addEventListener('click', () => {
            this.exportSelected();
        });
    }

    async showExportModal() {
        const files = await this.fileBrowser.getAllFiles();
        const tree = this.modal.querySelector('.asset-tree');
        tree.innerHTML = '';

        // Group files by directory
        const fileTree = this.buildFileTree(files);
        this.renderFileTree(fileTree, tree);

        this.modal.style.display = 'flex';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }

    buildFileTree(files) {
        const tree = {};
        files.forEach(file => {
            const parts = file.path.split('/').filter(Boolean);
            let current = tree;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    if (!current.files) current.files = [];
                    current.files.push(file);
                } else {
                    current.dirs = current.dirs || {};
                    current.dirs[part] = current.dirs[part] || {};
                    current = current.dirs[part];
                }
            });
        });
        return tree;
    }

    renderFileTree(tree, container, path = '') {
        // Render directories
        if (tree.dirs) {
            Object.entries(tree.dirs).forEach(([name, subTree]) => {
                const dirElement = document.createElement('div');
                dirElement.className = 'asset-directory';
                dirElement.innerHTML = `
                    <div class="asset-dir-header">
                        <input type="checkbox" data-path="${path}/${name}">
                        <i class="fas fa-folder"></i>
                        <span>${name}</span>
                    </div>
                    <div class="asset-dir-content"></div>
                `;
                container.appendChild(dirElement);

                // Handle directory checkbox
                const checkbox = dirElement.querySelector('input[type="checkbox"]');
                const content = dirElement.querySelector('.asset-dir-content');
                checkbox.addEventListener('change', () => {
                    const items = content.querySelectorAll('input[type="checkbox"]');
                    items.forEach(item => item.checked = checkbox.checked);
                });

                this.renderFileTree(subTree, content, `${path}/${name}`);
            });
        }

        // Render files
        if (tree.files) {
            tree.files.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.className = 'asset-item';
                fileElement.innerHTML = `
                    <input type="checkbox" data-path="${file.path}">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                `;
                container.appendChild(fileElement);
            });
        }
    }

    async exportSelected() {
        const selected = this.modal.querySelectorAll('.asset-item input[type="checkbox"]:checked');
        const files = [];

        for (const checkbox of selected) {
            const path = checkbox.dataset.path;
            const file = await this.fileBrowser.getFile(path);
            if (file) {
                files.push({
                    path: file.path,
                    content: file.content,
                    type: file.type,
                    name: file.name
                });
            }
        }

        if (files.length === 0) {
            alert('No files selected for export');
            return;
        }

        // Prompt for package name
        const packageName = await this.fileBrowser.promptDialog(
            'Export Assets',
            'Enter name for asset package:',
            'assets'
        );

        if (!packageName) return;

        // Create asset package
        const assetPackage = {
            name: packageName,
            version: '1.0',
            timestamp: Date.now(),
            files: files
        };

        // Create and download file
        const blob = new Blob([JSON.stringify(assetPackage)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${packageName}.dmjs`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.hideModal();
    }

    async importAssets(file) {
        try {
            const content = await this.readFileContent(file);
            const assetPackage = JSON.parse(content);

            if (!assetPackage.version || !assetPackage.files) {
                throw new Error('Invalid asset package format');
            }

            // Create directory based on package name or file name
            const packageName = assetPackage.name || file.name.replace('.dmjs', '');
            const importPath = `/${packageName}`;

            // Ensure the directory exists
            await this.fileBrowser.createDirectory(importPath);

            // Import files with adjusted paths
            for (const fileEntry of assetPackage.files) {
                // Extract the file name and any subdirectories from the original path
                const pathParts = fileEntry.path.split('/').filter(Boolean);
                const newPath = `${importPath}/${pathParts.join('/')}`;

                // Ensure parent directories exist
                const parentPath = newPath.substring(0, newPath.lastIndexOf('/'));
                if (parentPath !== importPath) {
                    await this.fileBrowser.createDirectory(parentPath);
                }

                // Write the file
                await this.fileBrowser.writeFile(newPath, fileEntry.content, true);
            }

            this.fileBrowser.refreshFiles();
            this.fileBrowser.showNotification(
                `Assets imported successfully to /${packageName}`,
                'info'
            );

            // Navigate to the newly created directory
            await this.fileBrowser.navigateTo(importPath);

        } catch (error) {
            console.error('Error importing assets:', error);
            this.fileBrowser.showNotification('Error importing assets', 'error');
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e.target.error);
            reader.readAsText(file);
        });
    }

    normalizePath(path) {
        // Remove leading slashes and redundant slashes
        return path.replace(/^\/+/, '').replace(/\\/g, '/');
    }

    /**
     * Manually adds a pre-loaded asset (like a base64 data URL) to the cache.
     * This is used for standalone HTML exports.
     * @param {string} path - The asset's intended path (e.g., 'images/player.png').
     * @param {string} content - The asset content (e.g., a data URL).
     * @param {string} type - The MIME type of the asset (e.g., 'image/png').
     * @returns {Promise<any>} A promise that resolves when the asset is processed and cached.
     */
    addAssetToCache(path, content, type) {
        path = this.normalizePath(path);
        try {
            if (this.cache[path]) {
                return Promise.resolve(this.cache[path]);
            }

            let promise;
            if (type.startsWith('image/')) {
                // If content is not a data URL, construct one
                if (typeof content === 'string' && !content.startsWith('data:')) {
                    content = `data:${type};base64,${content}`;
                }
                promise = this.loadImage(content);
            } else if (type.startsWith('audio/')) {
                if (typeof content === 'string' && !content.startsWith('data:')) {
                    content = `data:${type};base64,${content}`;
                }
                promise = this.loadAudio(content);
            } else if (type.startsWith('application/json') || path.endsWith('.json')) {
                const jsonObject = JSON.parse(content);
                this.cache[path] = jsonObject;
                return Promise.resolve(jsonObject);
            } else {
                this.cache[path] = content;
                return Promise.resolve(content);
            }

            this.loadingPromises[path] = promise;

            promise.then(asset => {
                this.cache[path] = asset;
                delete this.loadingPromises[path];
            }).catch(() => {
                delete this.loadingPromises[path];
            });

            return promise;
        } catch (error) {
            console.error(`Error adding asset to cache for path ${path}:`, error);
            return Promise.reject(error);
        }
    }
}