const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const aSlider = document.getElementById('a');
const bSlider = document.getElementById('b');
const curveSlider = document.getElementById('curve');

function updateValues() {
    document.getElementById('a-val').textContent = parseFloat(aSlider.value).toFixed(3);
    document.getElementById('b-val').textContent = parseFloat(bSlider.value).toFixed(3);
    document.getElementById('curve-val').textContent = parseFloat(curveSlider.value).toFixed(3);
}

// Get the hat outline vertices
function getHatOutline(a, b) {
    const c = Math.cos(Math.PI/3);
    const s = Math.sin(Math.PI/3);
    
    const moves = [
        [c*b, s*b], [b, 0], [0, a], [s*a, c*a],
        [c*b, -s*b], [-c*b, -s*b], [s*a, -c*a],
        [0, -a], [0, -a], [-s*a, -c*a],
        [-c*b, s*b], [-b, 0], [0, a], [-s*a, c*a]
    ];
    
    const vertices = [{x: 0, y: 0}];
    let x = 0, y = 0;
    
    for (let [dx, dy] of moves) {
        x += dx;
        y += dy;
        vertices.push({x, y});
    }
    
    return vertices;
}

function matVecMul(mat, vec) {
    return {
        x: mat[0] * vec.x + mat[1] * vec.y + mat[2],
        y: mat[3] * vec.x + mat[4] * vec.y + mat[5]
    };
}

function matMul(m1, m2) {
    return [
        m1[0]*m2[0] + m1[1]*m2[3],
        m1[0]*m2[1] + m1[1]*m2[4],
        m1[0]*m2[2] + m1[1]*m2[5] + m1[2],
        m1[3]*m2[0] + m1[4]*m2[3],
        m1[3]*m2[1] + m1[4]*m2[4],
        m1[3]*m2[2] + m1[4]*m2[5] + m1[5]
    ];
}

// Transform that maps two points to two target points
function matchShapes(p1, p2, targetP1, targetP2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    const tdx = targetP2.x - targetP1.x;
    const tdy = targetP2.y - targetP1.y;
    
    const scale = Math.sqrt((tdx*tdx + tdy*tdy) / (dx*dx + dy*dy));
    
    const angle1 = Math.atan2(dy, dx);
    const angle2 = Math.atan2(tdy, tdx);
    const rotation = angle2 - angle1;
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const a = scale * cos;
    const b = -scale * sin;
    const d = scale * sin;
    const e = scale * cos;
    
    const c = targetP1.x - (a * p1.x + b * p1.y);
    const f = targetP1.y - (d * p1.x + e * p1.y);
    
    return [a, b, c, d, e, f];
}

const identity = [1, 0, 0, 0, 1, 0];

function drawTileWithMatrix(mat, a, b, curve, color = 'black') {
    const c = Math.cos(Math.PI/3);
    const s = Math.sin(Math.PI/3);
    
    const moves = [
        [c*b, s*b], [b, 0], [0, a], [s*a, c*a],
        [c*b, -s*b], [-c*b, -s*b], [s*a, -c*a],
        [0, -a], [0, -a], [-s*a, -c*a],
        [-c*b, s*b], [-b, 0], [0, a], [-s*a, c*a]
    ];
    
    function twiddle([dx, dy]) {
        const [nx, ny] = [dy, -dx];
        return [-curve*nx+dx/2, -curve*ny+dy/2, curve*nx+dx/2, curve*ny+dy/2, dx, dy];
    }
    
    ctx.save();
    ctx.transform(mat[0], mat[3], mat[1], mat[4], mat[2], mat[5]);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    
    let px = 0, py = 0;
    for (let [dx, dy] of moves) {
        const [dx1, dy1, dx2, dy2, x1, y1] = twiddle([dx, dy]);
        ctx.bezierCurveTo(dx1+px, dy1+py, dx2+px, dy2+py, px+dx, py+dy);
        px += dx;
        py += dy;
    }
    
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.restore();
}

const tiles = [];

function addTile(hatOutline, flipX, options) {
    const {
        sourceEdge,
        targetTile,
        targetEdge,
        flipped = false,
        color = 'rgba(80, 150, 180, 1)'
    } = options;
    
    // Get the actual positions of the target edge
    const p1 = matVecMul(targetTile.mat, hatOutline[targetEdge[0]]);
    const p2 = matVecMul(targetTile.mat, hatOutline[targetEdge[1]]);
    
    let mat;
    if (flipped) {
        const v1 = matVecMul(flipX, hatOutline[sourceEdge[0]]);
        const v2 = matVecMul(flipX, hatOutline[sourceEdge[1]]);
        const tempMat = matchShapes(v1, v2, p1, p2);
        mat = matMul(tempMat, flipX);
    } else {
        mat = matchShapes(
            hatOutline[sourceEdge[0]], 
            hatOutline[sourceEdge[1]], 
            p1, 
            p2
        );
    }
    
    const tile = { mat, color };
    tiles.push(tile);
    return tile;
}

function drawAll() {
    const a = parseFloat(aSlider.value);
    const b = parseFloat(bSlider.value);
    const curve = parseFloat(curveSlider.value);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const hatOutline = getHatOutline(a, b);
    tiles.length = 0;  // Clear tiles array
    
    const flipX = [-1, 0, 0, 0, 1, 0];
    
    // First tile
    const angle = 3 * Math.PI/2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tile1 = {
        mat: matMul([40*cos, -40*sin, 530, 40*sin, 40*cos, 206], flipX),
        color: 'rgba(80, 150, 180, 1)'
    };
    tiles.push(tile1);
    
    // Add tiles using helper function
    const tile2 = addTile(hatOutline, flipX, {
        sourceEdge: [3, 4],
        targetTile: tile1,
        targetEdge: [13, 14],
        color: 'rgba(20, 50, 130, 1)'
    });
    
    const tile3 = addTile(hatOutline, flipX, {
        sourceEdge: [12, 13],
        targetTile: tile2,
        targetEdge: [6, 7],
        flipped: true,
        color: 'rgba(80, 150, 180, 1)'
    });
    
    const tile4 = addTile(hatOutline, flipX, {
        sourceEdge: [3, 4],
        targetTile: tile1,
        targetEdge: [7, 6],
        flipped: true,
        color: 'rgba(80, 150, 180, 1)'
    });
    
    const tile5 = addTile(hatOutline, flipX, {
        sourceEdge: [9, 8],
        targetTile: tile4,
        targetEdge: [9, 10],
        flipped: true,
        color: 'rgba(80, 150, 180, 1)'
    });
    
    const tile6 = addTile(hatOutline, flipX, {
        sourceEdge: [13, 14],
        targetTile: tile5,
        targetEdge: [7, 8],
        color: 'rgba(20, 50, 130, 1)'
    });
    
    // Draw all tiles
    tiles.forEach(tile => {
        drawTileWithMatrix(tile.mat, a, b, curve, tile.color);
    });
    
    // Draw vertex numbers
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    tiles.forEach(tile => {
        for (let i = 0; i < hatOutline.length; i++) {
            const p = matVecMul(tile.mat, hatOutline[i]);
            ctx.fillText(i, p.x, p.y);
        }
    });
    
    ctx.restore();
}

[aSlider, bSlider, curveSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        updateValues();
        drawAll();
    });
});

updateValues();
drawAll();