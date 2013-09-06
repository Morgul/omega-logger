// ---------------------------------------------------------------------------------------------------------------------
// The base log handler.
//
// @module lib/handlers/base
// ---------------------------------------------------------------------------------------------------------------------

var logging = require('../../logging');

// ---------------------------------------------------------------------------------------------------------------------

function BaseHandler(config)
{
    config = config || {};

    for(var key in config)
    {
        if(config.hasOwnProperty(key))
        {
            this[key] = config[key];
        } // end if
    } // end for
} // end BaseHandler

// --------------------------------------------------------------------------------------------------------------------

// Default settings
BaseHandler.prototype.level = null;  // By default, log everything.

// --------------------------------------------------------------------------------------------------------------------

BaseHandler.prototype.log = function log(context)
{
    if(logging.levels.indexOf(context.level) >= logging.levels.indexOf(this.level))
    {
        this.onMessage(context);
    } // end if
}; // end log

// --------------------------------------------------------------------------------------------------------------------

logging.handler.base = BaseHandler;

module.exports = {
    BaseHandler: BaseHandler
};
