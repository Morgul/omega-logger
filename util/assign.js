// --------------------------------------------------------------------------------------------------------------------
/// Assign the properties of one or more objects to a target object.
///
/// @module
// --------------------------------------------------------------------------------------------------------------------

module.exports = function assign(target)
{
    var sources = Array.prototype.slice.call(arguments, 1);
    for(var sourceIdx = 0; sourceIdx < sources.length; sourceIdx++)
    {
        var source = sources[sourceIdx];
        for(var key in source)
        {
            target[key] = source[key];
        } // end for
    } // end for
    return target;
}; // end assign
