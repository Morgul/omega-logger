// --------------------------------------------------------------------------------------------------------------------
// Provides a basic logging system.
//
// @module logging
// --------------------------------------------------------------------------------------------------------------------

var path = require('path');
var util = require('util');

var strFormat = require('./util/strformat').format;

// --------------------------------------------------------------------------------------------------------------------

var logging = {
    levels: [
        'TRACE',
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'CRITICAL'
        ],
    strFormat: strFormat,
    dump: function dump(object, depth)
    {
        return new Dumper(object, depth);
    }, // end dump
    handlers: {}
};

module.exports = logging;

var mainDir = '';
try
{
    mainDir = path.dirname(require.main.filename);
}
catch(err) { } // Ignore exceptions. (which happen if you're requiring this from an interactive session)

// --------------------------------------------------------------------------------------------------------------------

var Context = require('./lib/context').Context;
var Dumper = require('./lib/dumper').Dumper;

// Load all included handlers.
var ConsoleHandler = require('./lib/handlers/console').ConsoleHandler;
require('./lib/handlers/file');

// --------------------------------------------------------------------------------------------------------------------

logging.log = function log(level, message)
{
    var logger = logging.getLogger('root');
    logger.log.apply(logger, arguments);
}; // end log

/**
 * Get a Logger for the given module or filename.
 *
 * @param obj the module or filename to get a logger for
 *
 * @return {Logger} the Logger for the given module
 */
logging.loggerFor = function loggerFor(obj)
{
    var filename;
    if(typeof obj == 'object' && obj.constructor.name == 'Module')
    {
        filename = obj.filename;
    }
    else if(typeof obj == 'string')
    {
        filename = obj;
    } // end if

    var loggerName = path.relative(mainDir, filename);

    // If we weren't able to determine a logger name, use the root logger instead.
    return logging.getLogger(loggerName || 'root');
}; // end loggerFor

/**
 * Get a Logger by name.
 *
 * @return {Logger} the Logger with the given name
 */
logging.getLogger = function getLogger(name)
{
    if(!name)
    {
        return logging.root;
    } // end if

    var logger = loggers[name];
    if(!logger)
    {
        // This logger doesn't exist; make a new one.
        logger = new Logger(name);
        loggers[name] = logger;

        // Insert this logger's name into loggerNamesSorted.
        var nameSortsAfterAll = loggerNamesSorted.every(
                function eachLoggerName(loggerName, index)
                {
                    if(name.length > loggerName.length)
                    {
                        // Insert new loggers before the first logger that has a longer name, so we don't have to
                        // re-sort the whole list. (yay insertion sort!)
                        loggerNamesSorted.splice(index, 0, name);

                        // Break out of our loop, since no subsequent logger could be our ancestor.
                        return false;
                    } // end if

                    return true;  // Keep looping over loggers.
                }); // end every

        if(nameSortsAfterAll)
        {
            loggerNamesSorted.push(name);
        } // end if
    } // end if

    return logger;
}; // end getLogger

logging.nextLevelDown = function nextLevelDown(level)
{
    return logging.levels[logging.levels.indexOf(level) - 1];
}; // end nextLevelDown

logging.nextLevelUp = function nextLevelUp(level)
{
    return logging.levels[logging.levels.indexOf(level) + 1] || logging.levels[logging.levels.length - 1];
}; // end nextLevelUp

// --------------------------------------------------------------------------------------------------------------------

/**
 * @classdesc The Logger class
 *
 * @constructor
 * @description Construct a Logger instance.
 *
 * @param name the name of the logger
 * @param config the configuration of the logger
 */
function Logger(name, config)
{
    // Read-only 'name' property
    Object.defineProperty(this, 'name', {value: name, configurable: false, enumerable: true, writable: false});

    this.propagate = true;

    for(var key in config)
    {
        if(config.hasOwnProperty(key))
        {
            this[key] = config[key];
        } // end if
    } // end for
} // end Logger

/**
 * Log a message.
 *
 * @param level the level (severity) of the log message; should be one of the values in `logging.levels`
 * @param message the message to log
 */
Logger.prototype.log = function log(level, message)
{
    if(logging.levels.indexOf(level.toUpperCase()) >= logging.levels.indexOf(this.level))
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
}; // end log

Logger.prototype.dump = logging.dump;

// Create Logger methods for each defined log level.
function initLogLevel(level)
{
    function logMethod(message)
    {
        this.log.apply(this, [level].concat(Array.prototype.slice.call(arguments)));
    } // end logMethod
    logMethod.name = level.toLowerCase();

    Logger.prototype[level.toLowerCase()] = logMethod;
} // end initLogLevel

logging.levels.forEach(initLogLevel);

function walkHierarchy(targetLoggerName, iterator, callback)
{
    var partialMatchEncountered = false;

    loggerNamesSorted.every(
            function eachLoggerName(loggerName, index)
            {
                if((targetLoggerName == loggerName || startsWith(targetLoggerName, loggerName + '.')) &&
                        loggers[loggerName])
                {
                    // If the current logger is an ancestor of the given name, call the iterator function.
                    iterator(loggers[loggerName], loggerName);
                    partialMatchEncountered = true;
                }
                else if(partialMatchEncountered)
                {
                    // We've already encountered at least one partial match, and we're no longer matching; since the
                    // list is sorted, we can stop iterating now.
                    return false;
                } // end if

                return true;  // Keep looping over loggers.
            }); // end every

    if(callback)
    {
        callback();
    } // end if
} // end walkHierarchy

// Define Logger properties which inherit their values from ancestor Loggers.
function loggerProp(name)
{
    var privateVarName = '__' + name;

    function getter()
    {
        var value = logging.root[privateVarName];
        walkHierarchy(this.name,
                function eachLogger(logger)
                {
                    // If the current logger is an ancestor of this and it has a value with this name, override
                    // value with the ancestor's private variable.
                    value = logger[privateVarName] || value;
                });

        return value;
    } // end getter
    getter.name = '_get_' + name;

    function setter(value)
    {
        this[privateVarName] = value;
    } // end setter
    setter.name = '_set_' + name;

    Object.defineProperty(Logger.prototype, name, {'get': getter, 'set': setter});
} // end loggerProp

loggerProp('level');

Object.defineProperty(Logger.prototype, 'handlers', {
    'get': function getHandlers()
    {
        var handlers = logging.root.__handlers;
        walkHierarchy(this.name,
                function eachLogger(logger)
                {
                    if(!logger.propagate)
                    {
                        // This logger is set to not propagate any messages to its ancestors; clear the handlers list.
                        handlers = [];
                    } // end if

                    handlers = handlers.concat(logger.__handlers || []);
                });

        return handlers;
    }, // end getHandlers
    'set': function setHandlers(value)
    {
        this.__handlers = value;
    } // end setHandlers
});

// --------------------------------------------------------------------------------------------------------------------

function startsWith(value, prefix)
{
    return value == prefix || value.substr(0, prefix.length) == prefix;
} // end startsWith

// --------------------------------------------------------------------------------------------------------------------

var loggers = {};
var loggerNamesSorted = ['root'];  // Logger names, sorted by ascending length.

// Create root logger.
logging.root = new Logger('root',
        {
            propagate: false,
            handlers: [
                new ConsoleHandler()
            ]
        });
