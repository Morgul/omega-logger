// --------------------------------------------------------------------------------------------------------------------
// A named Logger.
// --------------------------------------------------------------------------------------------------------------------

var util = require('util');

var logging = require('../logging');

var Context = require('./context');
var HasLevel = require('./HasLevel');

// --------------------------------------------------------------------------------------------------------------------

/**
 * A logger, used to log messages under a given name.
 *
 * Logger names are hierarchical, with levels separated by periods (`.`); the base Logger configuration is inherited
 * from the Logger's ancestors.
 *
 * @alias module:logging.Logger
 * @constructor
 * @extends HasLevel
 *
 * @param {string} name - the name of the logger
 * @param {object} config - the configuration of the logger
 */
function Logger(name, config)
{
    // Read-only 'name' property
    Object.defineProperty(this, 'name', {value: name, configurable: false, enumerable: true, writable: false});

    this.propagate = true;

    HasLevel.apply(this);

    for(var key in config)
    {
        if(config.hasOwnProperty(key))
        {
            this[key] = config[key];
        } // end if
    } // end for
} // end Logger

util.inherits(Logger, HasLevel);

// --------------------------------------------------------------------------------------------------------------------

/**
 * Determines whether this logger has been _silenced_.
 *
 * A {@linkcode module:logging.Logger} may be silenced by:
 * - calling {@linkcode module:logging.Logger#silence}
 * - calling {@linkcode module:logging.silence}, passing `true` to silence _all logging_
 *
 * Once silenced, a logger may only be un-silenced by calling the _corresponding_ `unsilence` function(s). (i.e., in
 * order to un-silence a logger, {@linkcode module:logging.Logger#unsilence} must be called if
 * {@linkcode module:logging.Logger#silence} has been called, _and_ {@linkcode module:logging.unsilence} must be called
 * if {@linkcode module:logging.silence} has been called with `true`)
 *
 * @member {bool} module:logging.Logger#silenced
 * @default false
 *
 * @see {@linkcode module:logging.silence}
 * @see {@linkcode module:logging.unsilence}
 * @see {@linkcode module:logging.Logger#silence}
 * @see {@linkcode module:logging.Logger#unsilence}
 */
Object.defineProperty(Logger.prototype, 'silenced', {
    'get': function getSilenced()
    {
        return this._silenced || logging._silenceAll;
    } // end getSilenced
}); // end Logger#silenced
Logger.prototype._silenced = false;

/**
 * The full list of handlers which will receive messages from this logger.
 *
 * @member {Array.<module:logging.handlers.Base>} module:logging.Logger#handlers
 */
Object.defineProperty(Logger.prototype, 'handlers', {
    'get': function()
    {
        return this.accumInherited('_handlers', function(logger)
        {
            if(logger.propagate)
            {
                // This logger is set to not propagate any messages to its ancestors; stop after processing it.
                return 'stopAfter';
            } // end if
        });
    }, // end get
    'set': function(value)
    {
        this._handlers = value;
    } // end set
}); // end Logger#handlers

/**
 * Look up the current inherited level name using the logger hierarchy.
 *
 * @member {string} Logger#_level
 * @private
 * @see {HasLevel#level}
 */
Object.defineProperty(Logger.prototype, '_level', {
    get: function()
    {
        return this.getInherited('__level', true);
    }, // end get
    set: function(value)
    {
        this.__level = value;
    } // end set
}); // end Logger#_level

/**
 * Look up the current inherited level index using the logger hierarchy.
 *
 * @member {number} Logger#_levelIdx
 * @private
 * @see {HasLevel#levelIdx}
 */
Object.defineProperty(Logger.prototype, '_levelIdx', {
    get: function()
    {
        return this.getInherited('__levelIdx', true) || -1;
    }, // end get
    set: function(value)
    {
        if(value == -1)
        {
            this.__levelIdx = undefined;
        }
        else
        {
            this.__levelIdx = value;
        } // end if
    } // end set
}); // end Logger#_levelIdx

// --------------------------------------------------------------------------------------------------------------------

/**
 * Log a message using this logger.
 *
 * @param {(number|string)} level - the level (severity) to log the message at; should be the index of one of the
 *          values in `logging.levels`, or the value itself
 * @param {string} message - the message string, containing zero or more `printf`-style placeholders (`%s`, `%d`,
 *          `%j`, or `%%`; see `util.format`)
 * @param {...*} args - arguments to render in place of placeholders in `message`; if more arguments than placeholders
 *          are present, they are converted to strings and concatenated to the message (see `util.format`)
 *
 * @return {module:logging.Logger} this logger
 */
