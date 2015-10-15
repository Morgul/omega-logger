// --------------------------------------------------------------------------------------------------------------------
// A named Logger.
// --------------------------------------------------------------------------------------------------------------------

var util = require('util');

var logging = require('../logging');

var Context = require('./context');
var HasLevel = require('./HasLevel');

var assign = require('../util/assign');

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
    /**
     * The name of this logger.
     *
     * This is a read-only property.
     *
     * @member {string} module:logging.Logger#name
     */
    Object.defineProperty(this, 'name', {value: name, configurable: false, enumerable: true, writable: false});

    this.propagate = true;

    this.extraData = {};

    var parent;
    var lastDot = name.lastIndexOf('.');
    if(name == 'root')
    {
        parent = {};
    }
    else if(lastDot == -1)
    {
        parent = logging.root;
    }
    else
    {
        parent = logging.getLogger(name.slice(0, lastDot));
    } // end if

    /**
     * The parent of this logger.
     *
     * This is a read-only property.
     *
     * @member {module:logging.Logger} module:logging.Logger#parent
     */
    Object.defineProperty(this, 'parent', {value: parent, configurable: false, enumerable: true, writable: false});

    HasLevel.apply(this);

    this.configure(config);
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
        var handlers = this._handlers || [];
        if(!Array.isArray(handlers))
        {
            handlers = [handlers];
        } // end if

        if(this.propagate)
        {
            // This logger is set to propagate messages to its ancestors; add the parent logger's handlers.
            return handlers.concat(this.parent.handlers);
        } // end if

        return handlers;
    }, // end get
    'set': function(value)
    {
        this._handlers = value;
    } // end set
}); // end Logger#handlers

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
        var levelIdx = this.__levelIdx;
        if(levelIdx !== undefined)
        {
            return levelIdx;
        }
        else
        {
            levelIdx = this.parent.__levelIdx;
            if(levelIdx !== undefined)
            {
                return levelIdx;
            }
            else
            {
                return -1;
            } // end if
        } // end if
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

/**
 * Look up the complete set of actual and inherited extra data using the logger hierarchy.
 *
 * @member {number} Logger#extraData
 * @readonly
 * @see {@linkcode Context#assign}
 */
Object.defineProperty(Logger.prototype, 'extraData', {
    get: function()
    {
        return assign({}, this._extraData, this.parent.extraData);
    } // end get
}); // end Logger#extraData

// --------------------------------------------------------------------------------------------------------------------

/**
 * Configure this logger.
 *
 * @param {object} config - updates to apply to the configuration of this logger
 *
 * @return {module:logging.Logger} this logger
 */
Logger.prototype.configure = function(config)
{
    for(var key in config)
    {
        if(config.hasOwnProperty(key))
        {
            if(typeof this[key] == 'object' && this[key] !== null &&
                    typeof config[key] == 'object' && config[key] !== null)
            {
                // The given key has already been set to an object; assign the incoming object's properties to the
                // existing object.
                assign(this[key], config[key]);
            }
            else
            {
                this[key] = config[key];
            } // end if
        } // end if
    } // end for

    return this;
}; // end Logger#configure

/**
 * Assign extra data properties to this logger.
 *
 * Extra data assigned to a logger will be inherited by all {@linkcode Context} instances (log message events) created
 * by this logger.
 *
 * Extra data properties will NOT be displayed by the console handler by default, but will be shown when `LOG_AS_JSON`
 * is enabled, and will also be available to all other handlers.
 *
 * @see {@linkcode Context#assign}
 *
 * @param {object} extraProperties - an object defining the extra properties to assign
 *
 * @returns {Logger} `this`, for chaining
 */
Logger.prototype.assign = function(extraProperties)
{
    return assign(this._extraData, extraProperties);
}; // end Logger#assign

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
        var context = new Context(this.name, levelIdx, message, Array.prototype.slice.call(arguments, 2))
            .assign(this.extraData);

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
 * Note: This will have _no apparent effect_ if this logger has been silenced due to calling the package-wide
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

// --------------------------------------------------------------------------------------------------------------------

module.exports = Logger;
