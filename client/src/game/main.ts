import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { Lobby } from './scenes/Lobby';
import Phaser from 'phaser';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        width: 1444,
        height: 768
    },
    parent: 'game-container',
    backgroundColor: '#028af8',

    dom: {
        createContainer: true
    },
    
    render: {
        pixelArt: false,
        antialias: false,
        roundPixels: true
    },
    
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Lobby,
        Game,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Phaser.Game({ ...config, parent });

}

export default StartGame;
