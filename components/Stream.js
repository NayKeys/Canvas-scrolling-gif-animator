"use strict";
exports.__esModule = true;
exports.parseGIF = exports.Stream = void 0;
/*
    SuperGif

    Example usage:

        <img src="./example1_preview.gif" rel:animated_src="./example1.gif" width="360" height="360" rel:auto_play="1" />

        <script type="text/javascript">
            $$('img').each(function (img_tag) {
                if (/.*\.gif/.test(img_tag.src)) {
                    let rub = new SuperGif({ gif: img_tag } );
                    rub.load();
                }
            });
        </script>

    Image tag attributes:

        rel:animated_src -	If this url is specified, it's loaded into the player instead of src.
                            This allows a preview frame to be shown until animated gif data is streamed into the canvas

        rel:auto_play -		Defaults to 1 if not specified. If set to zero, a call to the play() method is needed

    Constructor options args

        gif 				Required. The DOM element of an img tag.
        loop_mode			Optional. Setting this to false will force disable looping of the gif.
        auto_play 			Optional. Same as the rel:auto_play attribute above, this arg overrides the img tag info.
        max_width			Optional. Scale images over max_width down to max_width. Helpful with mobile.
        on_end				Optional. Add a callback for when the gif reaches the end of a single loop (one iteration). The first argument passed will be the gif HTMLElement.
        loop_delay			Optional. The amount of time to pause (in ms) after each single loop (iteration).
        draw_while_loading	Optional. Determines whether the gif will be drawn to the canvas whilst it is loaded.
        show_progress_bar	Optional. Only applies when draw_while_loading is set to true.

    Instance methods

        // loading
        load( callback )		Loads the gif specified by the src or rel:animated_src sttributie of the img tag into a canvas element and then calls callback if one is passed
        load_url( src, callback )	Loads the gif file specified in the src argument into a canvas element and then calls callback if one is passed

        // play controls
        play -				Start playing the gif
        pause -				Stop playing the gif
        move_to(i) -		Move to frame i of the gif
        move_relative(i) -	Move i frames ahead (or behind if i < 0)

        // getters
        get_canvas			The canvas element that the gif is playing in. Handy for assigning event handlers to.
        get_playing			Whether or not the gif is currently playing
        get_loading			Whether or not the gif has finished loading/parsing
        get_auto_play		Whether or not the gif is set to play automatically
        get_length			The number of frames in the gif
        get_current_frame	The index of the currently displayed frame of the gif

        For additional customization (viewport inside iframe) these params may be passed:
        c_w, c_h - width and height of canvas
        vp_t, vp_l, vp_ w, vp_h - top, left, width and height of the viewport

        A bonus: few articles to understand what is going on
            http://enthusiasms.org/post/16976438906
            http://www.matthewflickinger.com/lab/whatsinagif/bits_and_bytes.asp
            http://humpy77.deviantart.com/journal/Frame-Delay-Times-for-Animated-GIFs-214150546

*/
// Generic functions
var bitsToNum = function (ba) {
    return ba.reduce(function (s, n) {
        return s * 2 + n;
    }, 0);
};
var byteToBitArr = function (byte) {
    var a = [];
    for (var i = 7; i >= 0; i--) {
        a.push(!!(byte & (1 << i)));
    }
    return a;
};
// Stream
/**
 * @constructor
 */
