// ---------------------------------------------------------------------------------------------------------------------
// A logging context.
//
// @module lib/context
// ---------------------------------------------------------------------------------------------------------------------

var util = require('util');

// ---------------------------------------------------------------------------------------------------------------------

function Context(logger, level, message, args)
{
    this.logger = logger;
    this.level = level;
    this.message = message;
    this.args = args || [];
} // end Context

function ctxProp(getter, setter)
{
    var name = getter.name;
    Object.defineProperty(Context.prototype, name, {'get': getter, 'set': setter});
} // end ctxProp

ctxProp(function datetime()
    {
        return this._date.toISOString().replace('T', ' ');
    }); // end datetime

ctxProp(function date()
    {
        return this._date.toISOString().split(/T|(?=Z)/)[0];
    }); // end date

ctxProp(function time()
    {
        return this._date.toISOString().split(/T|(?=Z)/)[1];
    }); // end time

ctxProp(function message()
    {
        this.args.forEach(function(arg)
        {
            if(arg.setLoggingContext)
            {
                arg.setLoggingContext(this);
            } // end if
        });

        return util.format.apply(util, [this._message].concat(this.args));
    },
    function set_message(message)
    {
        this._message = message;
        this._date = new Date();
    }); // end message

// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
    Context: Context
};
