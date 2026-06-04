import { Scene } from 'phaser';
import { connectSocket, socket } from '../../utils/socket';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.add.image(512, 384, 'background');

        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        this.load.on('progress', (progress: number) => {

            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        this.load.setPath('assets');

        this.load.image('logo', 'Carta_logo.png');
        this.load.audio('bgm', 'sound_music/Dealer_s_Choice.mp3');
    }

    async create ()
    {
        const connectingText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Connecting to server...',
            {
                fontSize: '28px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        try {
            await connectSocket();
            this.registry.set('socket', socket);
            
            connectingText.setText('Connected!');
            
            this.time.delayedCall(500, () => {
                this.scene.start('MainMenu');
            });
            
        } catch (error) {
            connectingText.setText('Connection failed!\nRetry in 3s...');
            
            this.time.delayedCall(3000, () => {
                this.scene.restart();
            });
        }
    }
}
