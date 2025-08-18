class AssetManager {
    constructor(fileBrowser = null) {
        this.fileBrowser = fileBrowser;
        this.cache = {};
        this.loadingPromises = {};
        this.modal = null;
        
        // Only initialize modal after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initModal());
        } else {
            this.initModal();
        }
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
 * Add embedded asset data for exported games
 * @param {Object} assetsData - Object containing all asset data
 */
    addEmbeddedAssets(assetsData) {
        console.log('Adding embedded assets:', Object.keys(assetsData));

        for (const [path, assetInfo] of Object.entries(assetsData)) {
            const normalizedPath = this.normalizePath(path);

            // Get all path variations
            const pathVariations = [
                path,
                normalizedPath,
                path.replace(/^[\/\\]+/, ''),
                normalizedPath.replace(/^[\/\\]+/, ''),
                '/' + path.replace(/^[\/\\]+/, ''),
                '/' + normalizedPath.replace(/^[\/\\]+/, ''),
                decodeURIComponent(path),
                decodeURIComponent(normalizedPath),
                path.split('/').pop(),
                normalizedPath.split('/').pop()
            ];

            // For images, load them as Image objects and cache both data URL and Image
            if (assetInfo.type && assetInfo.type.startsWith('image/')) {
                // First, cache the data URL immediately for fallback
                pathVariations.forEach(variation => {
                    if (variation && !this.cache[variation]) {
                        this.cache[variation + '_dataurl'] = assetInfo.content;
                    }
                });

                // Then load as HTMLImageElement asynchronously
                this.loadImage(assetInfo.content).then(img => {
                    pathVariations.forEach(variation => {
                        if (variation) {
                            this.cache[variation] = img;
                        }
                    });
                    console.log(`Cached image asset as HTMLImageElement: ${path} with ${pathVariations.length} path variations`);
                }).catch(error => {
                    console.error(`Failed to load embedded image ${path}:`, error);
                    // Fallback: keep the data URL in cache
                    pathVariations.forEach(variation => {
                        if (variation && !this.cache[variation]) {
                            this.cache[variation] = assetInfo.content;
                        }
                    });
                });
            } else {
                // Store the asset content directly in cache for non-images
                pathVariations.forEach(variation => {
                    if (variation) {
                        this.cache[variation] = assetInfo.content;
                    }
                });
                console.log(`Cached asset: ${path} with ${pathVariations.length} path variations`);
            }
        }
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
        const normalizedPath = this.normalizePath(path);

        try {
            if (this.cache[normalizedPath]) {
                return Promise.resolve(this.cache[normalizedPath]);
            }

            // Store multiple path variations for better lookup
            const pathVariations = [
                path,                                           // Original path
                normalizedPath,                                // Normalized path
                path.replace(/^[\/\\]+/, ''),                  // Remove leading slashes
                normalizedPath.replace(/^[\/\\]+/, ''),        // Remove leading slashes from normalized
                '/' + path.replace(/^[\/\\]+/, ''),            // Add leading slash
                '/' + normalizedPath.replace(/^[\/\\]+/, ''),  // Add leading slash to normalized
                decodeURIComponent(path),                      // URL decoded
                decodeURIComponent(normalizedPath),            // URL decoded normalized
                path.split('/').pop(),                         // Just filename
                normalizedPath.split('/').pop()                // Just filename from normalized
            ];

            // Remove duplicates
            const uniquePaths = [...new Set(pathVariations.filter(p => p && p.length > 0))];

            let promise;
            if (type && type.startsWith('image/')) {
                // If content is not a data URL, construct one
                if (typeof content === 'string' && !content.startsWith('data:')) {
                    content = `data:${type};base64,${content}`;
                }
                promise = this.loadImage(content);
            } else if (type && type.startsWith('audio/')) {
                if (typeof content === 'string' && !content.startsWith('data:')) {
                    content = `data:${type};base64,${content}`;
                }
                promise = this.loadAudio(content);
            } else if (type && (type.startsWith('application/json') || path.endsWith('.json'))) {
                let jsonObject;
                if (typeof content === 'string') {
                    jsonObject = JSON.parse(content);
                } else {
                    jsonObject = content;
                }

                // Cache under all path variations
                uniquePaths.forEach(variation => {
                    this.cache[variation] = jsonObject;
                });

                return Promise.resolve(jsonObject);
            } else {
                // Cache text content under all path variations
                uniquePaths.forEach(variation => {
                    this.cache[variation] = content;
                });

                return Promise.resolve(content);
            }

            this.loadingPromises[normalizedPath] = promise;

            promise.then(asset => {
                // Cache under all path variations
                uniquePaths.forEach(variation => {
                    this.cache[variation] = asset;
                    console.log('Cached asset under path:', variation);
                });

                delete this.loadingPromises[normalizedPath];
                console.log('Successfully cached asset with', uniquePaths.length, 'path variations');
            }).catch(error => {
                console.error(`Error caching asset ${normalizedPath}:`, error);
                delete this.loadingPromises[normalizedPath];
            });

            return promise;
        } catch (error) {
            console.error(`Error adding asset to cache for path ${path}:`, error);
            return Promise.reject(error);
        }
    }

    /**
 * Load an asset
 * @param {string} path - Path to the asset
 * @returns {Promise<any>} The loaded asset
 */
    loadAsset(path) {
        const normalizedPath = this.normalizePath(path);

        // Check cache first with all possible path variations
        const pathVariations = [
            path,
            normalizedPath,
            path.replace(/^[\/\\]+/, ''),
            normalizedPath.replace(/^[\/\\]+/, ''),
            '/' + path.replace(/^[\/\\]+/, ''),
            '/' + normalizedPath.replace(/^[\/\\]+/, ''),
            decodeURIComponent(path),
            decodeURIComponent(normalizedPath),
            path.split('/').pop(),
            normalizedPath.split('/').pop()
        ];

        for (const variation of pathVariations) {
            if (this.cache[variation]) {
                console.log('Found asset in cache with path variation:', variation);
                const cachedAsset = this.cache[variation];

                // Check if it's already a proper HTMLImageElement
                if (cachedAsset instanceof HTMLImageElement) {
                    return Promise.resolve(cachedAsset);
                }

                // If it's a data URL string for an image, convert it to HTMLImageElement
                if (typeof cachedAsset === 'string' && cachedAsset.startsWith('data:image/')) {
                    console.log('Converting cached data URL to HTMLImageElement for:', variation);
                    return this.loadImage(cachedAsset).then(img => {
                        // Update cache with the HTMLImageElement
                        pathVariations.forEach(v => {
                            this.cache[v] = img;
                        });
                        return img;
                    });
                }

                // For non-image assets, return as-is
                return Promise.resolve(cachedAsset);
            }
        }

        // Check if already loading
        if (this.loadingPromises[normalizedPath]) {
            return this.loadingPromises[normalizedPath];
        }

        // If not in cache and not loading, try to load from file system or URL
        let promise;

        if (this.fileBrowser && typeof this.fileBrowser.readFile === 'function') {
            // Try to load from file browser first
            promise = this.loadFromFileBrowser(normalizedPath);
        } else {
            // Fallback to URL loading
            promise = this.loadFromUrl(normalizedPath);
        }

        this.loadingPromises[normalizedPath] = promise;

        promise.then(asset => {
            // Cache under all path variations
            pathVariations.forEach(variation => {
                this.cache[variation] = asset;
            });
            delete this.loadingPromises[normalizedPath];
        }).catch(error => {
            console.error(`Failed to load asset ${normalizedPath}:`, error);
            delete this.loadingPromises[normalizedPath];
        });

        return promise;
    }

    /**
     * Load asset from file browser
     * @param {string} path - Asset path
     * @returns {Promise<any>} The loaded asset
     */
    async loadFromFileBrowser(path) {
        try {
            const content = await this.fileBrowser.readFile(path);
            if (!content) {
                throw new Error(`Asset not found in file browser: ${path}`);
            }

            // Determine type and process accordingly
            const extension = path.split('.').pop().toLowerCase();

            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                return this.loadImage(content);
            } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
                return this.loadAudio(content);
            } else if (extension === 'json') {
                return JSON.parse(content);
            } else {
                return content;
            }
        } catch (error) {
            throw new Error(`Failed to load asset from file browser: ${path} - ${error.message}`);
        }
    }

    /**
     * Load asset from URL (fallback method)
     * @param {string} path - Asset path
     * @returns {Promise<any>} The loaded asset
     */
    async loadFromUrl(path) {
        try {
            // Construct full URL
            const fullPath = this.basePath ? `${this.basePath}${path}` : path;

            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const extension = path.split('.').pop().toLowerCase();

            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                const blob = await response.blob();
                const dataUrl = await this.blobToDataURL(blob);
                return this.loadImage(dataUrl);
            } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
                const blob = await response.blob();
                const dataUrl = await this.blobToDataURL(blob);
                return this.loadAudio(dataUrl);
            } else if (extension === 'json') {
                return response.json();
            } else {
                return response.text();
            }
        } catch (error) {
            throw new Error(`Failed to load asset from URL: ${path} - ${error.message}`);
        }
    }

    /**
     * Convert Blob to data URL
     */
    async blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Load an image
     * @param {string} src - Image source (URL or data URL)
     * @returns {Promise<Image>} The loaded image
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    /**
     * Load an audio file
     * @param {string} src - Audio source (URL or data URL)
     * @returns {Promise<Audio>} The loaded audio
     */
    loadAudio(src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
            audio.src = src;
        });
    }
}

window.assetManager = new AssetManager(window.fileBrowser || null);