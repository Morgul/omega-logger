// --------------------------------------------------------------------------------------------------------------------
// Common implementation of the `level` and `levelIdx` properties.
//---------------------------------------------------------------------------------------------------------------------

var logging = require('../logging');

//---------------------------------------------------------------------------------------------------------------------

/**
 * Base class for objects that can have their own logging level set.
 */
function HasLevel()
{
    this._levelIdx = -1;
} // end HasLevel

//---------------------------------------------------------------------------------------------------------------------

/**
 * Get or set the name of this object's current logging level.
 *
 * `undefined` is used if no level (or an invalid one) is set.
 *
 * @member {string} HasLevel#level
 */
Object.defineProperty(HasLevel.prototype, 'level', {
    get: function()
    {
        return this._level;
    }, // end get
    set: function(value)
    {
        this.levelIdx = logging.getLevelIdx(value);
    } // end set
}); // end HasLevel#level

/**
 * Get or set the index of this object's current logging level.
 *
 * `-1` is used if no level (or an invalid one) is set.
 *
 * @member {number} HasLevel#levelIdx
 */
Object.defineProperty(HasLevel.prototype, 'levelIdx', {
    get: function()
    {
        return this._levelIdx;
    }, // end get
    set: function(value)
    {
        if(value === undefined)
        {
            value = -1;
        } // end if

        this._levelIdx = value;
        this._level = logging.levels[this._levelIdx];
    } // end set
}); // end HasLevel#levelIdx

//---------------------------------------------------------------------------------------------------------------------

module.exports = HasLevel;
