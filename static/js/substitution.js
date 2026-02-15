import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class SubstitutionExplorer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.geometry = new HatGeometry(1, Math.sqrt(3));
        this.zoomLevel = 0; // 0 = one H, 1 = patch of metatiles, 2 = zoomed in more, etc.
        
        // Create slider
        this.createSlider();
        this.generate();
    }
    
    createSlider() {
        const container = document.createElement('div');
        container.className = 'controls';
        
        const sliderGroup = document.createElement('div');
        sliderGroup.className = 'control-group';
        
        const label = document.createElement('label');
        label.textContent = 'Zoom Level: ';
        sliderGroup.appendChild(label);
        
        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.min = '0';
        this.slider.max = '10';
        this.slider.value = '0';
        this.slider.step = '0.1';
        this.slider.className = 'slider';
        this.slider.addEventListener('input', () => this.generate());
        sliderGroup.appendChild(this.slider);
        
        this.zoomDisplay = document.createElement('span');
        this.zoomDisplay.textContent = '0.0';
        this.zoomDisplay.className = 'value-display';
        sliderGroup.appendChild(this.zoomDisplay);
        
        container.appendChild(sliderGroup);
        
        // Insert before canvas
        const canvasContainer = document.querySelector('.canvas-container');
        canvasContainer.parentNode.insertBefore(container, canvasContainer);
    }
    
    generate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const zoomValue = parseFloat(this.slider.value);
        this.zoomDisplay.textContent = ` ${zoomValue.toFixed(1)}`;
        
        const scale = 40 * Math.pow(1.5, zoomValue);
        
        const tiling = new TilingSystem(this.geometry);
        
        // Where you want the metatile positioned
        const posX = 600;
        const posY = 300;
        
        // Build transform: position comes AFTER scale
        // So the metatile stays centered as it scales
        const scaling = Matrix.scale(scale);
        const translation = Matrix.translation(posX, posY);
        
        // Pass them separately - buildHMetatile will combine as: translation * rotation * flip * scaling
        // That's correct order!
        this.buildManualPatch(tiling, translation, scaling);
        
        console.log(`Zoom: ${zoomValue.toFixed(1)}, Total tiles: ${tiling.tiles.length}`);
        tiling.draw(this.ctx, 0);
    }
    
    buildManualPatch(tiling, translation, scaling) {
        // Always show the main H metatile
        this.buildHMetatile(tiling, translation, scaling, 2.84 * Math.PI, false);
        
        // const zoomValue = parseFloat(this.slider.value);
        const zoomValue = 1.5;
        
        if (zoomValue > 1) {
            const smallScale = scaling.multiply(Matrix.scale(0.5)); // 30% of normal size
            const offset1 = translation.multiply(Matrix.translation(-110, 0));
            this.buildHMetatile(tiling, offset1, smallScale, 3.5 * Math.PI, false);


        }

        // Only show smaller metatiles when zoomed in past level 3
        if (zoomValue > 3) {
            // Make the smaller metatiles much smaller
            const smallScale = scaling.multiply(Matrix.scale(0.3)); // 30% of normal size
            
            // Manually position smaller metatiles around the main H
            // Adjust these positions to fit them edge-to-edge
            
            // Small H to the right
            const offset1 = translation.multiply(Matrix.translation(60, 0));
            this.buildHMetatile(tiling, offset1, smallScale, 2.84 * Math.PI, false);
            
            // Small P above
            const offset2 = translation.multiply(Matrix.translation(0, -50));
            this.buildPMetatile(tiling, offset2, smallScale, 1.5 * Math.PI, true);
            
            // Small T to the left
            const offset3 = translation.multiply(Matrix.translation(-40, 0));
            this.buildTMetatile(tiling, offset3, smallScale, 1.5 * Math.PI, true);
            
            // Small F below
            const offset4 = translation.multiply(Matrix.translation(0, 60));
            this.buildFMetatile(tiling, offset4, smallScale, 1.5 * Math.PI, true);
            
            // Add more small metatiles as needed...
        }
        
        // Show even tinier metatiles at higher zoom
        if (zoomValue > 6) {
            const tinyScale = scaling.multiply(Matrix.scale(0.1)); // 10% size
            
            // Position tiny metatiles
            const offset5 = translation.multiply(Matrix.translation(80, 80));
            this.buildHMetatile(tiling, offset5, tinyScale, 2.84 * Math.PI, false);
            
            // Add more...
        }
    }
    
    buildHMetatile(tiling, translation, scaling, rotationAngle, shouldFlip) {
        const rotation = Matrix.rotation(rotationAngle);
        const flip = shouldFlip ? Matrix.flipX() : Matrix.identity();
        const baseTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
        
        const rootTile = tiling.addRootTile(baseTransform, Tile.DARK_BLUE);
    
        const tile1 = Tile.createAttached([10, 11], rootTile, [4, 5], 
            { flipped: false, color: Tile.LIGHT_BLUE });
        tiling.tiles.push(tile1);
        
        const tile2 = Tile.createAttached([10, 11], rootTile, [0, 1], 
            { flipped: false, color: Tile.LIGHT_BLUE });
        tiling.tiles.push(tile2);
        
        const tile3 = Tile.createAttached([4, 5], rootTile, [10, 11], 
            { flipped: false, color: Tile.LIGHT_BLUE });
        tiling.tiles.push(tile3);
    }
    
    buildTMetatile(tiling, translation, scaling, rotationAngle, shouldFlip) {
        const rotation = Matrix.rotation(rotationAngle);
        const flip = shouldFlip ? Matrix.flipX() : Matrix.identity();
        const baseTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
        tiling.addRootTile(baseTransform, Tile.WHITE);
    }
    
    buildPMetatile(tiling, translation, scaling, rotationAngle, shouldFlip) {
        const rotation = Matrix.rotation(rotationAngle);
        const flip = shouldFlip ? Matrix.flipX() : Matrix.identity();
        const baseTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
        
        const rootTile = tiling.addRootTile(baseTransform, Tile.WHITE);
        const tile1 = Tile.createAttached([1, 0], rootTile, [11, 12], 
            { flipped: false, color: Tile.WHITE });
        tiling.tiles.push(tile1);
    }
    
    buildFMetatile(tiling, translation, scaling, rotationAngle, shouldFlip) {
        const rotation = Matrix.rotation(rotationAngle);
        const flip = shouldFlip ? Matrix.flipX() : Matrix.identity();
        const baseTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
        
        const rootTile = tiling.addRootTile(baseTransform, Tile.GRAY);
        
        const tile1 = Tile.createAttached([1, 0], rootTile, [11, 12], 
            { flipped: false, color: Tile.GRAY });
        tiling.tiles.push(tile1);

        const tile2 = Tile.createAttached([5, 4], rootTile, [1, 2], 
            { flipped: false, color: Tile.GRAY });
        tiling.tiles.push(tile2);

        const tile3 = Tile.createAttached([2, 1], tile2, [10, 11], 
            { flipped: false, color: Tile.GRAY });
        tiling.tiles.push(tile3);

        const tile4 = Tile.createAttached([5, 4], tile2, [1, 2], 
            { flipped: false, color: Tile.GRAY });
        tiling.tiles.push(tile4);

        const tile5 = Tile.createAttached([1, 0], tile4, [11, 12], 
            { flipped: false, color: Tile.GRAY });
        tiling.tiles.push(tile5);
    }
}

const explorer = new SubstitutionExplorer('canvas');

window.regenerate = () => explorer.generate();
window.randomSeed = () => explorer.generate();
window.expand = () => explorer.expand();