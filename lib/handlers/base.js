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


BaseHandler.prototype.log = function log(context)
{
    if(logging.levels.indexOf(context.level) >= logging.levels.indexOf(this.level))
    {
        this.onMessage(context.attachToHandler(this));
    } // end if
}; // end log

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

// --------------------------------------------------------------------------------------------------------------------

logging.handlers.base = BaseHandler;

module.exports = {
    BaseHandler: BaseHandler
};
