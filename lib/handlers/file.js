// --------------------------------------------------------------------------------------------------------------------
// The file log handler.
// --------------------------------------------------------------------------------------------------------------------

var fs = require('fs');
var util = require('util');

var strFormat = require('../../util/strformat');

var BaseHandler = require('./base');

// --------------------------------------------------------------------------------------------------------------------

function FileHandler(/*config*/)
{
    BaseHandler.apply(this, arguments);
    this.logFile = fs.createWriteStream(this.fileName,
            {flags: this.fileFlags, encoding: this.fileEncoding, mode: this.fileMode});
} // end FileHandler

util.inherits(FileHandler, BaseHandler);

// --------------------------------------------------------------------------------------------------------------------

// Default settings
FileHandler.prototype._rawFormat = '{datetime} [{level}] {logger}: {message}';
FileHandler.prototype._format = '{datetime} [{level}] {logger}: {message}\n';
FileHandler.prototype._newline = '\n';
FileHandler.prototype.fileName = './logging.log';
FileHandler.prototype.fileFlags = 'a';
FileHandler.prototype.fileEncoding = null;
FileHandler.prototype.fileMode = parseInt('0660', 16);
FileHandler.prototype.level = 'DEBUG';

// --------------------------------------------------------------------------------------------------------------------

FileHandler.prototype.onMessage = function onMessage(context)
{
    this.logFile.write(new Buffer(strFormat(this.format, context)));
}; // end onMessage

Object.defineProperty(FileHandler.prototype, 'format', {
    'get': function get_format()
    {
        return this._format;
    }, // end get_format
    'set': function set_format(format)
    {
        this._rawFormat = format;
        this._format = this._rawFormat + this._newline;
    } // end set_format
});

Object.defineProperty(FileHandler.prototype, 'newline', {
    'get': function get_newline()
    {
        return this._newline;
    }, // end get_newline
    'set': function set_newline(newline)
    {
        this._newline = newline;
        this._format = this._rawFormat + this._newline;
    } // end set_newline
});

// --------------------------------------------------------------------------------------------------------------------

module.exports = FileHandler;