// Make compiler happy.
var Stream = /** @class */ (function () {
    function Stream(data) {
        this.data = "";
        this.len = 0;
        this.pos = 0;
        this.data = data;
        this.len = this.data.length;
        this.pos = 0;
    }
    Stream.prototype.readByte = function () {
        if (this.pos >= this.data.length) {
            throw new Error("Attempted to read past end of stream.");
        }
        if (this.data instanceof Uint8Array)
            return this.data[this.pos++];
        else
            return this.data.charCodeAt(this.pos++) & 0xff;
    };
    Stream.prototype.readBytes = function (n) {
        var bytes = [];
        for (var i = 0; i < n; i++) {
            bytes.push(this.readByte());
        }
        return bytes;
    };
    Stream.prototype.read = function (n) {
        var s = "";
        for (var i = 0; i < n; i++) {
            s += String.fromCharCode(this.readByte());
        }
        return s;
    };
    Stream.prototype.readUnsigned = function () {
        // Little-endian.
        var a = this.readBytes(2);
        return (a[1] << 8) + a[0];
    };
    return Stream;
}());
exports.Stream = Stream;
var lzwDecode = function (minCodeSize, data) {
    var pos = 0; // Maybe this streaming thing should be merged with the Stream?
    var readCode = function (size) {
        var code = 0;
        for (var i = 0; i < size; i++) {
            if (data[pos >> 3] & (1 << (pos & 7))) {
                code |= 1 << i;
            }
            pos++;
        }
        return code;
    };
    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;
    var codeSize = minCodeSize + 1;
    var outputBlockSize = 4096, bufferBlockSize = 4096;
    var output = new Uint8Array(outputBlockSize), buffer = new Uint8Array(bufferBlockSize), dict = [];
    var bufferOffset = 0, outputOffset = 0;
    var fill = function () {
        for (var i = 0; i < clearCode; i++) {
            dict[i] = new Uint8Array(1);
            if (dict != null && dict[i] != null) {
                dict[i][0] = i;
            }
        }
        dict[clearCode] = new Uint8Array(0);
        dict[eoiCode] = null;
    };
    var clear = function () {
        var keep = clearCode + 2;
        dict.splice(keep, dict.length - keep);
        codeSize = minCodeSize + 1;
        bufferOffset = 0;
    };
    // Block allocators, double block size each time
    var enlargeOutput = function () {
        var outputSize = output.length + outputBlockSize;
        var newoutput = new Uint8Array(outputSize);
        newoutput.set(output);
        output = newoutput;
        outputBlockSize = outputBlockSize << 1;
    };
    var enlargeBuffer = function () {
        var bufferSize = buffer.length + bufferBlockSize;
        var newbuffer = new Uint8Array(bufferSize);
        newbuffer.set(buffer);
        buffer = newbuffer;
        bufferBlockSize = bufferBlockSize << 1;
    };
    var pushCode = function (code, last) {
        if (dict) {
            var newlength = dict[last].byteLength + 1;
            while (bufferOffset + newlength > buffer.length)
                enlargeBuffer();
            var newdict = buffer.subarray(bufferOffset, bufferOffset + newlength);
            newdict.set(dict[last]);
            newdict[newlength - 1] = dict[code][0];
            bufferOffset += newlength;
            dict.push(newdict);
        }
    };
    var code;
    var last;
    fill();
    while (true) {
        last = code;
        code = readCode(codeSize);
        if (code === clearCode) {
            clear();
            continue;
        }
        if (code === eoiCode)
            break;
        if (code < dict.length) {
            if (last !== clearCode) {
                pushCode(code, last);
            }
        }
        else {
            if (code !== dict.length)
                throw new Error("Invalid LZW code.");
            pushCode(last, last);
        }
        var newsize = dict[code].length;
        while (outputOffset + newsize > output.length)
            enlargeOutput();
        output.set(dict[code], outputOffset);
        outputOffset += newsize;
        if (dict.length === 1 << codeSize && codeSize < 12) {
            // If we're at the last code and codeSize is 12, the next code will be a clearCode, and it'll be 12 bits long.
            codeSize++;
        }
    }
    // I don't know if this is technically an error, but some GIFs do it.
    //if (Math.ceil(pos / 8) !== data.length) throw new Error('Extraneous LZW bytes.');
    return output.subarray(0, outputOffset);
};
// The actual parsing; returns an object with properties.
function parseGIF(st, handler) {
    handler || (handler = {});
    // LZW (GIF-specific)
    var parseCT = function (entries) {
        // Each entry is 3 bytes, for RGB.
        var ct = [];
        for (var i = 0; i < entries; i++) {
            ct.push(st.readBytes(3));
        }
        return ct;
    };
    var readSubBlocks = function () {
        var size, data, offset = 0;
        var bufsize = 8192;
        data = new Uint8Array(bufsize);
        var resizeBuffer = function () {
            var newdata = new Uint8Array(data.length + bufsize);
            newdata.set(data);
            data = newdata;
        };
        do {
            size = st.readByte();
            // Increase buffer size if this would exceed our current size
            while (offset + size > data.length)
                resizeBuffer();
            data.set(st.readBytes(size), offset);
            offset += size;
        } while (size !== 0);
        return data.subarray(0, offset); // truncate any excess buffer space
    };
    var parseHeader = function () {
        var hdr = {};
        hdr.sig = st.read(3);
        hdr.ver = st.read(3);
        if (hdr.sig !== "GIF")
            throw new Error("Not a GIF file."); // XXX: This should probably be handled more nicely.
        hdr.width = st.readUnsigned();
        hdr.height = st.readUnsigned();
        var bits = byteToBitArr(st.readByte());
        hdr.gctFlag = bits.shift();
        hdr.colorRes = bitsToNum(bits.splice(0, 3));
        hdr.sorted = bits.shift();
        hdr.gctSize = bitsToNum(bits.splice(0, 3));
        hdr.bgColor = st.readByte();
        hdr.pixelAspectRatio = st.readByte(); // if not 0, aspectRatio = (pixelAspectRatio + 15) / 64
        if (hdr.gctFlag) {
            hdr.gct = parseCT(1 << (hdr.gctSize + 1));
        }
        handler.hdr && handler.hdr(hdr);
    };
    var parseExt = function (block) {
        var parseGCExt = function (block) {
            var blockSize = st.readByte(); // Always 4
            var bits = byteToBitArr(st.readByte());
            block.reserved = bits.splice(0, 3); // Reserved; should be 000.
            block.disposalMethod = bitsToNum(bits.splice(0, 3));
            block.userInput = bits.shift();
            block.transparencyGiven = bits.shift();
            block.delayTime = st.readUnsigned();
            block.transparencyIndex = st.readByte();
            block.terminator = st.readByte();
            handler.gce && handler.gce(block);
        };
        var parseComExt = function (block) {
            block.comment = readSubBlocks();
            handler.com && handler.com(block);
        };
        var parsePTExt = function (block) {
            // No one *ever* uses this. If you use it, deal with parsing it yourself.
            var blockSize = st.readByte(); // Always 12
            block.ptHeader = st.readBytes(12);
            block.ptData = readSubBlocks();
            handler.pte && handler.pte(block);
        };
        var parseAppExt = function (block) {
            var parseNetscapeExt = function (block) {
                var blockSize = st.readByte(); // Always 3
                block.unknown = st.readByte(); // ??? Always 1? What is this?
                block.iterations = st.readUnsigned();
                block.terminator = st.readByte();
                handler.app && handler.app.NETSCAPE && handler.app.NETSCAPE(block);
            };
            var parseUnknownAppExt = function (block) {
                block.appData = readSubBlocks();
                // FIXME: This won't work if a handler wants to match on any identifier.
                handler.app &&
                    handler.app[block.identifier] &&
                    handler.app[block.identifier](block);
            };
            var blockSize = st.readByte(); // Always 11
            block.identifier = st.read(8);
            block.authCode = st.read(3);
            switch (block.identifier) {
                case "NETSCAPE":
                    parseNetscapeExt(block);
                    break;
                default:
                    parseUnknownAppExt(block);
                    break;
            }
        };
        var parseUnknownExt = function (block) {
            block.data = readSubBlocks();
            handler.unknown && handler.unknown(block);
        };
        block.label = st.readByte();
        switch (block.label) {
            case 0xf9:
                block.extType = "gce";
                parseGCExt(block);
                break;
            case 0xfe:
                block.extType = "com";
                parseComExt(block);
                break;
            case 0x01:
                block.extType = "pte";
                parsePTExt(block);
                break;
            case 0xff:
                block.extType = "app";
                parseAppExt(block);
                break;
            default:
                block.extType = "unknown";
                parseUnknownExt(block);
                break;
        }
    };
    var parseImg = function (img) {
        var deinterlace = function (pixels, width) {
            // Of course this defeats the purpose of interlacing. And it's *probably*
            // the least efficient way it's ever been implemented. But nevertheless...
            var newPixels = new Array(pixels.length);
            var rows = pixels.length / width;
            var cpRow = function (toRow, fromRow) {
                var fromPixels = pixels.slice(fromRow * width, (fromRow + 1) * width);
                newPixels.splice.apply(newPixels, [toRow * width, width].concat(fromPixels));
            };
            // See appendix E.
            var offsets = [0, 4, 2, 1];
            var steps = [8, 8, 4, 2];
            var fromRow = 0;
            for (var pass = 0; pass < 4; pass++) {
                for (var toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
                    cpRow(toRow, fromRow);
                    fromRow++;
                }
            }
            return newPixels;
        };
        img.leftPos = st.readUnsigned();
        img.topPos = st.readUnsigned();
        img.width = st.readUnsigned();
        img.height = st.readUnsigned();
        var bits = byteToBitArr(st.readByte());
        img.lctFlag = bits.shift();
        img.interlaced = bits.shift();
        img.sorted = bits.shift();
        img.reserved = bits.splice(0, 2);
        img.lctSize = bitsToNum(bits.splice(0, 3));
        if (img.lctFlag) {
            img.lct = parseCT(1 << (img.lctSize + 1));
        }
        img.lzwMinCodeSize = st.readByte();
        var lzwData = readSubBlocks();
        img.pixels = lzwDecode(img.lzwMinCodeSize, lzwData);
        if (img.interlaced) {
            // Move
            img.pixels = deinterlace(img.pixels, img.width);
        }
        handler.img && handler.img(img);
    };
    var parseBlock = function () {
        var block = {};
        block.sentinel = st.readByte();
        switch (String.fromCharCode(block.sentinel) // For ease of matching
        ) {
            case "!":
                block.type = "ext";
                parseExt(block);
                break;
            case ",":
                block.type = "img";
                parseImg(block);
                break;
            case ";":
                block.type = "eof";
                handler.eof && handler.eof(block);
                break;
            default:
                throw new Error("Unknown block: 0x" + block.sentinel.toString(16)); // TODO: Pad this with a 0.
        }
        if (block.type !== "eof")
            setTimeout(parseBlock, 0);
    };
    var parse = function () {
        parseHeader();
        setTimeout(parseBlock, 0);
    };
    parse();
}
exports.parseGIF = parseGIF;
;
