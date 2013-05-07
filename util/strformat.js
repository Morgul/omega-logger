// --------------------------------------------------------------------------------------------------------------------
// Basic Python3-style String Formatting
//
// @module strformat
// --------------------------------------------------------------------------------------------------------------------

var XRegExp = require('xregexp').XRegExp;

// --------------------------------------------------------------------------------------------------------------------

var formatPattern = XRegExp("\\{(?<varname>[a-zA-Z0-9_]*)\\}", 'g');

function format(formatString, context /*, positional args... */)
{
    var positional = Array.prototype.slice.call(arguments, 2);

    function formatReplacement(matched, varname)
    {
        if(varname)
        {
            return context[varname];
        }
        else
        {
            return positional.shift();
        } // end if
    } // end formatReplacement

    return XRegExp.replace(formatString, formatPattern, formatReplacement);
} // end format

//----------------------------------------------------------------------------------------------------------------------

module.exports = {
    'format': format
};
