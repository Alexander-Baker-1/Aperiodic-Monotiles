import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';
import { Transform } from './common/Transform.js';

class TilingApp {
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
        
        this.setupEventListeners();
        this.loadPreset('hat');
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
    
    loadPreset(presetKey) {
        const preset = TilingApp.PRESETS[presetKey];
        
        this.aSlider.value = preset.a;
        this.bSlider.value = preset.b;
        this.curveSlider.value = 0;
        
        this.updateValues();
        this.draw();
    }
    
    draw() {
        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 600;
    
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
    
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
        const a = Math.max(parseFloat(this.aSlider.value), 0.001);
        const b = Math.max(parseFloat(this.bSlider.value), 0.001);
        const curve = parseFloat(this.curveSlider.value);
    
        const geometry = new HatGeometry(a, b);
        const tiling = new TilingSystem(geometry);
    
        const tile1Transform = Transform.identity()
            .multiply(Transform.scale(25))
            .translate(500 / 25, 450 / 25)
            .rotate(Math.PI / 2 - 0.2);
    
        const t1 = tiling.addRootTile(tile1Transform, Tile.COLORS.WHITE);

        try {
            // CORE 
            const t2 = tiling.addAttachedTile(t1, 0, 11, { color: Tile.COLORS.LIGHT_BLUE });
            const t3 = tiling.addAttachedTile(t1, 3, 8, { color: Tile.COLORS.LIGHT_BLUE });
            const t4 = tiling.addAttachedTile(t1, 4, 11, { color: Tile.COLORS.LIGHT_BLUE });
            const t5 = tiling.addAttachedTile(t1, 8, 7, { color: Tile.COLORS.LIGHT_BLUE });
            const t6 = tiling.addAttachedTile(t1, 9, 2, { color: Tile.COLORS.LIGHT_BLUE });
            const t7 = tiling.addAttachedTile(t1, 12, 9, { color: Tile.COLORS.LIGHT_BLUE });

            // FIRST RING
            const t8 = tiling.addAttachedTile(t2, 1, 0, { color: Tile.COLORS.WHITE });
            const t9 = tiling.addAttachedTile(t2, 4, 10, { color: Tile.COLORS.DARK_BLUE });
            const t10 = tiling.addAttachedTile(t3, 0, 11, { color: Tile.COLORS.GRAY });
            const t11 = tiling.addAttachedTile(t3, 3, 2, { color: Tile.COLORS.WHITE });
            const t12 = tiling.addAttachedTile(t4, 4, 10, { color: Tile.COLORS.DARK_BLUE });
            const t13 = tiling.addAttachedTile(t5, 0, 11, { color: Tile.COLORS.GRAY });
            const t14 = tiling.addAttachedTile(t5, 3, 6, { color: Tile.COLORS.WHITE });
            const t15 = tiling.addAttachedTile(t6, 7, 8, { color: Tile.COLORS.WHITE });
            const t16 = tiling.addAttachedTile(t6, 9, 8, { color: Tile.COLORS.LIGHT_BLUE });
            const t17 = tiling.addAttachedTile(t6, 10, 0, { color: Tile.COLORS.DARK_BLUE });
            const t18 = tiling.addAttachedTile(t7, 0, 11, { color: Tile.COLORS.GRAY });
            
            // SECOND RING
            
            const t19 = tiling.addAttachedTile(t8, 11, 0, { color: Tile.COLORS.WHITE });
            const t20 = tiling.addAttachedTile(t9, 4, 10, { color: Tile.COLORS.LIGHT_BLUE });
            
            // THIRD RING

            const t21 = tiling.addAttachedTile(t10, 0, 11, { color: Tile.COLORS.GRAY });
            const t22 = tiling.addAttachedTile(t11, 11, 0, { color: Tile.COLORS.WHITE });
            const t23 = tiling.addAttachedTile(t12, 4, 10, { color: Tile.COLORS.LIGHT_BLUE });
            const t24 = tiling.addAttachedTile(t13, 0, 11, { color: Tile.COLORS.GRAY });
            const t25 = tiling.addAttachedTile(t16, 1, 0, { color: Tile.COLORS.GRAY });
        
        } catch (e) {
            console.error("Connection failed at some point in the chain:", e);
        }
    
        this.ctx.lineWidth = 1.5 / 25;
        this.ctx.strokeStyle = "black";
        tiling.render(this.ctx, curve); 
        // tiling.tiles.forEach((tile, i) => {
        //     tile.drawLabels(this.ctx);
        //     tile.drawTileLabel(this.ctx, `${i + 1}`);
        // });
    }
}

// Initialize the app
const app = new TilingApp(
    'canvas',
    document.getElementById('a'),
    document.getElementById('b'),
    document.getElementById('curve')
);

// Expose loadPreset for HTML buttons
window.loadPreset = (presetKey) => app.loadPreset(presetKey);