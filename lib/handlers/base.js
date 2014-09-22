// --------------------------------------------------------------------------------------------------------------------
// The base log handler.
// --------------------------------------------------------------------------------------------------------------------

var util = require('util');

var logging = require('../../logging');

var HasLevel = require('../HasLevel');

// --------------------------------------------------------------------------------------------------------------------

/**
 * The base class for log handlers.
 *
 * Handlers are responsible for formatting and displaying/transmitting log messages to a given destination. For
 * instance, the {@linkcode module:logging.handlers.Console} handler formats (and optionally colors) messages to be
 * human-readable and displays them on standard output, whereas the {@linkcode module:logging.handlers.File} handler
 * formats and writes messages to a file.
 *
 * @alias module:logging.handlers.Base
 * @constructor
 * @extends HasLevel
 *
 * @param {object} config - configuration options for the handler
 */
function BaseHandler(config)
{
    config = config || {};

    HasLevel.apply(this);

    for(var key in config)
    {
        if(config.hasOwnProperty(key))
        {
            this[key] = config[key];
        } // end if
    } // end for
} // end BaseHandler

util.inherits(BaseHandler, HasLevel);

// --------------------------------------------------------------------------------------------------------------------

/**
 * Determines whether this handler has been _silenced_.
 *
 * A _handler_ may be silenced by:
 * - calling {@linkcode module:logging.handlers.Base#silence}
 * - calling {@linkcode module:logging.silence} if the handler in question is a console handler
 * - calling {@linkcode module:logging.silence}, passing `true` to silence _all logging_
 *
 * Once silenced, a handler may only be un-silenced by calling the _corresponding_ `unsilence` function(s). (i.e., in
 * order to un-silence a handler, {@linkcode module:logging.handlers.Base#unsilence} must be called if
 * {@linkcode module:logging.handlers.Base#silence} has been called, _and_ {@linkcode module:logging.unsilence}
 * must be called once if {@linkcode module:logging.silence} has been called with `true`, _and_ once if
 * {@linkcode module:logging.silence} has been called with no parameters and the handler is a console handler)
 *
 * @member {bool} module:logging.handlers.Base#silenced
 * @default false
 *
 * @see {@linkcode module:logging.silence}
 * @see {@linkcode module:logging.unsilence}
 * @see {@linkcode module:logging.handlers.Base#silence}
 * @see {@linkcode module:logging.handlers.Base#unsilence}
 */
Object.defineProperty(BaseHandler.prototype, 'silenced', {
    'get': function getSilenced()
    {
        return this._silenced || logging._silenceAll;
    } // end getSilenced
}); // end 'silenced' property
BaseHandler.prototype._silenced = false;

// --------------------------------------------------------------------------------------------------------------------

BaseHandler.prototype.log = function log(context)
{
    if(!this.silenced && logging.levels.indexOf(context.level) >= logging.levels.indexOf(this.level))
    {
        this.onMessage(context.attachToHandler(this));
    } // end if
}; // end log

/**
 * Silence this handler.
 *
 * @see {@linkcode module:logging.handlers.Base#silenced}
 * @return {module:logging.handlers.Base} this handler
 */
BaseHandler.prototype.silence = function()
{
    this._silenced = true;
    return this;
}; // end silence

/**
 * Un-silence this handler.
 *
 * Note: This will have _no apparent effect_ if this handler has been silenced due to calling
 * {@linkcode module:logging.silence}; this _only_ affects the handler-specific flag set by
 * {@linkcode module:logging.handlers.Base#silence}.
 *
 * @see {@linkcode module:logging.handlers.Base#silenced}
 * @return {module:logging.handlers.Base} this handler
 */
BaseHandler.prototype.unsilence = function()
{
    this._silenced = false;
    return this;
}; // end unsilence

BaseHandler.prototype.lessVerbose = function()
{
    this.level = logging.nextLevelUp(this.level);
}; // end lessVerbose

BaseHandler.prototype.moreVerbose = function()
{
    this.level = logging.nextLevelDown(this.level);
}; // end moreVerbose

BaseHandler.prototype.adjustFromArgs = function(args)
{
    // Default to process.argv if no args were passed.
    args = args || process.argv;

    var netLevelAdjustment = args.reduce(function(accum, arg)
    {
        // Short flags ('-v' or '-q')
        if(/^-\w*[vq]\w*$/.test(arg))
        {
            // Check each flag; skip the first character. ('-')
            for(var idx = 1; idx < arg.length; idx++)
            {
                switch(arg[idx])
                {
                    case 'v':
                        accum += 1;
                        break;
                    case 'q':
                        accum -= 1;
                        break;
                } // end switch
            } // end for
        }
        // Long flags ('--verbose' or '--quiet')
        else if(arg == '--verbose')
        {
            accum += 1;
        }
        else if(arg == '--quiet')
        {
            accum -= 1;
        } // end if

        return accum;
    }, 0);

    // Adjust our minimum severity level.
    for(; netLevelAdjustment < 0; netLevelAdjustment++)
    {
        this.lessVerbose();
    } // end for
    for(; netLevelAdjustment > 0; netLevelAdjustment--)
    {
        this.moreVerbose();
    } // end for
}; // end adjustFromArgs

BaseHandler.prototype.toString = function()
{
    var keys = Object.keys(this);
    if(keys.length)
    {
        return util.format('<%s | %s>',
            this.constructor.name,
            keys.map(function(k) { return util.format('%s: %j', k, this[k]); }.bind(this))
        );
    }
    else
    {
        return util.format('<%s>', this.constructor.name);
    } // end if
}; // end BaseHandler#toString

BaseHandler.prototype.inspect = BaseHandler.prototype.toString;

// --------------------------------------------------------------------------------------------------------------------

module.exports = BaseHandler;
