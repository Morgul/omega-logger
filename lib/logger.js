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

Logger.loggerNamesSorted = [];

util.inherits(Logger, HasLevel);

// --------------------------------------------------------------------------------------------------------------------

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
 * Log a message.
 *
 * @param {string} level - the level (severity) to log the message at; should be one of the values in `logging.levels`
 * @param {string} message - the message string, contaianing zero or more `printf`-style placeholders (`%s`, `%d`,
 *          `%j`, or `%%`; see `util.format`)
 * @param {...*} args - arguments to render in place of placeholders in `message`; if more arguments than placeholders
 *          are present, they are converted to strings and concatenated to the message (see `util.format`)
 */
Logger.prototype.log = function log(level, message)
{
    if(logging.getLevelIdx(level) >= logging.getLevelIdx(this.level))
    {
        var context = new Context(this.name, level, message, Array.prototype.slice.call(arguments, 2));

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
}; // end Logger#log

/**
 * Obtain a child logger.
 *
 * @param {string} name - the logger name to append
 * @returns a new Logger instance with `.name` appended to its name
 */
Logger.prototype.child = function(name)
{
    return logging.getLogger(this.name + '.' + name);
}; // end Logger#child

/**
 * Dump the given object.
 *
 * Directly calls {@linkcode module:logging.dump}.
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

Logger.prototype.walkHierarchy = function(iterator, callback)
{
    var partialMatchEncountered = false;
    var targetLoggerName = this.name;

    Logger.loggerNamesSorted.every(function(loggerName)
    {
        if((targetLoggerName == loggerName || startsWith(targetLoggerName, loggerName + '.')) &&
                logging.namedLoggers[loggerName])
        {
            // If the current logger is an ancestor of the given name, call the iterator function.
            iterator(logging.namedLoggers[loggerName], loggerName);
            partialMatchEncountered = true;
        }
        else if(partialMatchEncountered)
        {
            // We've already encountered at least one partial match, but the current name doesn't match; since
            // the list is sorted, we can stop iterating now.
            return false;
        } // end if

        return true;  // Keep looping over loggers.
    }); // end loggerNamesSorted.every callback

    if(callback)
    {
        callback();
    } // end if
}; // end Logger#walkHierarchy

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

Object.defineProperty(Logger.prototype, 'handlers', {
    'get': function()
    {
        var handlers = logging.root.__handlers;

        this.walkHierarchy(function(logger)
        {
            if(!logger.propagate)
            {
                // This logger is set to not propagate any messages to its ancestors; clear the handlers list.
                handlers = [];
            } // end if

            handlers = handlers.concat(logger.__handlers || []);
        }); // end walkHierarchy callback

        return handlers;
    }, // end get
    'set': function(value)
    {
        this.__handlers = value;
    } // end set
}); // end Logger#handlers

// --------------------------------------------------------------------------------------------------------------------

function startsWith(value, prefix)
{
    return value == prefix || value.substr(0, prefix.length) == prefix;
} // end startsWith

// --------------------------------------------------------------------------------------------------------------------

module.exports = Logger;
