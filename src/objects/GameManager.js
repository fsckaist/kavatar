export default class GameManager {
    constructor(scene, grid) {
        this.scene = scene;
        this.grid = grid;

        // Settings
        this.mapId = this.scene.mapId || 1;
        this.teams = (this.mapId === 2 || this.mapId === 3) ? 6 : 5; // Map 2 & 3 have 6 Teams
        this.currentRound = 1;
        this.currentTurn = 1; // 1-5(or 6) = Teams, 9 = AI
        this.isPart2 = false;

        // Team Data (0 is neutral placeholder)
        this.teamData = [
            null,
            { id: 1, color: 'Orange', ap: 0, name: '주황 넙죽이' }, // North
            { id: 2, color: 'Yellow', ap: 0, name: '노란 넙죽이' }, // East
            { id: 3, color: 'Green', ap: 0, name: '초록 넙죽이' },  // West
            { id: 4, color: 'Blue', ap: 0, name: '파란 넙죽이' },    // South
            { id: 5, color: 'Purple', ap: 0, name: '보라 넙죽이' },  // Center
            { id: 6, color: 'Brown', ap: 0, name: '갈색 넙죽이' }   // Map 2 & 3 Special
        ];

        this.eventListeners = {
            onTurnStart: [],
            onTurnEnd: []
        };
    }

    initGame() {
        this.currentRound = 1;
        this.currentTurn = 1;

        // Pre-set Initial AP for all teams (Round 1)
        for (let i = 1; i < this.teamData.length; i++) {
            if (!this.teamData[i]) continue;
            this.teamData[i].purifyCount = 0; // Initialize Purify Count
            if (i <= 2) this.teamData[i].ap = 9;
            else if (i <= 4) this.teamData[i].ap = 10;
            else this.teamData[i].ap = 11;
        }

        this.spreadHQ();
        // Initial UI Update to show all APs before turn starts
        this.scene.events.emit('updateUI');

        this.startTurn();
    }

    spreadHQ() {
        if (this.mapId === 2) {
            // Map 2: Specific Indices for HQs
            const hqIndices = [2, 19, 28, 82, 91, 108]; // Teams 1-6
            const allTiles = this.grid.getAllTiles();

            hqIndices.forEach((idx, i) => {
                const tile = allTiles.find(t => t.index === idx);
                if (tile) {
                    tile.setOwner(i + 1); // Team ID 1-6
                    tile.setPower(1);
                    tile.isPermanentShield = true;
                    tile.isShielded = true;
                    tile.draw();
                } else {
                    console.warn(`HQ Index ${idx} not found for Map 2`);
                }
            });
            return; // Done for Map 2
        }

        let startingPositions = [];

        if (this.mapId === 3) {
            // Map 3: Hexagon Corners (Radius 6)
            // (0,-6), (6,-6), (6,0), (0,6), (-6,6), (-6,0)
            startingPositions = [
                { q: 0, r: -6, id: 1 },  // Top (North) - 12 o'clock - Vertex
                { q: 6, r: -6, id: 2 },  // Top-Right (NE) - 2 o'clock - Vertex
                { q: 6, r: 0, id: 3 },   // Bottom-Right (SE) - 4 o'clock - Vertex
                { q: 0, r: 6, id: 4 },   // Bottom (South) - 6 o'clock - Vertex
                { q: -6, r: 6, id: 5 },  // Bottom-Left (SW) - 8 o'clock - Vertex
                { q: -6, r: 0, id: 6 }   // Top-Left (NW) - 10 o'clock - Vertex
            ];
        } else {
            // Map 1: Original
            startingPositions = [
                { q: -3, r: -2, id: 1 }, // Orange (NW)
                { q: 5, r: -1, id: 2 },  // Yellow (E)
                { q: 1, r: 5, id: 3 },   // Green (Now SE) -> Was Blue
                { q: -9, r: 7, id: 4 },  // Blue (Now SW) -> Was Green
                { q: -2, r: 1, id: 5 }   // Purple (Center/West)
            ];
        }

        startingPositions.forEach(pos => {
            const tile = this.grid.getTile(pos.q, pos.r);
            if (tile) {
                tile.setOwner(pos.id);
                tile.setPower(1);

                // Permanent Shield for HQs
                tile.isPermanentShield = true;
                tile.isShielded = true;
                tile.draw(); // Visual update
            } else {
                console.warn(`HQ Position not found: ${pos.q}, ${pos.r}`);
            }
        });
    }

    resetTurnTimer() {
        this.timeLeft = 60;
        if (this.timerEvent) this.timerEvent.remove();

        this.timerEvent = this.scene.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.scene.events.emit('updateUI');
                if (this.timeLeft <= 0) {
                    this.scene.events.emit('showToast', "시간 초과! 턴이 강제 종료됩니다.");
                    this.endTurn();
                }
            },
            loop: true
        });
        this.scene.events.emit('updateUI');
    }

    startTurn() {
        if (this.currentTurn === 9) {
            // AI Turn
            this.scene.events.emit('aiTurnStart');
        } else {
            // Team Turn
            this.calcAP(this.currentTurn);
            console.log(`Turn Start: Team ${this.currentTurn}`);

            // 0. RESET TIMER
            this.resetTurnTimer();

            // New Logic: Clear Shields for THIS team (Duration = 1 Round)
            // ... (Rest of logic same)

            // Shields applied last turn protect until NOW (one full round).
            // Also: Power Decay (Power decreases by 1 each round, min 1)
            for (let tile of this.grid.getAllTiles()) {
                if (tile.ownerID === this.currentTurn) {
                    let changed = false;

                    // 1. Clear Shield (Unless Permanent HQ)
                    // "Except starting tile" -> verified by isPermanentShield
                    if (tile.isShielded && !tile.isPermanentShield) {
                        tile.isShielded = false;
                        changed = true;
                        console.log(`Shield Expired on Tile ${tile.index} (Team ${this.currentTurn})`);
                    }

                    // 2. Power Decay
                    if (tile.power > 1) {
                        tile.power -= 1;
                        changed = true;
                    }

                    if (changed) tile.draw();
                }
            }
            // Clear history for new turn
            if (this.scene) this.scene.actionHistory = [];
            this.scene.events.emit('updateUI'); // Notify UI to update
        }
    }

    calculateIncome(teamId) {
        // Base 3 + Bonus (1 per 5 tiles) + Special Bonus
        let tileCount = 0;
        let specialBonus = 0;

        for (let tile of this.grid.getAllTiles()) {
            if (tile.ownerID === teamId) {
                tileCount++;
                if (tile.isSpecial) {
                    specialBonus += 2; // +2 AP for Landmark
                }
            }
        }
        const territoryBonus = Math.floor(tileCount / 4);
        return 4 + territoryBonus + specialBonus;
    }

    calcAP(teamId) {
        // Round 1: AP already set in initGame. Do not add income.
        if (this.currentRound === 1) {
            console.log(`Round 1: Team ${teamId} uses initial AP.`);
            return;
        }

        const income = this.calculateIncome(teamId);
        this.teamData[teamId].ap += income;
        console.log(`Team ${teamId} gained ${income} AP. Total: ${this.teamData[teamId].ap}`);
    }

    endTurn() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }

        // Next turn
        if (this.currentTurn < this.teams) {
            this.currentTurn++;
        } else if (this.currentTurn === this.teams) {
            // After last team
            if (this.isPart2) {
                this.currentTurn = 9; // Go to AI
            } else {
                this.endRound();
                this.currentTurn = 1;
            }
        } else if (this.currentTurn === 9) {
            // After AI Turn -> End Round
            this.endRound();
            this.currentTurn = 1;
        }

        // Check Phonics event
        if (this.currentRound === 12 && !this.isPart2) {
            this.triggerPart2();
        }

        this.checkVictory();

        this.startTurn();
    }

    checkVictory() {
        if (!this.isPart2 && this.currentRound > 11) {
            this.triggerPart2();
            return;
        }

        // Part 2 Win/Loss
        if (this.isPart2) {
            let phonicsCount = 0;
            let totalTiles = 0;
            const tiles = this.grid.getAllTiles();
            for (let tile of tiles) {
                totalTiles++;
                if (tile.ownerID === 9) phonicsCount++;
            }

            // Condition A: Phonics eliminated (AFTER Round 16)
            // Round 16 is spawn/invincible round, so don't win immediately if count is 0 (shouldn't be though)
            if (this.currentRound > 12 && phonicsCount === 0) {
                this.scene.events.emit('showToast', "승리! 포닉스를 모두 물리쳤습니다!");
                this.scene.scene.pause();
                return;
            }

            // Condition B: Phonics > 50%
            if (phonicsCount / totalTiles >= 0.5) {
                this.scene.events.emit('showToast', "패배! 포닉스가 맵의 50% 이상을 점령했습니다!");
                this.scene.scene.pause();
                return;
            }
        }
    }

    endRound() {
        console.log(`Round ${this.currentRound} Ended`);

        // Trigger Invasion Check BEFORE incrementing if we want it to start AT round 16
        // If currentRound is 15, we are ending 15. Next is 16.
        if (!this.isPart2 && this.currentRound === 11) {
            this.triggerPart2();
        }

        this.currentRound++;
        this.scene.events.emit('updateUI');
    }

    triggerPart2() {
        this.isPart2 = true;
        this.scene.events.emit('part2Started'); // UI Popup if needed
        this.scene.events.emit('showToast', "경고: 포닉스의 침공이 시작되었습니다! (주요 건물 감염)");

        // Spawn Phonics at Landmarks
        const tiles = this.grid.getAllTiles();
        tiles.forEach(tile => {
            if (tile.isSpecial) {
                tile.setOwner(9); // Phonics
                tile.setPower(6); // Strong initial presence (Max)
                tile.isShielded = true; // Initial Shield
                tile.isPermanentShield = false; // Ensure it expires
                tile.draw();
            }
        });

        // Round 16 is Invincible Round
        // This logic is checked in AIController and tryAttack
    }

    getCurrentTeam() {
        if (this.currentTurn === 9) return null;
        return this.teamData[this.currentTurn];
    }

    destroy() {
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        this.eventListeners = { onTurnStart: [], onTurnEnd: [] };
        this.scene = null;
        this.grid = null;
        this.teamData = [];
        console.log("GameManager Destroyed");
    }
}