Logger.prototype.log = function log(level, message)//, ...args)
{
    if(this.silenced)
    {
        return this;
    } // end if

    var levelIdx = logging.getLevelIdx(level);
    if(levelIdx >= this.levelIdx)
    {
        var context = new Context(this.name, levelIdx, message, Array.prototype.slice.call(arguments, 2));

        this.handlers.forEach(function eachHandler(handler)
        {
            if(handler)
            {
                try
                {
                    handler.log(context);
                }
                catch(exc)
                {
                    console.error("ERROR: Exception while logging to %j handler %s: %s",
                            handler.constructor.name,
                            util.inspect(handler),
                            exc.stack || util.inspect(exc)
                            );
                } // end try
            } // end if
        }); // end eachHandler
    } // end if

    return this;
}; // end Logger#log

/**
 * Silence this logger.
 *
 * @see {@linkcode module:logging.Logger#silenced}
 * @return {module:logging.Logger} this logger
 */
Logger.prototype.silence = function()
{
    this._silenced = true;
    return this;
}; // end Logger#silence

/**
 * Un-silence this logger.
 *
 * Note: This will have _no apparent effect_ if this logger has been silenced due to calling
 * {@linkcode module:logging.silence}; this _only_ affects the logger-specific flag set by
 * {@linkcode module:logging.Logger#silence}.
 *
 * @see {@linkcode module:logging.Logger#silenced}
 * @return {module:logging.Logger} this logger
 */
Logger.prototype.unsilence = function()
{
    this._silenced = false;
    return this;
}; // end Logger#unsilence

/**
 * Obtain a child logger.
 *
 * @param {string} name - the logger name to append
 * @returns a new {@linkcode module:logging.Logger} instance with `.name` appended to its name
 */
Logger.prototype.child = function(name)
{
    return logging.getLogger(this.name + '.' + name);
}; // end Logger#child

/**
 * Dump the given object.
 *
 * Alias for {@linkcode module:logging.dump}.
 *
 * @method
 */
Logger.prototype.dump = logging.dump;

/**
 * The template for logging shortcut methods created by {@linkcode module:logging.Logger.logAt} and
 * {@linkcode module:logging.Logger.setLogMethods}.
 *
 * @private
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 *
 * @return {module:logging.Logger} this logger
 */
Logger._logMethodTemplate = function _logMethodTemplate(/*message, ...args*/)
{
    /* global _LEVEL_ */
    return this.log.apply(this, [_LEVEL_].concat(Array.prototype.slice.call(arguments)));
}; // end Logger._logMethodTemplate

/**
 * Create a {@linkcode module:logging.Logger} method for logging at the given log level.
 *
 * The returned method is a shortcut for passing the given level to {@linkcode module:logging.Logger#log}.
 *
 * @return {function(string, ...*)} a method which logs messages at the given log level
 */
Logger.logAt = function(level)
{
    // Disable warning about 'eval'; needed to be able to set the log method's name to `level`.
    //jshint evil: true

    var logMethodDef = Logger._logMethodTemplate.toString()
        .replace('_logMethodTemplate', level.toLowerCase())
        .replace(/\b_LEVEL_\b/g, logging.getLevelIdx(level));

    return new Function('return ' + logMethodDef)();
}; // end Logger.logAt

/**
 * Creates {@linkcode module:logging.Logger} methods for logging at each of the given log levels.
 *
 * The created methods are shortcuts for passing the corresponding level to {@linkcode module:logging.Logger#log}.
 *
 * @param {...string} [levels] - the levels to create convenience methods for (default: {@linkcode logging.levels})
 *
 * @return {module:logging.Logger} this logger
 */
Logger.setLogMethods = function()
{
    var levels = Array.prototype.slice.call(arguments);
    if(!levels || levels.length === 0)
    {
        levels = logging.levels;
    } // end if

    levels.forEach(function(level)
    {
        Logger.prototype[level.toLowerCase()] = Logger.logAt(level);
    }); // end forEach iterator
}; // end Logger.setLogMethods

