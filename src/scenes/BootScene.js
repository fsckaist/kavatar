export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Backgrounds
        this.load.image('bg_map', 'assets/kaist_map.png');
        this.load.image('bg_title', 'assets/background_title_page.png');
        this.load.image('bg_phase1', 'assets/background_main_page_phase_1.png');
        this.load.image('bg_phase2', 'assets/background_main_page_phase_2.png');

        // Objects (Dice)
        for (let i = 1; i <= 6; i++) {
            this.load.image(`dice_${i}`, `assets/${i}.png`);
        }

        // Objects (Crowns)
        this.load.image('crown_gold', 'assets/crown_gold.png');
        this.load.image('crown_silver', 'assets/crown_silver.png');

        // Fields (Neutrals)
        this.load.image('field_brown', 'assets/field_brown.png');
        this.load.image('field_brown_selected', 'assets/field_brown_selected.png');
        this.load.image('field_gold', 'assets/field_gold.png'); // Special
        this.load.image('field_gold_selected', 'assets/field_gold_selected.png');
        this.load.image('field_silver', 'assets/field_silver.png'); // Special
        this.load.image('field_silver_selected', 'assets/field_silver_selected.png');

        // Lands (Teams)
        const colors = ['orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'ponix'];
        colors.forEach(color => {
            this.load.image(`land_${color}`, `assets/land_${color}.png`);
            this.load.image(`land_${color}_selected`, `assets/land_${color}_selected.png`);
            this.load.image(`land_${color}_shield`, `assets/land_${color}_shield.png`);
            this.load.image(`land_${color}_shield_selected`, `assets/land_${color}_shield_selected.png`);

            // Kingdom (Permanent Shield/Start) assets seem to exist too based on file list
            if (color !== 'ponix') {
                this.load.image(`land_${color}_kingdom`, `assets/land_${color}_kingdom.png`);
                this.load.image(`land_${color}_kingdom_selected`, `assets/land_${color}_kingdom_selected.png`);
            }
        });
    }

    create() {
        this.scene.start('TitleScene');
    }
}
