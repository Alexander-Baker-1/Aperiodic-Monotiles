import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

/**
 * Hat Tiling via Flood Fill
 *
 * Grows the aperiodic hat tiling outward from a seed tile using the
 * valid edge-attachment rules derived from the Smith et al. (2024) paper.
 *
 * Each rule maps one edge of an existing tile to a matching edge of a
 * new tile using Tile.createAttached (which internally applies a flipX so
 * the new tile is a mirror-image copy of the geometry matched onto the
 * target edge).  This is exactly how the paper's metatile clusters work:
 *
 *   H metatile: root + [10,11]->[4,5], [10,11]->[0,1], [4,5]->[10,11]
 *   P metatile: root + [1,0]->[11,12]
 *   Triskelion: chain [11,12]->[0,1] (closes after 3 steps)
 *
 * All other valid connections follow from the hexagonal kite-grid geometry.
 */

// ─── Adjacency rules ──────────────────────────────────────────────────────────
// Each entry means: attach a new tile so that NEW_TILE[se] aligns with
// EXISTING_TILE[te], using Tile.createAttached with flipped:false.
const ADJACENCY_RULES = [
  // H-metatile internal connections
  { se: [10, 11], te: [4,  5 ] },
  { se: [10, 11], te: [0,  1 ] },
  { se: [4,  5 ], te: [10, 11] },
  { se: [0,  1 ], te: [10, 11] },
  // P-metatile / triskelion connections
  { se: [1,  0 ], te: [11, 12] },
  { se: [11, 12], te: [0,  1 ] },
  // Additional b-edge connections
  { se: [5,  6 ], te: [11, 12] },
  { se: [11, 12], te: [5,  6 ] },
  { se: [1,  2 ], te: [5,  6 ] },
  { se: [5,  6 ], te: [1,  2 ] },
];

// ─── Colour palette (matching the paper's figures) ────────────────────────────
const COLORS = [
  Tile.DARK_BLUE,   // reflected "H1" tiles
  Tile.LIGHT_BLUE,
  Tile.WHITE,
  Tile.GRAY,
];

export class HierarchicalHatTiling {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.geometry = new HatGeometry(1, Math.sqrt(3));

    // Controls
    this.maxTiles  = 300;
    this.curvature = 0;

    this._bindUI();
    this.randomSeed();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setSeed(seed) {
    this.seed = seed;
    const el = document.getElementById('seed');
    if (el) el.value = seed;
    this.generate();
  }

  randomSeed() {
    this.setSeed(Math.floor(Math.random() * 1_000_000));
  }

  generate() {
    const tiles = this._floodFill();
    this._draw(tiles);
  }

  // ── Core: flood fill ────────────────────────────────────────────────────────

  _floodFill() {
    const geometry = this.geometry;
    const seen     = new Map();   // centroidKey -> Tile
    const queue    = [];

    // Seed tile — random rotation/flip so the patch looks different each run
    const angle     = this._seededRandom() * 2 * Math.PI;
    const doFlip    = this._seededRandom() < 0.5;
    const scale     = 40;

    let rootTransform = Matrix.translation(this.canvas.width  / 2,
                                           this.canvas.height / 2)
                          .multiply(Matrix.rotation(angle))
                          .multiply(Matrix.scale(scale));
    if (doFlip) rootTransform = rootTransform.multiply(Matrix.flipX());

    const seedTile = new Tile(rootTransform, geometry, this._pickColor(0));
    seen.set(this._tileKey(seedTile), seedTile);
    queue.push(seedTile);

    while (queue.length > 0 && seen.size < this.maxTiles) {
      const current = queue.shift();

      for (const rule of ADJACENCY_RULES) {
        const candidate = Tile.createAttached(
          rule.se, current, rule.te,
          { flipped: false, color: this._pickColor(seen.size) }
        );

        const key = this._tileKey(candidate);
        if (seen.has(key)) continue;

        // Reject if centroid is too close to an existing tile (overlap guard)
        if (this._overlaps(candidate, seen)) continue;

        seen.set(key, candidate);
        queue.push(candidate);
      }
    }

    return [...seen.values()];
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _draw(tiles) {
    const { ctx, canvas, curvature } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const tile of tiles) {
      tile.draw(ctx, curvature);
    }

    // Stats overlay
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText(`${tiles.length} tiles  seed=${this.seed}`, 10, 20);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Centroid-based deduplication key (rounded to avoid float drift) */
  _tileKey(tile) {
    const verts = this.geometry.vertices;
    let sx = 0, sy = 0;
    for (let i = 0; i < 13; i++) {
      const p = tile.transform.transformPoint(verts[i]);
      sx += p.x; sy += p.y;
    }
    return `${Math.round(sx / 13 * 100)},${Math.round(sy / 13 * 100)}`;
  }

  /** Returns true if candidate's centroid is within 0.5 units of any existing tile */
  _overlaps(candidate, seen) {
    const verts = this.geometry.vertices;
    let sx = 0, sy = 0;
    for (let i = 0; i < 13; i++) {
      const p = candidate.transform.transformPoint(verts[i]);
      sx += p.x; sy += p.y;
    }
    const cx = sx / 13, cy = sy / 13;

    // Approximate tile size from geometry scale
    const v0 = candidate.transform.transformPoint(verts[0]);
    const v1 = candidate.transform.transformPoint(verts[1]);
    const edgeLen = Math.hypot(v1.x - v0.x, v1.y - v0.y);
    const threshold = edgeLen * 0.3;

    for (const t of seen.values()) {
      let tx = 0, ty = 0;
      for (let i = 0; i < 13; i++) {
        const p = t.transform.transformPoint(verts[i]);
        tx += p.x; ty += p.y;
      }
      tx /= 13; ty /= 13;
      if (Math.abs(cx - tx) < threshold && Math.abs(cy - ty) < threshold) return true;
    }
    return false;
  }

  _pickColor(index) {
    // Colour tiles to hint at reflected (dark) vs unreflected (light) orientation
    // This is a heuristic — true colour would require tracking orientation through
    // the attachment chain, but this gives a visually pleasing result.
    return COLORS[index % COLORS.length];
  }

  // Simple seeded LCG so results are reproducible
  _seededRandom() {
    this.seed = (this.seed * 1_103_515_245 + 12_345) & 0x7fff_ffff;
    return this.seed / 0x7fff_ffff;
  }

  _bindUI() {
    const btn = document.getElementById('regenerate');
    if (btn) btn.addEventListener('click', () => {
      const seedEl = document.getElementById('seed');
      if (seedEl && seedEl.value) this.setSeed(parseInt(seedEl.value));
      else this.randomSeed();
    });

    const randomBtn = document.getElementById('randomSeed');
    if (randomBtn) randomBtn.addEventListener('click', () => this.randomSeed());

    const curveEl = document.getElementById('curvature');
    if (curveEl) curveEl.addEventListener('input', e => {
      this.curvature = parseFloat(e.target.value);
      this.generate();
    });

    const countEl = document.getElementById('tileCount');
    if (countEl) countEl.addEventListener('input', e => {
      this.maxTiles = parseInt(e.target.value);
      this.generate();
    });
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
const explorer = new HierarchicalHatTiling('canvas');

window.regenerate = () => {
  const seed = parseInt(document.getElementById('seed')?.value);
  if (!isNaN(seed)) explorer.setSeed(seed);
  else explorer.randomSeed();
};
window.randomSeed = () => explorer.randomSeed();