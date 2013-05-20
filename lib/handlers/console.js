// ---------------------------------------------------------------------------------------------------------------------
// The console log handler.
//
// @module lib/handlers/console
// ---------------------------------------------------------------------------------------------------------------------

var util = require('util');

var strFormat = require('../../util/strformat').format;

var Context = require('../context').Context;
var BaseHandler = require('./base').BaseHandler;

// ---------------------------------------------------------------------------------------------------------------------

function ConsoleHandler(config)
{
    BaseHandler.apply(this, arguments);
} // end ConsoleHandler

util.inherits(ConsoleHandler, BaseHandler);

// --------------------------------------------------------------------------------------------------------------------

// Default settings
ConsoleHandler.prototype.format = '\033[90m{datetime}\033[m \033[1;30m[\033[{levelColor}m{level}\033[1;30m]\033[0;1m {logger}:\033[m {message}';
ConsoleHandler.prototype.level = 'INFO';
ConsoleHandler.prototype.levelColors = {
    TRACE: '1;30',
    DEBUG: '37',
    INFO: '32',
    WARN: '33',
    ERROR: '31',
    CRITICAL: '1;31'
};

// --------------------------------------------------------------------------------------------------------------------

ConsoleHandler.prototype.onMessage = function onMessage(context)
{
    context = new ConsoleContext(
            this,
            context.logger,
            context.level,
            context._message,
            context.args
            );
    console.log(strFormat(this.format, context));
}; // end onMessage

// --------------------------------------------------------------------------------------------------------------------

function ConsoleContext(handler, logger, level, message, args)
{
    this.handler = handler;
    Context.call(this, logger, level, message, args);
} // end ConsoleContext

util.inherits(ConsoleContext, Context);

Object.defineProperty(ConsoleContext.prototype, 'levelColor', {
    'get': function levelColor()
    {
        return this.handler.levelColors[this.level];
    } // end levelColor
});

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
    ConsoleHandler: ConsoleHandler
};
