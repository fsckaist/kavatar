import HexGrid from '../objects/HexGrid.js';

export default class MapEditorScene extends Phaser.Scene {
    constructor() {
        super('MapEditorScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#222222');

        // 1. Background (Grayscale)
        // Ensure pipeline exists (re-using logic from GameScene or checking if exists)
        // Since pipelines are global to renderer, if GameScene ran it exists, but we should be robust.
        this.createGrayscalePipeline();

        const bg = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'bg_map');
        bg.setPipeline('Gray');

        // Scale match GameScene
        const scaleX = this.cameras.main.width / bg.width;
        const scaleY = this.cameras.main.height / bg.height;
        const scale = Math.min(scaleX, scaleY) * 0.95;
        bg.setScale(scale);

        // 2. Initialize Empty Grid
        // standard size 40
        this.grid = new HexGrid(this, this.cameras.main.width / 2, this.cameras.main.height / 2, 40, 15);
        // Clear default map generation? 
        // HexGrid constructor calls generateMap(). We might want to clear it or override.
        // For now, let's clear it immediately.
        this.grid.getAllTiles().forEach(t => t.destroy());
        this.grid.tiles.clear();

        // 3. UI Overlay
        this.add.text(20, 20, "MAP EDITOR MODE", { fontSize: '32px', color: '#00ff00', backgroundColor: '#000000' });
        this.infoText = this.add.text(20, 60, "L-Click: Paint | R-Click: Erase | 'S': Export", { fontSize: '20px', color: '#ffffff' });

        // Size Controls
        this.currentSize = 40;
        this.add.text(20, 100, "Grid Size:", { fontSize: '24px', color: '#ffcc00' });
        this.sizeText = this.add.text(140, 100, `${this.currentSize}`, { fontSize: '24px', color: '#ffffff' });

        const btnMinus = this.add.text(180, 100, "[-]", { fontSize: '24px', color: '#00ffff', backgroundColor: '#333' }).setInteractive();
        const btnPlus = this.add.text(230, 100, "[+]", { fontSize: '24px', color: '#00ffff', backgroundColor: '#333' }).setInteractive();

        btnMinus.on('pointerdown', () => this.updateGridSize(-1));
        btnPlus.on('pointerdown', () => this.updateGridSize(1));

        // 4. Input Handling
        this.input.mouse.disableContextMenu(); // Block right-click menu

        this.input.on('pointerdown', (pointer) => {
            // Ignore if clicking UI
            if (pointer.y < 150) return;

            this.handleInput(pointer);
            this.isPainting = true;
        });

        this.input.on('pointerup', () => {
            this.isPainting = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isPainting) {
                // Ignore if in UI area (simple check)
                if (pointer.y < 150) return;
                this.handleInput(pointer);
            }
        });

        // 5. Export Key
        this.input.keyboard.on('keydown-S', () => {
            this.exportMap();
        });

        // Back to Title
        const backBtn = this.add.text(this.cameras.main.width - 100, 50, '[ EXIT ]', { color: '#ff0000', fontSize: '20px', backgroundColor: '#000' })
            .setInteractive()
            .on('pointerdown', () => this.scene.start('TitleScene'));
    }

    updateGridSize(delta) {
        const newSize = this.currentSize + delta;
        if (newSize < 10 || newSize > 100) return;

        this.currentSize = newSize;
        this.sizeText.setText(`${this.currentSize}`);

        // Update Grid Object
        this.grid.hexSize = this.currentSize;

        // Reposition and Resize all existing tiles
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.grid.tiles.forEach(tile => {
            tile.size = this.currentSize - 2; // gap

            // Recalc Position
            const x = centerX + this.currentSize * (Math.sqrt(3) * tile.q + Math.sqrt(3) / 2 * tile.r);
            const y = centerY + this.currentSize * (3 / 2 * tile.r);

            tile.setPosition(x, y);

            // Update Text Size
            tile.text.setFontSize(`${tile.size}px`);

            // Redraw graphics
            tile.draw();
        });
    }

    createGrayscalePipeline() {
        if (this.renderer.pipelines.get('Gray')) return;

        const GrayscalePipeline = new Phaser.Class({
            Extends: Phaser.Renderer.WebGL.Pipelines.SinglePipeline,
            initialize: function GrayscalePipeline(game) {
                Phaser.Renderer.WebGL.Pipelines.SinglePipeline.call(this, {
                    game: game,
                    fragShader: `
                        precision mediump float;
                        uniform sampler2D uMainSampler;
                        varying vec2 outTexCoord;
                        void main(void) {
                            vec4 color = texture2D(uMainSampler, outTexCoord);
                            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                            gl_FragColor = vec4(vec3(gray), color.a);
                        }
                    `
                });
            }
        });
        this.renderer.pipelines.add('Gray', new GrayscalePipeline(this.game));
    }

    handleInput(pointer) {
        // Convert Pixel to Axial
        // x = size * sqrt(3) * (q + r/2)
        // y = size * 3/2 * r
        // => r = (y - centerY) / (size * 3/2)
        // => q = (x - centerX) / (size * sqrt(3)) - r/2

        const size = this.currentSize; // Use dynamic size
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const x = pointer.x - centerX;
        const y = pointer.y - centerY;

        let r = y / (size * 1.5);
        let q = x / (size * Math.sqrt(3)) - r / 2;

        // Rounding to nearest Hex
        const rounded = this.cubeToAxial(this.axialToCube(q, r));
        const finalQ = rounded.q;
        const finalR = rounded.r;

        if (pointer.rightButtonDown()) {
            this.removeTile(finalQ, finalR);
        } else if (pointer.leftButtonDown()) {
            this.addTile(finalQ, finalR);
        }
    }

    addTile(q, r) {
        if (this.grid.tiles.has(`${q},${r}`)) return; // Already exists

        // Pass current size
        // Note: HexGrid.createTile uses this.hexSize. We updated it in updateGridSize
        // But let's make sure grid properties are in sync
        this.grid.hexSize = this.currentSize;

        const tile = this.grid.createTile(q, r);
        tile.setOwner(0); // Ensure neutral look
    }

    removeTile(q, r) {
        const key = `${q},${r}`;
        const tile = this.grid.tiles.get(key);
        if (tile) {
            tile.destroy();
            this.grid.tiles.delete(key);
        }
    }

    exportMap() {
        const coords = [];
        this.grid.tiles.forEach((tile) => {
            coords.push(`{q:${tile.q}, r:${tile.r}}`);
        });

        const dataStr = `[\n    ${coords.join(',\n    ')}\n]`;
        console.log("=== MAP DATA START ===");
        console.log(dataStr);
        console.log("=== MAP DATA END ===");

        alert(`Map Data Exported to Console! (${coords.length} tiles)`);
    }

    // Hex Algorithm Helpers (Cube Rounding)
    axialToCube(q, r) {
        return { x: q, z: r, y: -q - r };
    }

    cubeToAxial(cube) {
        let rx = Math.round(cube.x);
        let ry = Math.round(cube.y);
        let rz = Math.round(cube.z);

        const x_diff = Math.abs(rx - cube.x);
        const y_diff = Math.abs(ry - cube.y);
        const z_diff = Math.abs(rz - cube.z);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { q: rx, r: rz };
    }
}
