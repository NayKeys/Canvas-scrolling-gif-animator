"use strict";
exports.__esModule = true;
var Player = /** @class */ (function () {
    function Player(instance) {
        this.instance = instance;
        this.frameIndex = -1;
        this.iterationCount = 0;
        this.showingInfo = false;
        this.pinned = false;
        this.move_relative = this.stepFrame;
        this.supergif = instance;
    }
    /**
     * Gets the index of the frame "up next".
     * @returns {number}
     */
    Player.prototype.getNextFrameNo = function () {
        var delta = this.supergif.forward ? 1 : -1;
        return ((this.frameIndex + delta + this.supergif.frames.length) %
            this.supergif.frames.length);
    };
    Player.prototype.stepFrame = function (amount) {
        // XXX: Name is confusing.
        this.frameIndex = this.frameIndex + amount;
        this.putFrame();
    };
    Player.prototype.step = function () {
        var stepping = false;
        var instance = this;
        var completeLoop = function () {
            if (instance.supergif.onEndListener !== null)
                instance.supergif.onEndListener(instance.supergif.gif);
            instance.iterationCount++;
            if (instance.supergif.overrideLoopMode !== false ||
                instance.iterationCount < 0) {
                doStep();
            }
            else {
                stepping = false;
                instance.supergif.playing = false;
            }
        };
        var doStep = function () {
            stepping = instance.supergif.playing;
            if (!stepping)
                return;
            instance.stepFrame(1);
            var delay = instance.supergif.frames[instance.frameIndex].delay * 10;
            if (!delay)
                delay = 100; // FIfXME: Should this even default at all? What should it be?
            var nextFrameNo = instance.getNextFrameNo();
            if (nextFrameNo === 0) {
                delay += instance.supergif.loopDelay;
                setTimeout(completeLoop, delay);
            }
            else {
                setTimeout(doStep, delay);
            }
        };
        return function () {
            if (!stepping)
                setTimeout(doStep, 0);
        };
    };
    Player.prototype.putFrame = function () {
        var offset;
        this.frameIndex = parseInt("".concat(this.frameIndex), 10); // Convert to string
        if (this.frameIndex > this.supergif.frames.length - 1) {
            this.frameIndex = 0;
        }
        if (this.frameIndex < 0) {
            this.frameIndex = 0;
        }
        offset = this.supergif.frameOffsets[this.frameIndex];
        this.supergif.tmpCanvas
            .getContext("2d")
            .putImageData(this.supergif.frames[this.frameIndex].data, offset.x, offset.y);
        this.supergif.ctx.globalCompositeOperation = "copy";
        this.supergif.ctx.drawImage(this.supergif.tmpCanvas, 0, 0);
        if (typeof this.supergif.public === "function")
            this.supergif.onChangeListener(this.frameIndex);
    };
    Player.prototype.play = function () {
        this.supergif.playing = true;
        this.step();
    };
    Player.prototype.pause = function () {
        this.supergif.playing = false;
    };
    Player.prototype.init = function () {
        if (this.supergif.loadError)
            return;
        if (!(this.supergif.options.c_w && this.supergif.options.c_h)) {
            this.supergif.ctx.scale(this.supergif.get_canvas_scale(), this.supergif.get_canvas_scale());
        }
        if (this.supergif.options.auto_play) {
            this.step();
        }
        else {
            this.frameIndex = 0;
            this.putFrame();
        }
    };
    Player.prototype.current_frame = function () {
        return this.frameIndex;
    };
    Player.prototype.length = function () {
        return this.supergif.frames.length;
    };
    Player.prototype.move_to = function (frame_idx) {
        this.frameIndex = frame_idx;
        this.putFrame();
    };
    return Player;
}());
exports["default"] = Player;
