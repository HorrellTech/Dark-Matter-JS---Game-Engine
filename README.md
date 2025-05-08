# Dark Matter JS Game Engine

<p align="center">
  <img src="assets/logo.png" alt="Dark Matter JS Logo" width="300"/>
  <br>
  <em>A powerful, component-based 2D game engine for the web.</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#examples">Examples</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

## Overview

Dark Matter JS is a browser-based game development environment with an integrated editor and runtime engine. Built with modern web technologies, it provides a complete solution for creating, testing, and deploying 2D games directly in your browser.

The engine follows a component-based architecture similar to popular engines like Unity, making it intuitive for developers familiar with those tools while being accessible to newcomers.

## Features

### Core Engine Features
- **Component-Based Architecture**: Build games using reusable modules and components
- **Scene Management**: Organize your game with a flexible scene system
- **Game Object Hierarchy**: Parent-child relationships between game objects
- **Vector Math**: Built-in 2D vector mathematics for transformations and physics
- **Input System**: Comprehensive keyboard, mouse, and touch input handling

### Editor Features
- **Visual Editor**: Create and arrange game objects in a visual scene editor
- **Inspector Panel**: Modify object properties in real-time
- **Hierarchy View**: Manage game objects and their relationships
- **Project Browser**: Organize game assets and scripts
- **Console**: Debug your game with an integrated console
- **Play Mode**: Test your game instantly within the editor
- **Grid & Snapping**: Precise object placement with customizable grid

### Development Features
- **Script Editor**: Write and edit game scripts with syntax highlighting
- **Module System**: Create and manage reusable components
- **Scene Serialization**: Save and load your game scenes
- **Export System**: Package your games for distribution

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Basic knowledge of JavaScript and HTML

### Online Editor
The easiest way to get started is by using our online editor:
*(Coming soon)*

### Local Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Dark-Matter-JS---Game-Engine.git
```

2. Navigate to the project folder:
```bash
cd Dark-Matter-JS---Game-Engine
```

3. Open `index.html` in your browser or set up a local server:
```bash
# Using Python 3
python -m http.server

# Using Node.js
npx http-server
```

4. Access the editor at `http://localhost:8000` or the port specified by your server.

## Documentation

### Game Objects
Game objects are the fundamental building blocks in Dark Matter JS. Each game object can have:
- Transformation properties (position, rotation, scale)
- Parent-child relationships
- Multiple modules (components)
- Tags for organization

### Modules
Modules are components that add behavior and functionality to game objects:
- **Built-in Modules**
  - SpriteRenderer: Renders images and animations
  - Transform: Handles positioning and hierarchy
  - More coming soon...

- **Custom Modules**
  - Create your own modules by extending the Module class
  - Expose properties for the inspector
  - Implement lifecycle methods (preload, start, loop, etc.)

### Lifecycle Methods
When creating custom modules, you can implement these methods:
- `preload()`: Called before the game starts, used for loading assets
- `start()`: Called when the module is first activated
- `beginLoop()`: Called at the beginning of each frame
- `loop(deltaTime)`: Called every frame with the time since last frame
- `endLoop()`: Called at the end of each frame
- `draw(ctx)`: Called when the module should render
- `onDestroy()`: Called when the module is being destroyed

## Examples

### Creating a Simple Game Object
```javascript
// Create a new game object
const player = new GameObject("Player");
player.position = new Vector2(400, 300);

// Add it to the scene
scene.gameObjects.push(player);
```

### Creating a Custom Module
```javascript
class PlayerController extends Module {
    constructor() {
        super("PlayerController");
        
        this.speed = 5;
        this.health = 100;
        
        // Expose properties to the inspector
        this.exposeProperty("speed", "number", 5, { min: 0, max: 20 });
        this.exposeProperty("health", "number", 100);
    }
    
    start() {
        console.log("Player controller started!");
    }
    
    loop(deltaTime) {
        // Handle movement based on input
        if (window.input.isKeyDown("ArrowRight")) {
            this.gameObject.position.x += this.speed * deltaTime;
        }
        
        if (window.input.isKeyDown("ArrowLeft")) {
            this.gameObject.position.x -= this.speed * deltaTime;
        }
    }
}
```

## Architecture

Dark Matter JS consists of several key components:

### Core Systems
- **Engine**: Manages the game loop and runtime environment
- **Scene**: Organizes game objects and assets
- **GameObject**: Base entity for all in-game elements
- **Module**: Component system for extending functionality
- **InputManager**: Handles user input across platforms
- **SceneManager**: Handles loading and saving scenes

### Editor Systems
- **Editor**: Main interface for manipulating the game
- **HierarchyManager**: Manages object relationships
- **Inspector**: Property editor for game objects
- **FileBrowser**: Project asset management
- **ScriptEditor**: Code editing environment

## Development Roadmap

- [x] Core engine architecture
- [x] Visual editor with object manipulation
- [x] Component-based game object system
- [x] Scene management and serialization
- [x] Input handling system
- [ ] Asset management system
- [ ] Physics engine integration
- [ ] Audio system
- [ ] Animation system
- [ ] Particle effects
- [ ] HTML5 export
- [ ] WebGL functionality for better speeds and 3D

## License

This project is licensed under the MIT License - see the LICENSE file for details.

<p align="center">
  Made with ❤️ by <a href="https://github.com/yourusername">Your Name</a>
</p>