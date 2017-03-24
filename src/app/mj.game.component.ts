import { Component, ViewChild, OnDestroy } from '@angular/core';
import { MjStatusComponent }  from './mj.status.component';
import { MJTileCollectionComponent } from './mj.tile-collection.component';
import { MjGameControlService } from './mj.game.control.service';
import { MjAudioService } from './mj.audio.service';
import { Subscription }   from 'rxjs/Subscription';

@Component({
  selector: 'mj-game',
  template: `
    <style>
      .statusfield
      {
        position: relative;
        width: 100vw;
      }
      .gamefield {
        position: relative;
        width: 100vw;
        height: 80vh;
        background-color: #BEDDBF;
      }
    </style>

    <div class="statusfield"><status
      (undo)=onUndo()
      (redo)=onRedo()
      (restart)=onRestart()
      [hintsCount]=3
      [score]=score
      [timer]=timer
    ></status></div>

    <div class="gamefield noselect"><tile-collection
      [layout]=currentLayout
      (ready)=onTileCollectionReady()
      (tileCleared)=onTileCleared()
      (click)=onClick()
      [paused]=paused
      ></tile-collection></div>

    <options></options>
  `,
  providers: [MjGameControlService, MjAudioService]
})
export class MjGameComponent {
  private subscriptions: Subscription[] = [];
  constructor(private gameControlService: MjGameControlService, private audioService: MjAudioService) {
    this.subscriptions.push(audioService.soundsReady$.subscribe(
      status => {
        // TODO start playing music here, if it is on
      }
    ));

    this.subscriptions.push(gameControlService.paused$.subscribe(
      status => {
        this.paused = status;
      }
    ));

    window.setInterval((()=>{
      if (!this.paused) {
        this.timer += 1;
        if (this.score>0) {
          this.score -= 1;
        }
      }
    }).bind(this), 1000);
  }

  ngOnDestroy(): void {
    // prevent memory leak
    for (let subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
  }

  @ViewChild(MJTileCollectionComponent)
  private tileCollection: MJTileCollectionComponent;

  @ViewChild(MjStatusComponent)
  private status: MjStatusComponent;

  public currentLayout: string = null;

  ngOnInit(): void {
    this.audioService.load();

    // TODO - read from browser config
    this.gameControlService.updateSoundStatus(true);

    // load layout
    // TODO show "loading"
    // console.log("loading started");
    this.currentLayout = "dragon"; // update of layout will trigger initialisation of layout controller and tile field

    // start game now
    this.initGameValues();
  }

  onTileCollectionReady():void {
    // TODO hide "loading"
    // console.log("loading finished");
  }

  private checkGameStatus():void {
    if (this.tileCollection.activeTileCount==0) {
      // win
      this.audioService.play("win", 100);
    } else if (this.tileCollection.freePairs.length==0) {
      // lose
      this.audioService.play("lose", 100);
    } else {
      // keep on playing
      this.audioService.play("coin", 100);
    }
  }

  onTileCleared(): void {
    this.gameControlService.updateUndoStatus(true);
    this.gameControlService.updateRedoStatus(false);
    this.score += 10;
    this.checkGameStatus();
  }

  public onUndo() {
    let undoStatus = this.tileCollection.undo();
    this.gameControlService.updateUndoStatus(undoStatus);
    this.gameControlService.updateRedoStatus(true);
    this.audioService.play("undo", 100);
    this.score -= 20;
  }

  public onRedo() {
    let redoStatus = this.tileCollection.redo();
    this.gameControlService.updateUndoStatus(true);
    this.gameControlService.updateRedoStatus(redoStatus);
    this.checkGameStatus();
    this.score += 10;
  }

  // a.k.a. this.restart()
  public onRestart() {
    this.initGameValues();
    this.tileCollection.reset();
    this.status.reset();
  }

  private initGameValues() {
    this.score = 0;
    this.timer = 0;
    this.paused = false;
    this.gameControlService.pause(false);
  }

  private onClick() {
    // stop hint animation
    this.gameControlService.updateHintStatus(false);
  }

  private score: number;
  private timer: number;
  private paused: boolean;
}
