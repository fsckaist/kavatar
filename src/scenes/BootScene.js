export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load assets here
        this.load.image('bg_map', 'assets/kaist_map.png');
    }

    create() {
        this.scene.start('TitleScene');
    }
}
