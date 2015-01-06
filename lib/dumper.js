// --------------------------------------------------------------------------------------------------------------------
// The Dumper.
// --------------------------------------------------------------------------------------------------------------------

var util = require('util');

// --------------------------------------------------------------------------------------------------------------------

/**
 * Dumps the structure of arbitrary objects in a readable fashion.
 *
 * @alias module:logging.Dumper
 * @constructor
 *
 * @param {*} target - the object to dump
 * @param {(number|object)} [depthOrOptions] - the maximum depth to display, or an options object for `util.inspect()`;
 *          specify `0` to show only _top-level_ properties, or specify `-1` or `null` for unlimited depth
 */
function Dumper(target, depthOrOptions)
{
    /**
     * The object to dump.
     *
     * @member {*}
     */
    this.target = target;

    /**
     * The persistent options to be passed to `util.inspect()`.
     *
     * Unlike {@linkcode module:logging.Dumper#inspectOpts}, this object is not changed by
     * {@linkcode module:logging.Dumper#setLoggingContext}.
     *
     * @member {number}
     * @default {@linkcode module:logging.Dumper.defaultInspectOpts}
     */
    this.persistentInspectOpts = Object.create(Dumper.defaultInspectOpts);

    // Make an initial `inspectOpts` object.
    this._inspectOpts = Object.create(this.persistentInspectOpts);

    if(typeof depthOrOptions == 'object' && depthOrOptions !== null)
    {
        this.inspectOpts = depthOrOptions;
    }
    else
    {
        this.depth = depthOrOptions;
    } // end if
} // end Dumper

/**
 * The default options passed to `util.inspect()`.
 *
 * @default
 */
Dumper.defaultInspectOpts =  {};

/**
 * The options passed to `util.inspect()`.
 *
 * Setting this property generates a new object that inherits from {@linkcode Dumper#persistentInspectOpts}, and
 * adds/overrides properties from the provided object; this is done whenever {@linkcode Dumper#setLoggingContext} is
 * called.
 *
 * @member {number} module:logging.Dumper#inspectOpts
 * @default 2
 */
Object.defineProperty(Dumper.prototype, 'inspectOpts', {
    get: function()
    {
        return this._inspectOpts;
    }, // end get
    set: function(inspectOpts)
    {
        this._inspectOpts = {};

        for(var key in this.persistentInspectOpts || {})
        {
            this._inspectOpts[key] = this.persistentInspectOpts[key];
        } // end for
        for(key in inspectOpts || {})
        {
            this._inspectOpts[key] = inspectOpts[key];
        } // end for
    } // end set
}); // end Dumper#inspectOpts

/**
 * The maximum depth to display.
 *
 * Specify `0` to show only _top-level_ properties, or specify `-1` or `null` for unlimited depth.
 *
 * @member {number} module:logging.Dumper#depth
 * @default 2
 */
Object.defineProperty(Dumper.prototype, 'depth', {
    get: function()
    {
        return this.inspectOpts.depth;
    }, // end get
    set: function(depth)
    {
        if(depth == -1 || depth === null)
        {
            this.persistentInspectOpts.depth = null;
        }
        else if(depth !== undefined)
        {
            this.persistentInspectOpts.depth = depth;
        } // end if

        this.inspectOpts.depth = this.persistentInspectOpts.depth;
    } // end set
}); // end Dumper#depth

Dumper.prototype.setLoggingContext = function setLoggingContext(context)
{
    this.inspectOpts = (context.handler || {}).dumperArgs;
}; // end setLoggingContext

/**
 * Returns the output of `util.inspect()` called on this dumper's target object.
 */
Dumper.prototype.toString = function toString()
{
    return util.inspect(this.target, this.inspectOpts);
}; // end Dumper#toString

Dumper.prototype.inspect = Dumper.prototype.toString;

// --------------------------------------------------------------------------------------------------------------------

module.exports = Dumper;
