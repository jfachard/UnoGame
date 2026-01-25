import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image('background', 'assets/bg.png');
        this.load.image('logo', 'assets/Carta_logo.png');
        this.load.image('playButton', 'assets/buttons/PlayButton.png');
    }

    create ()
    {   
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, 'background');

        this.add.image(width / 2, height / 2 - 250, 'logo').setScale(0.38);

        const playButton = this.add.image(
            width / 2,
            height / 2 + 100,
            'playButton'
        ).setInteractive({ useHandCursor: true }).setScale(1.5);

        playButton.on('pointerdown', () => {
            this.scene.start('Preloader');
        });
    }
}
