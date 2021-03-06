// --------------------------------------------------------------------------------------------------------------------
// The console log handler.
// --------------------------------------------------------------------------------------------------------------------

var util = require('util');

var logging = require('../../logging');

var strFormat = require('../../util/strformat');

var BaseHandler = require('./base');

// --------------------------------------------------------------------------------------------------------------------

function envVarAsBool(name)
{
    return process.env[name] && ['no', 'off', 'false', '0'].indexOf(process.env[name].toLowerCase()) == -1;
} // end envVarAsBool

// --------------------------------------------------------------------------------------------------------------------

/**
 * A log handler which writes incoming messages to standard output.
 *
 * @alias module:logging.handlers.Console
 * @extends module:logging.handlers.Base
 * @constructor
 *
 * @param {object} config - configuration options for the handler
 * @param {boolean} [config.asJSON] - if `true`, or if unset and the `LOG_AS_JSON` environment variable is set, log
 *          messages as JSON objects (one line per logged message) instead of formatted strings
 */
function ConsoleHandler(config)
{
    BaseHandler.apply(this, arguments);
    if(this.asJSON === undefined)
    {
        this.asJSON = envVarAsBool('LOG_AS_JSON');
    } // end if
} // end ConsoleHandler

util.inherits(ConsoleHandler, BaseHandler);

// --------------------------------------------------------------------------------------------------------------------

// Default settings
ConsoleHandler.prototype.level = 'INFO';
ConsoleHandler.prototype.levelColors = {
    TRACE: '1;30',
    DEBUG: '37',
    INFO: '32',
    WARN: '33',
    ERROR: '31',
    CRITICAL: '1;31'
};

ConsoleHandler.prototype.dumperArgs = {
    colors: true
};

// If `DEBUG` is enabled, also display the filename, line number, and column of the call that generated each message.
if(envVarAsBool('DEBUG'))
{
    ConsoleHandler.prototype.format = '\x1b[90m{shortDatetime} <\x1b[1;30m{filename}\x1b[0;90m:\x1b[1;30m{line}\x1b[0;90m:\x1b[1;30m{column}\x1b[0;90m> \x1b[1;30m[\x1b[{levelColor}m{level}\x1b[1;30m]\x1b[0;1m {logger}:\x1b[m {message}';
}
else
{
    ConsoleHandler.prototype.format = '\x1b[90m{shortDatetime} \x1b[1;30m[\x1b[{levelColor}m{level}\x1b[1;30m]\x1b[0;1m {logger}:\x1b[m {message}';
} // end if

if(process.env.LOG_PREFIX)
{
    ConsoleHandler.prototype.format = '\x1b[1;30m' + process.env.LOG_PREFIX + '\x1b[m' + ConsoleHandler.prototype.format;
} // end if

// --------------------------------------------------------------------------------------------------------------------

/**
 * Determines whether this handler has been _silenced_.
 *
 * @member {bool} ConsoleHandler#silenced
 * @default false
 *
 * @see {@linkcode module:logging.handlers.Base#silenced}
 * @see {@linkcode module:logging.silence}
 * @see {@linkcode module:logging.unsilence}
 * @see {@linkcode module:logging.handlers.Base#silence}
 * @see {@linkcode module:logging.handlers.Base#unsilence}
 */
Object.defineProperty(ConsoleHandler.prototype, 'silenced', {
    'get': function getSilenced()
    {
        return this._silenced || logging._silenceAll || logging._silenceConsole;
    } // end getSilenced
}); // end ConsoleHandler#silenced

ConsoleHandler.prototype.onMessage = function onMessage(context)
{
    if(this.asJSON)
    {
        console.log('%j', context);
    }
    else
    {
        context.levelColor = this.levelColors[context.level];

        console.log(strFormat(this.format, context));
    } // end if
}; // end onMessage

// --------------------------------------------------------------------------------------------------------------------

module.exports = ConsoleHandler;
