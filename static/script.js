// Get drawing area from webpage
const canvas = document.getElementById('canvas');
// Get tool to draw on canvas
const ctx = canvas.getContext('2d');

// Get three slider controls from webpage
const aSlider = document.getElementById('a');
const bSlider = document.getElementById('b');
const curveSlider = document.getElementById('curve');

const COS_60 = Math.cos(Math.PI/3);  // 0.5
const SIN_60 = Math.sin(Math.PI/3);  // √3/2

// Special tile presets
const PRESETS = {
    chevron: { a: 0, b: 1, name: 'Chevron' },
    hat: { a: 1, b: Math.sqrt(3), name: 'Hat' },
    spectre: { a: 1, b: 1, name: 'Spectre' },
    turtle: { a: Math.sqrt(3), b: 1, name: 'Turtle' },
    comet: { a: 1, b: 0, name: 'Comet' }
};

// Shows slider numbers on screen
function updateValues() {
    document.getElementById('a-val').textContent = parseFloat(aSlider.value).toFixed(3);
    document.getElementById('b-val').textContent = parseFloat(bSlider.value).toFixed(3);
    document.getElementById('curve-val').textContent = parseFloat(curveSlider.value).toFixed(3);
}

// Creates list of directions for drawing shape
function getHatEdges(a, b) {
    return [
        [COS_60 * b, SIN_60 * b],
        [b, 0],
        [0, a],
        [SIN_60 * a, COS_60 * a],
        [COS_60 * b, -SIN_60 * b],
        [-COS_60 * b, -SIN_60 * b],
        [SIN_60 * a, -COS_60 * a],
        [0, -a],
        [0, -a],
        [-SIN_60 * a, -COS_60 * a],
        [-COS_60 * b, SIN_60 * b],
        [-b, 0],
        [0, a],
        [-SIN_60 * a, COS_60 * a]
    ];
}

// Makes control points for bezier curves
function makeControlPoints(dx, dy, curveAmount) {
    // Turn direction 90 degrees
    const nx = dy;
    const ny = -dx;
    
    // Return two control points + end point
    return [
        -curveAmount * nx + dx/2,
        -curveAmount * ny + dy/2,
        curveAmount * nx + dx/2,
        curveAmount * ny + dy/2,
        dx,
        dy
    ];
}

// Calculate best scale to fit shape in canvas
function calculateScale(a, b) {
    // Calculate width and height of shape
    const width = (1 + COS_60) * b + 2 * SIN_60 * a;
    const height = 2 * SIN_60 * b + 2 * (1 + COS_60) * a;
    
    // Add margin
    const margin = 0.2;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate scale to fit both width and height
    const scaleX = (canvasWidth * (1 - 2 * margin)) / width;
    const scaleY = (canvasHeight * (1 - 2 * margin)) / height;
    
    // Use smaller scale so it fits both directions
    return Math.min(scaleX, scaleY);
}

// Main function draws whole shape
function draw() {
    // Erase everything on canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Set color to black
    ctx.fillStyle = 'black';
    
    // Find center of canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Get current slider values
    const a = parseFloat(aSlider.value);
    const b = parseFloat(bSlider.value);
    const curve = parseFloat(curveSlider.value);
    
    // Calculate best scale to fit shape on screen
    const scale = calculateScale(a, b);
    
    // Get list of directions to draw
    const edges = getHatEdges(a, b);

    // Start at center of canvas
    let x = centerX;
    let y = centerY;

    // Start drawing
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Draw each edge of shape
    edges.forEach(([dx, dy]) => {
        // Scale direction to fit on screen
        const scaledDx = dx * scale;
        const scaledDy = dy * scale;

        // If curve slider is turned on, draw bezier curves
        if (curve > 0) {
            // Get control point numbers
            const [cp1x, cp1y, cp2x, cp2y, endX, endY] = makeControlPoints(scaledDx, scaledDy, curve);
            
            // Draw bezier curve using control points
            ctx.bezierCurveTo(
                x + cp1x, y + cp1y,
                x + cp2x, y + cp2y,
                x + endX, y + endY
            );
        } else {
            // If curve slider is off, draw straight lines
            ctx.lineTo(x + scaledDx, y + scaledDy);
        }
        
        // Move to end of edge
        x += scaledDx;
        y += scaledDy;
    });

    // Close shape
    ctx.closePath();
    // Fill shape with color
    ctx.fill();

    // Draw thin border around shape
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Function to load preset tile shape
function loadPreset(presetKey) {
    const preset = PRESETS[presetKey];
    
    // Set slider values to preset numbers
    aSlider.value = preset.a;
    bSlider.value = preset.b;
    
    // Update display and redraw
    updateValues();
    draw();
}

// Update display and redraw when sliders are moved
[aSlider, bSlider, curveSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        updateValues(); 
        draw();
    });
});

// Show starting values when page loads
updateValues();
// Draw shape for first time
draw();