import { Scene } from 'phaser';
import { connectSocket, socket } from '../../utils/socket';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('background', 'assets/bg.png');
    }

    async create ()
    {   
        const connectingText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Connecting to server...',
            {
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        try{
            await connectSocket();
            this.registry.set('socket', socket);
            this.scene.start('Preloader');
        } catch (error) {
            connectingText.setText('Connection failed!\nRetry in 3s...');
            
            this.time.delayedCall(3000, () => {
                this.scene.restart();
            });
        }
    }
}
