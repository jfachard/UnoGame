import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import Phaser from 'phaser';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1444,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#028af8',
    
    render: {
        pixelArt: true,  // False car tu n'utilises pas du pixel art strict
        antialias: false,  // Active l'anti-aliasing
        roundPixels: true // Arrondit les positions pour éviter le flou
    },
    
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Game,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Phaser.Game({ ...config, parent });

}

export default StartGame;