/**
 * Log a trace message.
 *
 * @method module:logging.Logger#trace
 * @see {@linkcode module:logging.Logger#log}
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 * @return {module:logging.Logger} this logger
 */
/**
 * Log a debug message.
 *
 * @method module:logging.Logger#debug
 * @see {@linkcode module:logging.Logger#log}
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 * @return {module:logging.Logger} this logger
 */
/**
 * Log a info message.
 *
 * @method module:logging.Logger#info
 * @see {@linkcode module:logging.Logger#log}
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 * @return {module:logging.Logger} this logger
 */
/**
 * Log a warn message.
 *
 * @method module:logging.Logger#warn
 * @see {@linkcode module:logging.Logger#log}
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 * @return {module:logging.Logger} this logger
 */
/**
 * Log a error message.
 *
 * @method module:logging.Logger#error
 * @see {@linkcode module:logging.Logger#log}
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 * @return {module:logging.Logger} this logger
 */
/**
 * Log a critical message.
 *
 * @method module:logging.Logger#critical
 * @see {@linkcode module:logging.Logger#log}
 *
 * @param {string} message - the message string, containing zero or more placeholders (see {@linkcode module:logging.Logger#log})
 * @param {...*} args - arguments to render in place of placeholders in `message` (see {@linkcode module:logging.Logger#log})
 * @return {module:logging.Logger} this logger
 */
Logger.setLogMethods();

/**
 * Get the inherited value of the given key for this logger.
 *
 * Starting with this logger, this traverses up the logger hierarchy until a logger with a value for the given
 * key is found.
 *
 * @param {string} key - the name of the key to look for
 * @param {boolean} [ignoreNull] - if `true`, count `null` as a valid value (by default, `null` and `undefined` are both
 *          ignored when searching for values)
 *
 * @returns {*} the inherited value of `key` for this logger
 */
Logger.prototype.getInherited = function(key, nullIsValue)
{
    var value = this[key];
    if(value !== undefined && (nullIsValue || value !== null))
    {
        return value;
    } // end if

    var splitLoggerName = this.name.split('.');
    while(splitLoggerName.length > 1)
    {
        splitLoggerName.pop();
        var ancestorLogger = logging.namedLoggers[splitLoggerName.join('.')];

        if(ancestorLogger)
        {
            value = ancestorLogger[key];
            if(value !== undefined && (nullIsValue || value !== null))
            {
                return value;
            } // end if
        } // end if
    } // end while

    // If we haven't found a value for the given key yet, return it from the root logger.
    return logging.root[key];
}; // end Logger#getInherited

/**
 * Accumulate inherited values of the given key from this logger and all its ancestors into an array.
 *
 * Starting with this logger, this traverses up the logger hierarchy, accumulating all values for the given
 * key from each logger. If `stopCondition` is given, the traversal will stop when that function returns `"stopBefore"`
 * or `"stopAfter"` for a given logger.
 *
 * @param {string} key - the name of the key to look for
 * @param {function(module:logging.Logger):boolean} [stopCondition] - if provided, will be called for each logger
 *          encountered; traversal will stop _before_ processing the given logger if `"stopBefore"` is returned, or
 *          _after_ processing if `"stopAfter"` is returned
 *
 * @returns {Array.<*>} the accumulated values of `key` for this logger
 */
Logger.prototype.accumInherited = function(key, stopCondition)
{
    var values;

    var accum = this[key] || [];
    if(!Array.isArray(accum))
    {
        accum = [accum];
    } // end if

    if(this.name == 'root')
    {
        return accum;
    } // end if

    var splitLoggerName = this.name.split('.');
    while(splitLoggerName.length > 1)
    {
        splitLoggerName.pop();
        var ancestorLogger = logging.namedLoggers[splitLoggerName.join('.')];

        if(ancestorLogger)
        {
            var stopIndicator = stopCondition ? stopCondition(ancestorLogger) : null;
            if(stopIndicator == "stopBefore") { return accum; }

            values = ancestorLogger[key];
            if(values)
            {
                accum = accum.concat(values);
            } // end if

            if(stopIndicator == "stopAfter") { return accum; }
        } // end if
    } // end while

    values = logging.root[key];
    if(values)
    {
        accum = accum.concat(values);
    } // end if

    return accum;
}; // end Logger#accumInherited

// --------------------------------------------------------------------------------------------------------------------

module.exports = Logger;
