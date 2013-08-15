// ---------------------------------------------------------------------------------------------------------------------
// A logging context.
//
// @module lib/context
// ---------------------------------------------------------------------------------------------------------------------

var util = require('util');

// ---------------------------------------------------------------------------------------------------------------------

function Dumper(target, levels)
{
    this.target = target;
    this.levels = levels;
    this.inspectOpts = this.getDefaultInspectOpts();
} // end Dumper

Dumper.prototype.setLoggingContext = function setLoggingContext(context)
{
    this.inspectOpts = this.getDefaultInspectOpts();

    if(context._dumperArgs)
    {
        for(var key in context._dumperArgs)
        {
            this.inspectOpts[key] = context._dumperArgs[key];
        } // end for
    } // end if

    if(this.levels)
    {
        this.inspectOpts.depth = this.levels;
    } // end if
}; // end setLoggingContext

Dumper.prototype.toString = function toString()
{
    return util.inspect(this.target, this.inspectOpts);
}; // end toString

Dumper.prototype.inspect = Dumper.prototype.toString;

Dumper.prototype.getDefaultInspectOpts = function getDefaultInspectOpts()
{
    return {};
}; // end getDefaultInspectOpts

// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
    Dumper: Dumper
};
