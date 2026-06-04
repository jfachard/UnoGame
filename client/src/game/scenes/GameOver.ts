import { Scene } from 'phaser';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameover_text : Phaser.GameObjects.Text;
    winner_text : Phaser.GameObjects.Text;
    winnerName: string = '';

    constructor ()
    {
        super('GameOver');
    }

    init(data: { winnerName?: string }) {
        this.winnerName = data.winnerName || 'Someone';
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'gameBackground');
        this.background.setAlpha(0.5);

        this.gameover_text = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'GAME OVER', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        this.gameover_text.setOrigin(0.5);

        this.winner_text = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, `🏆 ${this.winnerName} won the game! 🏆`, {
            fontFamily: 'Arial Black', fontSize: 32, color: '#f1c40f',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        });
        this.winner_text.setOrigin(0.5);

        // const returnText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 150, 'Click anywhere to return to Main Menu', {
        //     fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
        //     align: 'center'
        // }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
