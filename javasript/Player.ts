import SuperGif from "./SuperGif";

class Player {
  private frameIndex = -1;
  private iterationCount = 0;

  private showingInfo = false;
  private pinned = false;
  private supergif: SuperGif;

  constructor(private instance: SuperGif) {
    this.supergif = instance;
  }

  /**
   * Gets the index of the frame "up next".
   * @returns {number}
   */
  public getNextFrameNo() {
    let delta = this.supergif.forward ? 1 : -1;
    return (
      (this.frameIndex + delta + this.supergif.frames.length) %
      this.supergif.frames.length
    );
  }

  public stepFrame(amount: number) {
    // XXX: Name is confusing.
    this.frameIndex = this.frameIndex + amount;

    this.putFrame();
  }

  public step() {
    let stepping = false;
    const instance = this;
    let completeLoop = function () {
      if (instance.supergif.onEndListener !== null)
        instance.supergif.onEndListener(instance.supergif.gif);
      instance.iterationCount++;

      if (
        instance.supergif.overrideLoopMode !== false ||
        instance.iterationCount < 0
      ) {
        doStep();
      } else {
        stepping = false;
        instance.supergif.playing = false;
      }
    };

    let doStep = function () {
      stepping = instance.supergif.playing;
      if (!stepping) return;

      instance.stepFrame(1);
      let delay = instance.supergif.frames[instance.frameIndex].delay * 10;
      if (!delay) delay = 100; // FIfXME: Should this even default at all? What should it be?

      let nextFrameNo = instance.getNextFrameNo();
      if (nextFrameNo === 0) {
        delay += instance.supergif.loopDelay;
        setTimeout(completeLoop, delay);
      } else {
        setTimeout(doStep, delay);
      }
    };

    return function () {
      if (!stepping) setTimeout(doStep, 0);
    };
  }

  public putFrame() {
    let offset;
    this.frameIndex = parseInt(`${this.frameIndex}`, 10); // Convert to string

    if (this.frameIndex > this.supergif.frames.length - 1) {
      this.frameIndex = 0;
    }

    if (this.frameIndex < 0) {
      this.frameIndex = 0;
    }

    offset = this.supergif.frameOffsets[this.frameIndex];

    this.supergif.tmpCanvas
      .getContext("2d")
      .putImageData(
        this.supergif.frames[this.frameIndex].data,
        offset.x,
        offset.y
      );
    this.supergif.ctx.globalCompositeOperation = "copy";
    this.supergif.ctx.drawImage(this.supergif.tmpCanvas, 0, 0);
    if (typeof this.supergif.public === "function")
      this.supergif.onChangeListener(this.frameIndex);
  }

  public move_relative = this.stepFrame

  public play() {
    this.supergif.playing = true;
    this.step();
  }

  public pause() {
    this.supergif.playing = false;
  }

  public init() {
    if (this.supergif.loadError) return;

    if (!(this.supergif.options.c_w && this.supergif.options.c_h)) {
      this.supergif.ctx.scale(
        this.supergif.get_canvas_scale(),
        this.supergif.get_canvas_scale()
      );
    }

    if (this.supergif.options.auto_play) {
      this.step();
    } else {
      this.frameIndex = 0;
      this.putFrame();
    }
  }
  public current_frame() {
    return this.frameIndex;
  }
  public length() {
    return this.supergif.frames.length;
  }
  public move_to(frame_idx: number) {
    this.frameIndex = frame_idx;
    this.putFrame();
  }
}

export default Player