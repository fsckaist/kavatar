export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.text(width / 2, height / 3, 'KAVATAR', {
            fontFamily: 'Black Han Sans',
            fontSize: '80px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 3 + 80, '넙죽이와 포닉스의 역습 (v2.32 Text Hover)', {
            fontFamily: 'Do Hyeon',
            fontSize: '40px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const startButton = this.add.text(width / 2, height * 2 / 3, 'GAME START', {
            fontFamily: 'Black Han Sans',
            fontSize: '50px',
            color: '#00ff00',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
            this.scene.start('UIScene'); // Run UI parallel
        });

        // Editor Button
        const editorButton = this.add.text(width / 2, height * 0.85, '[ MAP EDITOR ]', {
            fontFamily: 'Do Hyeon',
            fontSize: '30px',
            color: '#888888'
        }).setOrigin(0.5).setInteractive();

        editorButton.on('pointerdown', () => {
            this.scene.start('MapEditorScene');
        });

        editorButton.on('pointerover', () => editorButton.setStyle({ fill: '#ffffff' }));
        editorButton.on('pointerout', () => editorButton.setStyle({ fill: '#888888' }));

        startButton.on('pointerover', () => startButton.setStyle({ fill: '#ffff00' }));
        startButton.on('pointerout', () => startButton.setStyle({ fill: '#00ff00' }));
    }
}
