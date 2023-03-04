"use strict";
exports.__esModule = true;
var Stream_1 = require("./Stream");
var Player_1 = require("./Player");
var SuperGif = /** @class */ (function () {
    function SuperGif(props) {
        this.loadError = null;
        this.loading = false;
        this.transparency = null;
        this.delay = null;
        this.disposalMethod = null;
        this.disposalRestoreFromIdx = null;
        this.lastDisposalMethod = null;
        this.frame = null;
        this.lastImg = null;
        this.playing = true;
        this.forward = true;
        this.ctx_scaled = false;
        this.frames = [];
        this.frameOffsets = []; // elements have .x and .y properties
        this.options = {};
        this.progressBarBackgroundColor = "";
        this.progressBarForegroundColor = "";
        this.progressBarHeight = 0;
        this.drawWhileLoading = false;
        this.showProgressBar = false;
        this.canvas = document.createElement("canvas");
        this.initialized = false;
        this.load_callback = null;
        this.handler = {
            hdr: this.withProgress(this.doHdr, false),
            gce: this.withProgress(this.doGCE, false),
            com: this.withProgress(this.doNothing, false),
            // I guess that's all for now.
            app: {
                // TfODO: Is there much point in actually supporting iterations?
                NETSCAPE: this.withProgress(this.doNothing, false)
            },
            img: this.withProgress(this.doImg, true),
            eof: this.withProgress(this.doEOF, false)
        };
        this.options = {
            //viewport position
            vp_l: 0,
            vp_t: 0,
            vp_w: null,
            vp_h: null,
            //canvas sizes
            c_w: null,
            c_h: null
        };
        for (var i in props.options) {
            this.options[i] = props.options[i];
        }
        this.gif = this.options.gif;
        this.onEndListener = this.options.hasOwnProperty("on_end")
            ? this.options.on_end
            : null;
        this.onChangeListener = this.options.hasOwnProperty("on_change")
            ? this.options.on_change
            : null;
        this.loopDelay = this.options.hasOwnProperty("loop_delay")
            ? this.options.loop_delay
            : 0;
        this.overrideLoopMode = this.options.hasOwnProperty("loop_mode")
            ? this.options.loop_mode
            : "auto";
        this.drawWhileLoading = this.options.hasOwnProperty("draw_while_loading")
            ? this.options.draw_while_loading
            : true;
        this.showProgressBar = this.drawWhileLoading
            ? this.options.hasOwnProperty("show_progress_bar")
                ? this.options.show_progress_bar
                : true
            : false;
        this.progressBarHeight = this.options.hasOwnProperty("progressbar_height")
            ? this.options.progressbar_height
            : 25;
        this.progressBarBackgroundColor = this.options.hasOwnProperty("progressbar_background_color")
            ? this.options.progressbar_background_color
            : "rgba(255,255,255,0.4)";
        this.progressBarForegroundColor = this.options.hasOwnProperty("progressbar_foreground_color")
            ? this.options.progressbar_foreground_color
            : "rgba(255,0,22,.8)";
        if (this.options.vp_w && this.options.vp_h)
            this.options.is_vp = true;
        this.player = new Player_1["default"](this);
        if (typeof this.options.auto_play == "undefined")
            this.options.auto_play =
                !this.gif.getAttribute("rel:auto_play") ||
                    this.gif.getAttribute("rel:auto_play") == "1";
    }
    SuperGif.prototype.clear = function () {
        this.transparency = null;
        this.delay = null;
        this.lastDisposalMethod = this.disposalMethod;
        this.disposalMethod = null;
        this.frame = null;
    };
    SuperGif.prototype.init = function () {
        var parent = this.gif.parentNode;
        var div = document.createElement("div");
        this.ctx = this.canvas.getContext("2d");
        this.toolbar = document.createElement("div");
        this.tmpCanvas = document.createElement("canvas");
        div.style.width = this.canvas.width = this.gif.width;
        div.style.height = this.canvas.height = this.gif.height;
        this.toolbar.style.minWidth = this.gif.width + "px";
        div.className = "jsgif";
        this.toolbar.className = "jsgif_toolbar";
        div.appendChild(this.canvas);
        // div.appendChild(toolbar);
        if (parent) {
            parent.insertBefore(div, this.gif);
            // parent.removeChild(gif);
        }
        if (this.options.c_w && this.options.c_h)
            this.setSizes(this.options.c_w, this.options.c_h);
        this.initialized = true;
    };
    // XXX: There's probably a better way to handle catching exceptions when
    // callbacks are involved.
    SuperGif.prototype.doParse = function () {
        try {
            (0, Stream_1.parseGIF)(this.stream, this.handler);
        }
        catch (err) {
            console.error("in doParse: ", err);
            this.doLoadError("parse");
        }
    };
    SuperGif.prototype.doText = function (text) {
        this.toolbar.innerHTML = text; // innerText? Escaping? Whatever.
        this.toolbar.style.visibility = "visible";
    };
    SuperGif.prototype.setSizes = function (w, h) {
        this.canvas.width = w * this.get_canvas_scale();
        this.canvas.height = h * this.get_canvas_scale();
        this.toolbar.style.minWidth = w * this.get_canvas_scale() + "px";
        this.tmpCanvas.width = w;
        this.tmpCanvas.height = h;
        this.tmpCanvas.style.width = w + "px";
        this.tmpCanvas.style.height = h + "px";
        this.tmpCanvas.getContext("2d").setTransform(1, 0, 0, 1, 0, 0);
    };
    SuperGif.prototype.setFrameOffset = function (frame, offset) {
        if (!this.frameOffsets[frame]) {
            this.frameOffsets[frame] = offset;
            return;
        }
        if (typeof offset.x !== "undefined") {
            this.frameOffsets[frame].x = offset.x;
        }
        if (typeof offset.y !== "undefined") {
            this.frameOffsets[frame].y = offset.y;
        }
    };
    SuperGif.prototype.doShowProgress = function (pos, length, draw) {
        if (draw && this.showProgressBar) {
            var height = this.progressBarHeight;
            var left = void 0, mid = void 0, top_1, width = void 0;
            if (this.options.is_vp) {
                if (!this.ctx_scaled) {
                    top_1 = this.options.vp_t + this.options.vp_h - height;
                    height = height;
                    left = this.options.vp_l;
                    mid = left + (pos / length) * this.options.vp_w;
                    width = this.canvas.width;
                }
                else {
                    top_1 =
                        (this.options.vp_t + this.options.vp_h - height) /
                            this.get_canvas_scale();
                    height = height / this.get_canvas_scale();
                    left = this.options.vp_l / this.get_canvas_scale();
                    mid =
                        left +
                            (pos / length) * (this.options.vp_w / this.get_canvas_scale());
                    width = this.canvas.width / this.get_canvas_scale();
                }
                //some debugging, draw rect around viewport
                if (false) {
                    // if (!this.ctx_scaled) {
                    //   let l = this.options.vp_l,
                    //     t = this.options.vp_t;
                    //   let w = this.options.vp_w,
                    //     h = this.options.vp_h;
                    // } else {
                    //   let l = this.options.vp_l / this.get_canvas_scale(),
                    //     t = this.options.vp_t / this.get_canvas_scale();
                    //   let w = this.options.vp_w / this.get_canvas_scale(),
                    //     h = this.options.vp_h / this.get_canvas_scale();
                    // }
                    // this.ctx.rect(l, t, w, h);
                    // this.ctx.stroke();
                }
            }
            else {
                top_1 =
                    (this.canvas.height - height) /
                        (this.ctx_scaled ? this.get_canvas_scale() : 1);
                mid =
                    ((pos / length) * this.canvas.width) /
                        (this.ctx_scaled ? this.get_canvas_scale() : 1);
                width =
                    this.canvas.width / (this.ctx_scaled ? this.get_canvas_scale() : 1);
                height /= this.ctx_scaled ? this.get_canvas_scale() : 1;
            }
            this.ctx.fillStyle = this.progressBarBackgroundColor;
            this.ctx.fillRect(mid, top_1, width - mid, height);
            this.ctx.fillStyle = this.progressBarForegroundColor;
            this.ctx.fillRect(0, top_1, mid, height);
        }
    };
    SuperGif.prototype.doLoadError = function (originOfError) {
        var drawError = function (instance, hdr) {
            if (instance.ctx) {
                instance.ctx.fillStyle = "black";
                instance.ctx.fillRect(0, 0, instance.options.c_w ? instance.options.c_w : hdr.width, instance.options.c_h ? instance.options.c_h : hdr.height);
                instance.ctx.strokeStyle = "red";
                instance.ctx.lineWidth = 3;
                instance.ctx.moveTo(0, 0);
                instance.ctx.lineTo(instance.options.c_w ? instance.options.c_w : hdr.width, instance.options.c_h ? instance.options.c_h : hdr.height);
                instance.ctx.moveTo(0, instance.options.c_h ? instance.options.c_h : hdr.height);
                instance.ctx.lineTo(instance.options.c_w ? instance.options.c_w : hdr.width, 0);
                instance.ctx.stroke();
            }
        };
        var loadError = originOfError;
        var hdr = {
            width: this.gif.width,
            height: this.gif.height
        }; // Fake header.
        var frames = [];
        drawError(this, hdr);
    };
    SuperGif.prototype.doHdr = function (context, _hdr) {
        context.hdr = _hdr;
        context.setSizes(context.hdr.width, context.hdr.height);
    };
    SuperGif.prototype.doGCE = function (context, gce) {
        context.pushFrame();
        context.clear();
        context.transparency = gce.transparencyGiven ? gce.transparencyIndex : null;
        context.delay = gce.delayTime;
        context.disposalMethod = gce.disposalMethod;
        // We don't have much to do with the rest of GCE.
    };
    SuperGif.prototype.pushFrame = function () {
        if (!this.frame)
            return;
        this.frames.push({
            data: this.frame.getImageData(0, 0, this.hdr.width, this.hdr.height),
            delay: this.delay
        });
        this.frameOffsets.push({ x: 0, y: 0 });
    };
    SuperGif.prototype.doImg = function (context, img) {
        if (!context.frame)
            context.frame = context.tmpCanvas.getContext("2d");
        var currIdx = frames.length;
        //ct = color table, gct = global color table
        var ct = img.lctFlag ? img.lct : context.hdr.gct; // TfODO: What if neither exists?
        /*
                Disposal method indicates the way in which the graphic is to
                be treated after being displayed.
    
                Values :    0 - No disposal specified. The decoder is
                                not required to take any action.
                            1 - Do not dispose. The graphic is to be left
                                in place.
                            2 - Restore to background color. The area used by the
                                graphic must be restored to the background color.
                            3 - Restore to previous. The decoder is required to
                                restore the area overwritten by the graphic with
                                what was there prior to rendering the graphic.
    
                                Importantly, "previous" means the frame state
                                after the last disposal of method 0, 1, or 2.
                */
        if (currIdx > 0) {
            if (context.lastDisposalMethod === 3) {
                // Restore to previous
                // If we disposed every frame including first frame up to context point, then we have
                // no composited frame to restore to. In context case, restore to background instead.
                if (context.disposalRestoreFromIdx !== null) {
                    context.frame.putImageData(context.frames[context.disposalRestoreFromIdx].data, 0, 0);
                }
                else {
                    context.frame.clearRect(context.lastImg.leftPos, context.lastImg.topPos, context.lastImg.width, context.lastImg.height);
                }
            }
            else {
                context.disposalRestoreFromIdx = currIdx - 1;
            }
            if (context.lastDisposalMethod === 2) {
                // Restore to background color
                // Browser implementations historically restore to transparent; we do the same.
                // http://www.wizards-toolkit.org/discourse-server/viewtopic.php?f=1&t=21172#p86079
                context.frame.clearRect(context.lastImg.leftPos, context.lastImg.topPos, context.lastImg.width, context.lastImg.height);
            }
        }
        // else, Undefined/Do not dispose.
        // context.frame contains final pixel data from the last context.frame; do nothing
        //Get existing pixels for img region after applying disposal method
        var imgData = context.frame.getImageData(img.leftPos, img.topPos, img.width, img.height);
        //apply color table colors
        for (var i = 0; i < img.pixels.length; i++) {
            var pixel = img.pixels[i];
            // imgData.data === [R,G,B,A,R,G,B,A,...]
            if (pixel !== context.transparency) {
                var pix = ct[pixel];
                var idx = i * 4;
                imgData.data[idx] = pix[0];
                imgData.data[idx + 1] = pix[1];
                imgData.data[idx + 2] = pix[2];
                imgData.data[idx + 3] = 255; // Opaque.
            }
        }
        context.frame.putImageData(imgData, img.leftPos, img.topPos);
        if (!context.ctx_scaled) {
            context.ctx.scale(context.get_canvas_scale(), context.get_canvas_scale());
            context.ctx_scaled = true;
        }
        // We could use the on-page context.canvas directly, except that we draw a progress
        // bar for each image chunk (not just the final image).
        if (context.drawWhileLoading) {
            context.ctx.drawImage(context.tmpCanvas, 0, 0);
            context.drawWhileLoading = context.options.auto_play;
        }
        context.lastImg = img;
    };
    SuperGif.prototype.doDecodeProgress = function (draw) {
        this.doShowProgress(this.stream.pos, this.stream.data.length, draw);
    };
    SuperGif.prototype.doNothing = function () { };
    /**
     * @param{boolean=} draw Whether to draw progress bar or not; this is not idempotent because of translucency.
     *                       Note that this means that the text will be unsynchronized with the progress bar on non-frames;
     *                       but those are typically so small (GCE etc.) that it doesn't really matter. TODO: Do this properly.
     */
    SuperGif.prototype.withProgress = function (fn, draw) {
        var instance = this;
        return function (block) {
            fn(instance, block);
            if (draw)
                instance.doDecodeProgress(draw);
        };
    };
    SuperGif.prototype.doEOF = function (context, block) {
        //toolbar.style.display = '';
        context.pushFrame();
        context.doDecodeProgress(false);
        if (!(context.options.c_w && context.options.c_h)) {
            context.canvas.width = context.hdr.width * context.get_canvas_scale();
            context.canvas.height = context.hdr.height * context.get_canvas_scale();
        }
        context.player.init();
        context.loading = false;
        if (context.load_callback) {
            context.load_callback(context.gif);
        }
    };
    SuperGif.prototype.get_canvas_scale = function () {
        var scale;
        if (this.options.max_width &&
            this.hdr &&
            this.hdr.width > this.options.max_width) {
            scale = this.options.max_width / this.hdr.width;
        }
        else {
            scale = 1;
        }
        return scale;
    };
    SuperGif.prototype.load_setup = function (callback) {
        if (this.loading)
            return false;
        if (callback)
            this.load_callback = callback;
        else
            this.load_callback = null;
        this.loading = true;
        this.frames = [];
        this.clear();
        this.disposalRestoreFromIdx = null;
        this.lastDisposalMethod = null;
        this.frame = null;
        this.lastImg = null;
        return true;
    };
    SuperGif.prototype.get_frame = function (i) {
        return frames[i];
    };
    SuperGif.prototype.play = function () {
        return this.player.play();
    };
    SuperGif.prototype.pause = function () {
        return this.player.pause();
    };
    SuperGif.prototype.move_relative = function (i) {
        return this.player.move_relative(i);
    };
    SuperGif.prototype.move_to = function (i) {
        return this.player.move_to(i);
    };
    // getters for instance vars
    SuperGif.prototype.get_playing = function () {
        return this.playing;
    };
    SuperGif.prototype.get_canvas = function () {
        return this.canvas;
    };
    SuperGif.prototype.get_loading = function () {
        return this.loading;
    };
    SuperGif.prototype.get_auto_play = function () {
        return this.options.auto_play;
    };
    SuperGif.prototype.get_length = function () {
        return this.player.length();
    };
    SuperGif.prototype.get_current_frame = function () {
        return this.player.current_frame();
    };
    SuperGif.prototype.load_url = function (src, callback) {
        if (!this.load_setup(callback))
            return;
        var h = new XMLHttpRequest();
        // new browsers (XMLHttpRequest2-compliant)
        h.open("GET", src, true);
        if (h.overrideMimeType) {
            h.overrideMimeType("text/plain; charset=x-user-defined");
        }
        else if (h.responseType) {
            h.responseType = "arraybuffer";
        }
        else {
            h.setRequestHeader("Accept-Charset", "x-user-defined");
        }
        var instance = this;
        h.onloadstart = function () {
            // Wait until connection is opened to replace the gif element with a canvas to avoid a blank img
            if (!instance.initialized)
                instance.init();
        };
        h.onload = function (e) {
            if (this.status != 200) {
                instance.doLoadError("xhr - response");
            }
            // emulating response field for IE9
            if (!this.response) {
                this.response = new VBArray(this.responseText)
                    .toArray()
                    .map(String.fromCharCode)
                    .join("");
            }
            var data = this.response;
            if (data instanceof ArrayBuffer) {
                data = new Uint8Array(data);
            }
            instance.stream = new Stream_1.Stream(data);
            instance.doParse();
        };
        h.onprogress = function (e) {
            if (e.lengthComputable)
                instance.doShowProgress(e.loaded, e.total, true);
        };
        h.onerror = function () {
            instance.doLoadError("xhr");
        };
        h.send();
    };
    SuperGif.prototype.load = function (callback) {
        this.load_url(this.gif.getAttribute("rel:animated_src") || this.gif.src, callback);
    };
    SuperGif.prototype.load_raw = function (arr, callback) {
        if (!this.load_setup(callback))
            return;
        if (!this.initialized)
            this.init();
        this.stream = new Stream_1.Stream(arr);
        setTimeout(this.doParse, 0);
    };
    return SuperGif;
}());
exports["default"] = SuperGif;
