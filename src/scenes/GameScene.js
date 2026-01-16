import HexGrid from '../objects/HexGrid.js';
import GameManager from '../objects/GameManager.js';
import AIController from '../objects/AIController.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.actionHistory = []; // Stack for Undo
    }

    init(data) {
        this.mapId = data.mapId || 1; // Default to 1
        console.log(`Loading Map ID: ${this.mapId}`);
    }

    create() {
        this.cameras.main.setBackgroundColor('#222222');

        // Background Removed as per request
        this.cameras.main.setBackgroundColor('#222222');

        // Launch UI Scene in parallel
        this.scene.launch('UIScene');

        // Initialize Grid
        // Reduced size for larger map (200 tiles) -> Updated to 40
        // Shifted further left to 0.30 to make room for UI
        this.grid = new HexGrid(this, this.cameras.main.width * 0.30, this.cameras.main.height / 2, 40, 15, this.mapId);

        // Initialize Managers
        this.gameManager = new GameManager(this, this.grid);
        this.aiController = new AIController(this, this.grid);

        // Event Listeners
        this.events.on('aiTurnStart', () => {
            console.log("AI Turn Start");
            this.aiController.runTurn(() => {
                this.gameManager.endTurn();
            });
        });

        this.events.on('part2Started', () => {
            // Handled by GameManager
        });

        // Start Game
        this.gameManager.initGame();

        // Input Handling for Actions
        this.input.on('gameobjectdown', (pointer, gameObject) => {
            if (gameObject instanceof Phaser.GameObjects.Container) // Check if tile
                this.handleInput(gameObject);
        });

        this.setupActionListeners();

        // Cleanup on Scene Shutdown
        this.events.on('shutdown', this.cleanup, this);
        this.events.on('destroy', this.cleanup, this);
    }

    cleanup() {
        // Destroy Managers
        if (this.gameManager) {
            this.gameManager.destroy();
            this.gameManager = null;
        }
        if (this.aiController) {
            this.aiController.destroy();
            this.aiController = null;
        }

        // Destroy Grid
        if (this.grid) {
            this.grid.destroy();
            this.grid = null;
        }

        // Remove ALL Listeners (Nuclear Option for Safety)
        this.events.removeAllListeners();

        // Remove Input Listeners
        this.input.off('gameobjectdown');

        console.log("GameScene Cleaned Up");
    }

    handleInput(tile) {
        if (!this.gameManager) return;
        const team = this.gameManager.getCurrentTeam();
        if (!team) return;

        // Selection Logic
        if (tile.ownerID === team.id) {
            this.selectTile(tile);
            console.log("Selected Own Tile");
        } else {
            // If we have a selected tile, try to attack it
            if (this.selectedTile && this.selectedTile.ownerID === team.id) {
                this.tryAttack(tile, team);
            }
        }
    }

    selectTile(tile) {
        // TODO: Add visual highlight
        if (this.selectedTile) {
            this.selectedTile.graphics.clear();
            this.selectedTile.draw();
        }
        this.selectedTile = tile;
        // Draw highlight (simple hack for now)
        // Draw highlight (foggy fill)
        tile.graphics.fillStyle(0xffffff, 0.3);
        tile.graphics.fillPoints(tile.getHexPoints(), true);
    }

    setupActionListeners() {
        this.events.on('actionRecruit', () => this.actionRecruit());
        this.events.on('actionFortify', () => this.actionFortify());
        this.events.on('actionExpand', () => this.actionExpand());
        this.events.on('actionPurify', () => this.actionPurify());
        this.events.on('actionUndo', () => this.actionUndo()); // UNDO Listener
        this.events.on('actionEndTurn', () => {
            this.gameManager.endTurn();
        });

        // Keyboard Shortcuts
        this.input.keyboard.on('keydown-Q', () => this.actionRecruit());
        this.input.keyboard.on('keydown-W', () => this.actionFortify());
        this.input.keyboard.on('keydown-E', () => this.actionExpand());
        this.input.keyboard.on('keydown-R', () => this.actionPurify());
        this.input.keyboard.on('keydown-A', () => this.actionUndo());
        this.input.keyboard.on('keydown-SPACE', () => this.gameManager.endTurn());
    }

    // --- UNDO SYSTEM ---
    pushAction(action) {
        this.actionHistory.push(action);
    }

    actionUndo() {
        if (this.actionHistory.length === 0) {
            console.log("Nothing to undo");
            return;
        }

        const lastAction = this.actionHistory.pop();
        const team = this.gameManager.getCurrentTeam();

        // Restore State
        switch (lastAction.type) {
            case 'RECRUIT':
            case 'FORTIFY':
                lastAction.tile.setPower(lastAction.prevPower);
                lastAction.tile.isShielded = lastAction.prevShield;
                lastAction.tile.draw();
                break;
            case 'EXPAND':
                lastAction.target.setOwner(0); // Restore to Neutral
                lastAction.target.setPower(0); // Neutral has 0 power
                lastAction.target.draw();
                break;
            case 'PURIFY':
                lastAction.target.setOwner(lastAction.prevOwner); // Restore Phonics
                lastAction.target.setPower(lastAction.prevPower);
                lastAction.target.isShielded = lastAction.prevShield; // Restore Shield
                lastAction.target.draw();
                break;
            case 'ATTACK':
                lastAction.target.setOwner(lastAction.prevTargetOwner);
                lastAction.target.setPower(lastAction.prevTargetPower);
                lastAction.target.isShielded = lastAction.prevTargetShield;

                lastAction.source.setPower(lastAction.prevSourcePower);
                lastAction.source.setOwner(lastAction.prevSourceOwner); // Should be same team usually
                break;
        }

        // Refund AP
        team.ap += lastAction.cost;
        this.events.emit('updateUI');
        console.log("Undo Successful");
    }

    handleInput(tile) {
        if (!this.gameManager) return;
        const team = this.gameManager.getCurrentTeam();
        if (!team) return;

        // Purify Mode Logic
        if (this.purifyMode) {
            // Check if Target is Phonics (Owner 9) OR if it's a Special Tile occupied by Phonics (checking owner should suffice, but being explicit)
            if (tile.ownerID === 9) {
                this.tryPurify(tile, team);
            } else {
                console.log(`Invalid Purify Target: Owner ${tile.ownerID}`);
                this.events.emit('showToast', "포닉스 타일을 선택하세요!");
            }
            // Turn off mode
            this.purifyMode = false;
            return;
        }

        // Expand Mode Logic
        if (this.expandMode) {
            if (tile.ownerID === 0) {
                this.tryExpand(tile, team);
            } else {
                this.events.emit('showToast', "확장할 회색 땅을 선택하세요!");
            }
            this.expandMode = false;
            return;
        }

        // Selection Logic
        if (tile.ownerID === team.id) {
            this.selectTile(tile);
            console.log("Selected Own Tile");
        } else {
            // If we have a selected tile, try to attack it
            if (this.selectedTile && this.selectedTile.ownerID === team.id) {
                this.tryAttack(tile, team);
            }
        }
    }

    actionPurify() {
        this.expandMode = false;
        const team = this.gameManager.getCurrentTeam();

        if (team.ap < 1) { // Min check for UI feedback
            this.events.emit('showToast', "Pt가 부족합니다 (최소 1 필요)");
            return;
        }

        this.purifyMode = true;
        this.events.emit('showToast', "정화 모드: 비용은 대상의 전투력과 같습니다.");
    }

    tryPurify(target, team) {
        // Invincibility Check (Round 16)
        if (this.gameManager.currentRound === 12) {
            this.events.emit('showToast', "12라운드에는 포닉스가 무적입니다!");
            return;
        }

        // Refactored to Global Adjacency Check (like Expand)
        const neighbors = this.grid.getNeighbors(target);
        let hasAdjacentOwn = false;
        for (let n of neighbors) {
            if (n.ownerID === team.id) {
                hasAdjacentOwn = true;
                break;
            }
        }

        if (!hasAdjacentOwn) {
            this.events.emit('showToast', "인접한 아군 영토가 있어야 합니다!");
            return;
        }

        // Cost Check (Variable: Target Power)
        const cost = target.power;

        if (team.ap < cost) {
            this.events.emit('showToast', `Pt가 부족합니다! (필요: ${cost})`);
            return;
        }

        // Push History
        this.pushAction({
            type: 'PURIFY',
            target: target,
            prevOwner: 9,
            prevPower: target.power,
            prevShield: target.isShielded,
            cost: cost
        });

        // Effect: Neutralize regardless of Power or Special Status
        console.log(`Purifying Tile: ${target.q},${target.r} (Power: ${target.power}, Cost: ${cost})`);

        target.setOwner(0); // Neutral
        target.setPower(1); // Weak
        target.isShielded = false; // Remove Shield if any
        target.draw(); // Force Redraw

        team.ap -= cost;
        team.purifyCount = (team.purifyCount || 0) + 1; // Increment Count

        this.events.emit('showToast', "정화 성공!");
        this.events.emit('updateUI');
        this.gameManager.resetTurnTimer();
    }

    actionExpand() {
        this.purifyMode = false;
        const team = this.gameManager.getCurrentTeam();

        if (team.ap < 3) {
            this.events.emit('showToast', "Pt가 부족합니다 (필요: 3)");
            return;
        }

        this.expandMode = true;
        this.events.emit('showToast', "확장 모드: 인접한 중립 땅을 클릭하세요.");
    }

    tryExpand(target, team) {
        // Needs an adjacent OWNED tile.
        // We iterate through neighbors of the target to see if ANY belong to the team.
        const neighbors = this.grid.getNeighbors(target);
        let hasAdjacentOwn = false;
        for (let n of neighbors) {
            if (n.ownerID === team.id) {
                hasAdjacentOwn = true;
                break;
            }
        }

        if (!hasAdjacentOwn) {
            this.events.emit('showToast', "인접한 아군 영토가 있어야 합니다!");
            return;
        }

        // Cost Check (Double check)
        if (team.ap < 3) return;

        // Push History
        this.pushAction({
            type: 'EXPAND',
            target: target,
            cost: 3
        });

        console.log(`Expanding to Tile: ${target.q},${target.r}`);

        target.setOwner(team.id);
        target.setPower(1); // Specified in request
        target.draw();

        team.ap -= 3;
        this.events.emit('updateUI');
        this.gameManager.resetTurnTimer();
    }

    actionRecruit() {
        this.purifyMode = false; // Reset modes
        this.expandMode = false;
        const team = this.gameManager.getCurrentTeam();
        if (!this.selectedTile || this.selectedTile.ownerID !== team.id) {
            console.log("No valid tile selected.");
            return;
        }
        if (team.ap < 1) {
            console.log("Not enough AP");
            return;
        }
        if (this.selectedTile.power >= 5) {
            console.log("Max Power Reached");
            return;
        }

        // Push History
        this.pushAction({
            type: 'RECRUIT',
            tile: this.selectedTile,
            prevPower: this.selectedTile.power,
            prevShield: this.selectedTile.isShielded,
            cost: 1
        });

        this.selectedTile.setPower(this.selectedTile.power + 1);
        team.ap -= 1;
        this.events.emit('updateUI');
        this.gameManager.resetTurnTimer();
    }

    actionFortify() {
        this.purifyMode = false; // Reset modes
        this.expandMode = false;
        const team = this.gameManager.getCurrentTeam();
        if (!this.selectedTile || this.selectedTile.ownerID !== team.id) return;

        // Prevent fortifying if already shielded
        if (this.selectedTile.isShielded) {
            this.events.emit('showToast', "이미 보호막이 있습니다!");
            return;
        }

        if (team.ap < 2) return;

        // Push History
        this.pushAction({
            type: 'FORTIFY',
            tile: this.selectedTile,
            prevPower: this.selectedTile.power,
            prevShield: false,
            cost: 2
        });

        this.selectedTile.isShielded = true;
        this.selectedTile.draw();
        this.selectedTile.draw();
        team.ap -= 2;
        this.events.emit('updateUI');
        this.gameManager.resetTurnTimer();
    }

    tryAttack(target, team) {
        // Check if Phonics and Round 16
        if (target.ownerID === 9 && this.gameManager.currentRound === 12) {
            this.events.emit('showToast', "12라운드에는 포닉스가 무적입니다!");
            return;
        }

        const source = this.selectedTile;
        if (!source || source.ownerID !== team.id) return; // Logic check

        const distance = this.grid.getDistance(source, target);
        if (distance !== 1) {
            console.log("Too far");
            this.events.emit('showToast', "거리가 너무 멉니다.");
            return;
        }

        // 2. Costs 2 AP
        if (team.ap < 2) {
            console.log("Not enough AP");
            this.events.emit('showToast', "Pt가 부족합니다 (필요: 2)"); // Optional feedback
            return;
        }

        // Push History (Save BEFORE changing)
        this.pushAction({
            type: 'ATTACK',
            source: source,
            target: target,
            prevSourcePower: source.power,
            prevSourceOwner: source.ownerID,
            prevTargetPower: target.power,
            prevTargetOwner: target.ownerID,
            prevTargetShield: target.isShielded,
            cost: 2
        });

        // 3. Power Logic
        // Neutral Tile Logic
        if (target.ownerID === 0) {
            if (source.power >= 2) { // Explicitly >= 2
                target.setOwner(team.id);
                target.setPower(source.power - 1);
                source.setPower(1);
                team.ap -= 2;
            } else {
                console.log("Not enough power to conquer Neutral (Need >= 2)");
                this.events.emit('showToast', "중립 정복엔 전투력 2 이상 필요!");
                this.actionHistory.pop(); // Remove failed action
                return;
            }
        }
        // Enemy Logic
        else if (source.power > target.power && !target.isShielded) {
            // Victory
            target.setOwner(team.id);
            target.setPower(Math.max(1, source.power - target.power));
            source.setPower(1);
            team.ap -= 2;
        } else {
            console.log("Attack Failed: Weak or Shielded");
            this.events.emit('showToast', "공격 실패! (상대가 너무 강하거나 보호막)");
            this.actionHistory.pop(); // Remove failed action
            return;
        }

        this.events.emit('updateUI');
        this.gameManager.resetTurnTimer();
    }

    update() {
        // Game loop
    }
}
