import { HatGeometry } from './common/HatGeometry.js';
import { Tile } from './common/Tile.js';
import { Transform } from './common/Transform.js';

class SingleTileApp {
    // Presets for the different aperiodic variations
    static PRESETS = {
        chevron: { a: 0, b: 1, name: 'Chevron' },
        tile14: { a: 1, b: 4, name: 'Tile (1, 4)' },
        hat: { a: 1, b: Math.sqrt(3), name: 'Hat' },
        tile11: { a: 1, b: 1, name: 'Tile (1, 1)' },
        turtle: { a: Math.sqrt(3), b: 1, name: 'Turtle' },
        tile41: { a: 4, b: 1, name: 'Tile (4, 1)' },
        comet: { a: 1, b: 0, name: 'Comet' }
    };

    constructor(canvasId, aSlider, bSlider, curveSlider) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.aSlider = aSlider;
        this.bSlider = bSlider;
        this.curveSlider = curveSlider;
        
        this.displayWidth = 600;
        this.displayHeight = 400;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.loadPreset('hat');
        this.updateValues();
        this.draw();
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = this.displayWidth * dpr;
        this.canvas.height = this.displayHeight * dpr;
        this.canvas.style.width = `${this.displayWidth}px`;
        this.canvas.style.height = `${this.displayHeight}px`;
        
        this.ctx.scale(dpr, dpr);
    }
    
    setupEventListeners() {
        [this.aSlider, this.bSlider, this.curveSlider].forEach(slider => {
            slider.addEventListener('input', () => {
                this.updateValues();
                this.draw();
            });
        });
    }
    
    updateValues() {
        document.getElementById('a-val').textContent = parseFloat(this.aSlider.value).toFixed(3);
        document.getElementById('b-val').textContent = parseFloat(this.bSlider.value).toFixed(3);
        document.getElementById('curve-val').textContent = parseFloat(this.curveSlider.value).toFixed(3);
    }
    
    /**
     * Calculates the best scale to fit the tile on screen.
     * Adjusted to handle the 90-degree rotation.
     */
    calculateScale(a, b) {
        const COS_60 = Math.cos(Math.PI/3);
        const SIN_60 = Math.sin(Math.PI/3);
        
        // Calculate raw dimensions
        let width = (1 + COS_60) * b + 2 * SIN_60 * a;
        let height = 2 * SIN_60 * b + 2 * (1 + COS_60) * a;
        
        // If width or height is 0, we use a default "standard" size 
        // so we don't divide by zero.
        const minDim = 0.5; 
        const safeWidth = Math.max(width, minDim);
        const safeHeight = Math.max(height, minDim);
        
        const margin = 0.3;
        const scaleX = (this.displayWidth * (1 - 2 * margin)) / safeHeight;
        const scaleY = (this.displayHeight * (1 - 2 * margin)) / safeWidth;
        
        return Math.min(scaleX, scaleY);
    }
    
    draw() {
        // 1. Clear everything
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        const a = parseFloat(this.aSlider.value);
        const b = parseFloat(this.bSlider.value);
        const curve = parseFloat(this.curveSlider.value);
        
        // 2. Calculate scale with a "Cap"
        // This prevents the scale from becoming Infinity when a and b are 0
        const scale = this.calculateScale(a, b);
        const geometry = new HatGeometry(a, b);
    
        // 3. Setup the pose
        const verts = geometry.vertices;
        const cx = verts.reduce((sum, v) => sum + v.x, 0) / verts.length;
        const cy = verts.reduce((sum, v) => sum + v.y, 0) / verts.length;

        const centerX = this.displayWidth / 2;
        const centerY = this.displayHeight / 2;
        
        const pose = Transform.identity()
            .translate(centerX, centerY)
            .rotate(-Math.PI / 2)
            .multiply(Transform.scale(scale))
            .translate(-cx, -cy);
        
        const tile = new Tile(geometry, pose, Tile.COLORS.LIGHT_BLUE);
        
        // 4. THE FIX: Set the line width relative to the scale
        // We want it to be ~2 pixels on the screen. 
        // So we divide 2 by the current zoom level (scale).
    
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        tile.render(this.ctx, curve);
    }
    
    loadPreset(presetKey) {
        const preset = SingleTileApp.PRESETS[presetKey];
        
        this.aSlider.value = preset.a;
        this.bSlider.value = preset.b;
        this.curveSlider.value = 0;
        
        this.updateValues();
        this.draw();
    }
}

// Initialize the app
const app = new SingleTileApp(
    'canvas',
    document.getElementById('a'),
    document.getElementById('b'),
    document.getElementById('curve')
);

// Expose loadPreset for HTML buttons
window.loadPreset = (presetKey) => app.loadPreset(presetKey);