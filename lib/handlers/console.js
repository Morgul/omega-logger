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
 */
function ConsoleHandler(/*config*/)
{
    BaseHandler.apply(this, arguments);
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

// Set the default console log handler's level according to the environment.
if(envVarAsBool('DEBUG'))
{
    ConsoleHandler.prototype.format = '\033[90m{shortDatetime} <\033[1;30m{filename}\033[0;90m:\033[1;30m{line}\033[0;90m:\033[1;30m{column}\033[0;90m> \033[1;30m[\033[{levelColor}m{level}\033[1;30m]\033[0;1m {logger}:\033[m {message}';
}
else
{
    ConsoleHandler.prototype.format = '\033[90m{shortDatetime} \033[1;30m[\033[{levelColor}m{level}\033[1;30m]\033[0;1m {logger}:\033[m {message}';
} // end if

if(process.env.LOG_PREFIX)
{
    ConsoleHandler.prototype.format = '\033[1;30m' + process.env.LOG_PREFIX + '\033[m' + ConsoleHandler.prototype.format;
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
    context.levelColor = this.levelColors[context.level];

    console.log(strFormat(this.format, context));
}; // end onMessage

// --------------------------------------------------------------------------------------------------------------------

module.exports = ConsoleHandler;
