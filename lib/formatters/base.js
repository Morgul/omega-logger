// ---------------------------------------------------------------------------------------------------------------------
// The base log formatter.
//
// @module lib/formatters/base
// ---------------------------------------------------------------------------------------------------------------------

var logging = require('../../logging');

// ---------------------------------------------------------------------------------------------------------------------

function BaseFormatter(config)
{
    for(var key in config)
    {
        if(config.hasOwnProperty(key))
        {
            this[key] = config[key];
        } // end if
    } // end for
} // end BaseFormatter

// --------------------------------------------------------------------------------------------------------------------

// Default settings
BaseFormatter.prototype.level = null;  // By default, log everything.

// --------------------------------------------------------------------------------------------------------------------

BaseFormatter.prototype.log = function log(context)
{
    if(logging.levels.indexOf(context.level) >= logging.levels.indexOf(this.level))
    {
        this.onMessage(context);
    } // end if
}; // end log

// --------------------------------------------------------------------------------------------------------------------

function BaseMarker()
{
    this.lastContext = {};
} // end BaseMarker

// --------------------------------------------------------------------------------------------------------------------

BaseMarker.prototype.setLoggingContext = function setLoggingContext(context)
{
    this.lastContext = context;
}; // end setLoggingContext

// --------------------------------------------------------------------------------------------------------------------

logging.formatters.base = BaseFormatter;
logging.format.base = BaseMarker;

module.exports = {
    BaseFormatter: BaseFormatter,
    BaseMarker: BaseMarker
};
