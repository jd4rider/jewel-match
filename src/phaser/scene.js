import Phaser from 'phaser'
import { W, H, makeTextures } from './common.js'
import { audioState } from '../sound.js'
import { data } from './save.js'
import MenuScene from './MenuScene.js'
import MapScene from './MapScene.js'
import GameScene from './GameScene.js'

class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create() {
    makeTextures(this)
    audioState.muted = data.muted
    this.scene.start('menu')
  }
}

export function startGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#1b1038',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, MapScene, GameScene],
  })
}
