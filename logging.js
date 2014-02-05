// --------------------------------------------------------------------------------------------------------------------
// Provides a basic logging system.
//
// @module logging
// --------------------------------------------------------------------------------------------------------------------

var path = require('path');

// --------------------------------------------------------------------------------------------------------------------

var logging = module.exports = {
    levels: [
        'TRACE',
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'CRITICAL'
        ],
    strFormat: require('./util/strformat').format,
    dump: function dump(object, depth)
    {
        return new Dumper(object, depth);
    }, // end dump
    handlers: {},
    namedLoggers: {}
};

var mainDir = '';
try
{
    mainDir = path.dirname(require.main.filename);
}
catch(err) { } // Ignore exceptions. (which happen if you're requiring this from an interactive session)

// --------------------------------------------------------------------------------------------------------------------

var Dumper = require('./lib/dumper').Dumper;
var Logger = require('./lib/logger').Logger;

// Load all included handlers.
var ConsoleHandler = require('./lib/handlers/console').ConsoleHandler;
require('./lib/handlers/file');

// --------------------------------------------------------------------------------------------------------------------

logging.log = function log(/*level, message*/)
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

    var logger = logging.namedLoggers[name];
    if(!logger)
    {
        // This logger doesn't exist; make a new one.
        logger = new Logger(name);
        logging.namedLoggers[name] = logger;

        // Insert this logger's name into loggerNamesSorted.
        var nameSortsAfterAll = Logger.loggerNamesSorted.every(
                function eachLoggerName(loggerName, index)
                {
                    if(name.length > loggerName.length)
                    {
                        // Insert new loggers before the first logger that has a longer name, so we don't have to
                        // re-sort the whole list. (yay insertion sort!)
                        Logger.loggerNamesSorted.splice(index, 0, name);

                        // Break out of our loop, since no subsequent logger could be our ancestor.
                        return false;
                    } // end if

                    return true;  // Keep looping over loggers.
                }); // end every

        if(nameSortsAfterAll)
        {
            Logger.loggerNamesSorted.push(name);
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

Logger.loggerNamesSorted = ['root'];  // Logger names, sorted by ascending length.

// Create default console log handler.
logging.defaultConsoleHandler = new ConsoleHandler();

// Create root logger.
logging.root = new Logger('root',
        {
            propagate: false,
            handlers: [logging.defaultConsoleHandler]
        });
