// --------------------------------------------------------------------------------------------------------------------
// Provides a basic logging system.
//
// @module logging
// --------------------------------------------------------------------------------------------------------------------

var path = require('path');
var util = require('util');

var strFormat = require('./util/strformat').format;
var Context = require('./lib/context.js');
// --------------------------------------------------------------------------------------------------------------------

var logging = {
    'levels': [
        'TRACE',
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'CRITICAL'
        ],
    'levelColors': {
        'TRACE': '1;30',
        'DEBUG': '37',
        'INFO': '32',
        'WARN': '33',
        'ERROR': '31',
        'CRITICAL': '1;31'
        }
};

var mainDir = '';
try
{
    mainDir = path.dirname(require.main.filename);
}
catch(err) { } // Ignore exceptions. (which happen if you're requiring this from an interactive session)

// --------------------------------------------------------------------------------------------------------------------

logging.log = function log(level, message)
{
    var logger = logging.loggerForModule();
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
}; // end loggerForModule

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

        // Insert this logger's name into loggerNamesSorted.
        loggerNamesSorted.every(
                function eachLoggerName(ancestorName, index)
                {
                    if(name.length > ancestorLogger.length)
                    {
                        // Insert new loggers before the first logger that has a longer name, so we don't have to
                        // re-sort the whole list. (yay insertion sort!)
                        loggerNamesSorted.splice(index, 0, logger);

                        // Break out of our loop, since no subsequent logger could be our ancestor.
                        return false;
                    } // end if

                    return true;  // Keep looping over loggers.
                }); // end every
    } // end if

    return logger;
}; // end getLogger

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
    this.name = name;

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
    if(logging.levels.indexOf(level) >= logging.levels.indexOf(this.level))
    {
        var context = new Context(this.name, level, message, Array.prototype.slice.call(arguments, 2));

        console.log(strFormat(this.format, context));
    } // end if
}; // end log

Logger.prototype.dump = function dump(object, levels)
{
    levels = levels || 2;
    return util.inspect(object, false, levels, true);
}; // end dump

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

// Define Logger properties which inherit their values from ancestor Loggers.
function loggerProp(name)
{
    var privateVarName = '__' + name;

    function getter()
    {
        var value = this[privateVarName];

        if(!value)
        {
            loggerNamesSorted.every(
                    function eachLoggerName(ancestorName, index)
                    {
                        if(startsWith(name, ancestorLogger + '.') && loggers[ancestorName])
                        {
                            // If the current logger is an ancestor of this and it has a value with this name, override
                            // value with the ancestor's private variable.
                            value = loggers[ancestorName][privateVarName] || value;
                        } // end if

                        return true;  // Keep looping over loggers.
                    }); // end every

            if(!value)
            {
                value = logging.root[name];
            } // end if
        } // end if

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
loggerProp('format');

// --------------------------------------------------------------------------------------------------------------------

var loggers = {};
var loggerNamesSorted = [];  // Logger names, sorted by ascending length.

function startsWith(value, prefix)
{
    return value == prefix || value.substr(0, prefix.length) == prefix;
} // end startsWith

// --------------------------------------------------------------------------------------------------------------------

// Create root logger.
logging.root = new Logger('root',
        {
            'level': 'INFO',
            'format': '\033[90m{datetime}\033[m \033[1;30m[\033[{levelColor}m{level}\033[1;30m]\033[0;1m {logger}:\033[m {message}'
        });

// --------------------------------------------------------------------------------------------------------------------

module.exports = logging;
