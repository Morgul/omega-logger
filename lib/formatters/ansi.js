// ---------------------------------------------------------------------------------------------------------------------
// A log format marker that processes ANSI SGR ("Select Graphic Rendition") codes in the wrapped content.
//
// SGR codes are escape codes that set the visual style of text in most consoles. They take the general form:
//
//     CSI n1 [;n2 [; ...]] m
//
// where `CSI` is either the 2-character sequence `\x1B[`, or the single character `\x9B`
//
// See also: https://en.wikipedia.org/wiki/ANSI_escape_code#graphics
//
// @module lib/formatters/ansi
// ---------------------------------------------------------------------------------------------------------------------

var logging = require('../../logging');

// ---------------------------------------------------------------------------------------------------------------------

var sgrRE = /(?:\x1B\[|\x9B)([0-9;-]*)m/;

// ---------------------------------------------------------------------------------------------------------------------

function ANSIMarker(contents)
{
    this.contents = contents;

    this.isBold = false;
    this.rgbValues = [];
} // end ANSIMarker

// --------------------------------------------------------------------------------------------------------------------

ANSIMarker.prototype.parseTextAttributes = function(match)
{
    var util = require('util');
    console.log("ANSIMarker#parseTextAttributes: match = %s", util.inspect(match, {colors: true}));

    return match[1].split(';').map(this.sgrCodeToAttribs.bind(this)); // end map
}; // end parseTextAttributes

ANSIMarker.prototype.runColorReplacer = function(replacer, match)
{
    var attribs = this.parseTextAttributes(match);
    return replacer(attribs, match[0]);
}; // end runColorReplacer

ANSIMarker.prototype.toString = function()
{
    var replacer = (this.lastContext || {}).replaceColors;

    if(typeof replacer == 'function')
    {
        return this.contents.replace(sgrRE, this.runColorReplacer.bind(this, replacer));
    }
    if(typeof replacer == 'string')
    {
        return this.contents.replace(sgrRE, replacer);
    }
    else if(replacer)
    {
        console.error("ERROR [ANSIMarker]: Invalid replacer type %j in context %j!", typeof replacer, this.lastContext);
    } // end if

    return this.contents;
}; // end toString

ANSIMarker.prototype.inspect = ANSIMarker.prototype.toString;

// --------------------------------------------------------------------------------------------------------------------

ANSIMarker.prototype.normalColors = [
    [0, 0, 0],        // Black
    [128, 0, 0],      // Red
    [0, 128, 0  ],    // Green
    [128, 128, 0],    // Brown/yellow
    [0, 0, 128],      // Blue
    [128, 0, 128],    // Magenta
    [0, 128, 128],    // Cyan
    [192, 192, 192],  // Gray
];

ANSIMarker.prototype.brightColors = [
    [128, 128, 128],  // Darkgray
    [255, 0, 0],      // Red
    [0, 255, 0],      // Green
    [255, 255, 0],    // Yellow
    [0, 0, 255],      // Blue
    [255, 0, 255],    // Magenta
    [0, 255, 255],    // Cyan
    [255, 255, 255],  // White
];

ANSIMarker.prototype.standardColorToAttrib = function(colorIdx, isBright)
{
    if(isBright)
    {
        return this.brightColors[colorIdx];
    }
    else
    {
        return this.normalColors[colorIdx];
    } // end if
}; // end standardColorToAttrib

ANSIMarker.prototype.xterm256ColorToAttrib = function(colorIdx)
{
    colorIdx = parseInt(colorIdx, 10);

    if(colorIdx >= 0x00 && colorIdx <= 0x07)  // 0x00-0x07:  standard colors (as in ESC [ 30..37 m)
    {
        return this.standardColorToAttrib(colorIdx, this.isBold);
    }
    else if(colorIdx >= 0x08 && colorIdx <= 0x0f)  // 0x08-0x0f:  high intensity colors (as in ESC [ 90..97 m)
    {
        return this.standardColorToAttrib(colorIdx - 0x08, true);
    }
    else if(colorIdx >= 0x10 && colorIdx <= 0xe7)  // 0x10-0xe7:  6*6*6=216 colors: 16 + 36*r + 6*g + b (0≤r,g,b≤5)
    {
        colorIdx -= 16;
        var r = Math.round(colorIdx / 36) % 6;
        var g = Math.round(colorIdx / 6) % 6;
        var b = colorIdx % 6;
        return [r, g, b];
    }
    else if(colorIdx >= 0xe8 && colorIdx <= 0xff)  // 0xe8-0xff:  grayscale from black to white in 24 steps
    {
        var gray = Math.round(colorIdx / 23 * 255);
        return [gray, gray, gray];
    } // end if
}; // end xterm256ColorToAttrib

ANSIMarker.prototype.sgrCodeToAttribs = function(sgrCode)
{
    sgrCode = sgrCode || '0';

    switch(this.sgrPrefix)
    {
        case '38':  // Extended text color (foreground)
        case '48':  // Extended background color
            // next arguments should be 5;x where x is color index (0..255), or 2;r;g;b for 24-bit colors
            if(sgrCode == '5')
            {
                this.sgrPrefix = this.sgrPrefix + ';5';
            }
            else
            {
                this.sgrPrefix = undefined;
            } // end if
            return [];

        case '38;2':  // Set Konsole 24-bit text color (foreground)
        case '48;2':  // Set Konsole 24-bit background color
            // next arguments should be r;g;b where r, g, and b are color channel values (0..255)
            this.rgbValues.push(sgrCode);

            if(this.rgbValues.length == 3)
            {
                this.sgrPrefix = undefined;
                var rgbColor = this.rgbValues;
                this.rgbValues = [];
                return rgbColor;
            } // end if

            return [];

        case '38;5':  // Set xterm-256 text color (foreground)
        case '48;5':  // Set xterm-256 background color
            // next argument should be a color index (0..255)
            this.sgrPrefix = undefined;
            return this.xterm256ColorToAttrib(sgrCode);
    } // end if

    sgrCode = parseInt(sgrCode, 10);
    switch(sgrCode)
    {
        case 0:  // Reset / Normal
            // all attributes off
            var attribs = []; //FIXME: Check isBold, etc., and emit "off" attributes for any that were on.
            this.isBold = false;
            return attribs;
        case 1:  // Bold or increased intensity
            this.isBold = true;
            return [{bold: true}];
        case 2:  // Faint (decreased intensity)
            // not widely supported
            break;
        case 3:  // Italic: on
            // not widely supported. Sometimes treated as inverse.
            break;
        case 4:  // Underline: Single
            break;
        case 5:  // Blink: Slow
            // less than 150 per minute
            break;
        case 6:  // Blink: Rapid
            // MS-DOS ANSI.SYS; 150 per minute or more; not widely supported
            break;
        case 7:  // Image: Negative
            // inverse or reverse; swap foreground and background (reverse video)
            break;
        case 8:  // Conceal
            // not widely supported
            break;
        case 9:  // Crossed-out
            // Characters legible, but marked for deletion. Not widely supported.
            break;

        case 10:  // Primary(default) font
            break;
        case 11:  // n-th alternate font
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
        case 19:
            // Select the n-th alternate font. (14 being the fourth alternate font, up to 19 being the 9th alternate font)
            break;

        case 20:  // Fraktur
            // hardly ever supported
            break;
        case 21:  // Bold: off or Underline: Double
            // bold off not widely supported, double underline hardly ever
            break;
        case 22:  // Normal color or intensity
            // neither bold nor faint
            break;
        case 23:  // Not italic, not Fraktur
            break;
        case 24:  // Underline: None
            // not singly or doubly underlined
            break;
        case 25:  // Blink: off
            break;
        case 26:  // Reserved
            break;
        case 27:  // Image: Positive
            break;
        case 28:  // Reveal
            // conceal off
            break;
        case 29:  // Not crossed out
            break;

        case 30:  // Set text color (foreground)
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
            return [{foreground: this.standardColorToAttrib(sgrCode - 30, this.isBold)}];
        case 38:  // Set xterm-256 text color (foreground)
            // next arguments are 5;x where x is color index (0..255)
            this.sgrPrefix = sgrCode;
            break;
        case 39:  // Default text color (foreground)
            // implementation defined (according to standard)
            return [{foreground: 'default'}];

        case 40:  // Set background color
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
            return [{background: this.standardColorToAttrib(sgrCode - 40)}];
        case 48:  // Set xterm-256 background color
            // next arguments are 5;x where x is color index (0..255)
            this.sgrPrefix = sgrCode;
            break;
        case 49:  // Default background color
            // implementation defined (according to standard)
            return [{background: 'default'}];

        case 50:  // Reserved
            break;
        case 51:  // Framed
            break;
        case 52:  // Encircled
            break;
        case 53:  // Overlined
            break;
        case 54:  // Not framed or encircled
            break;
        case 55:  // Not overlined
            break;
        case 56:
        case 59:  // Reserved
            break;
        case 60:  // ideogram underline or right side line
            // hardly ever supported
            break;
        case 61:  // ideogram double underline or double line on the right side
            // hardly ever supported
            break;
        case 62:  // ideogram overline or left side line
            // hardly ever supported
            break;
        case 63:  // ideogram double overline or double line on the left side
            // hardly ever supported
            break;
        case 64:  // ideogram stress marking
            // hardly ever supported
            break;
        case 90:
        case 99:  // Set foreground text color, high intensity
            // aixterm (not in standard)
            return [{foreground: this.standardColorToAttrib(sgrCode - 90, true)}];
        case 100:
        case 109:  // Set background color, high intensity
            // aixterm (not in standard)
            return [{background: this.standardColorToAttrib(sgrCode - 100, true)}];
    } // end switch

    return [];
}; // end sgrCodeToAttribs

// --------------------------------------------------------------------------------------------------------------------

logging.format.ansi = ANSIMarker;

module.exports = {
    ANSIMarker: ANSIMarker
};
