// --------------------------------------------------------------------------------------------------------------------
/// Provides a basic logging system.
///
/// @module
// --------------------------------------------------------------------------------------------------------------------

// Only create the main module object if it hasn't been created yet in this process.
if(process.$_omega_logger)
{
    // `omega-logger` has already been initialized; just export the existing module.
    module.exports = process.$_omega_logger;
    console.log("`omega-logger` has already been initialized; exporting the existing module.");
}
else
{
    var path = require('path');
    var util = require('util');

    // ----------------------------------------------------------------------------------------------------------------

    var mainDir;
    try
    {
        mainDir = path.dirname(require.main.filename);
    }
    catch(err)
    {
        // If you're requiring this from an interactive session, use the current working directory instead.
        mainDir = process.cwd();
    } // end try

    // The main `logging` module.
    var logging = module.exports = {
        /**
         * The list of registered logging (severity) levels.
         *
         * This is an **ordered list**; levels occurring _earlier_ in the list are considered _less severe_ than ones
         * that follow. If a logger or handler's `level` is set to a given value, that logger or handler will then
         * **ignore** any message with a less severe level.
         *
         * @default
         */
        levels: [
            'TRACE',
            'DEBUG',
            'INFO',
            'WARN',
            'ERROR',
            'CRITICAL'
        ],

        handlers: {},
        namedLoggers: {},

        // ------------------------------------------------------------------------------------------------------------
        // Functions

        strFormat: require('./util/strformat'),

        /**
         * Create a new Dumper; dump the structure of the given object in a readable fashion.
         *
         * @param {*} target - the object to dump
         * @param {?number} depth - the maximum depth to display; specify `0` to show only _top-level_ properties, or
         *          specify `-1` or `null` for unlimited depth
         *
         * @returns {module:logging.Dumper} a new dumper which will dump `target` when converted to a string
         */
        dump: function dump(target, depth)
        {
            return new logging.Dumper(target, depth);
        }, // end dump

        /**
         * Log a message to the root logger.
         */
        log: function log(/*level, message, ...*/)
        {
            var logger = logging.getLogger('root');
            logger.log.apply(logger, arguments);
        }, // end log

        /**
         * Get or create a Logger for the given module or filename.
         *
         * @param {(Module|string)} obj - the module or filename to get a logger for
         *
         * @return {Logger} the Logger for the given module
         */
        loggerFor: function loggerFor(obj)
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

            var loggerName = path.relative(logging._mainDir, filename);

            // If we weren't able to determine a logger name, use the root logger instead.
            return logging.getLogger(loggerName || 'root');
        }, // end loggerFor

        /**
         * Get a Logger by name.
         *
         * @return {Logger} the Logger with the given name
         */
        getLogger: function getLogger(name)
        {
            if(!name)
            {
                return logging.root;
            } // end if

            var logger = logging.namedLoggers[name];
            if(!logger)
            {
                // This logger doesn't exist; make a new one.
                logger = new logging.Logger(name);
                logging.namedLoggers[name] = logger;
            } // end if

            return logger;
        }, // end getLogger

        /**
         * Look up the index of a configured log level.
         *
         * An exact match will be attempted first, followed by matching against `level.toUpperCase()`.
         *
         * @param {(string|number)} level - the name or index of the level to look up
         * @returns {number} the index of the matching level, or `-1` if no matching level was found
         */
        getLevelIdx: function getLevelIdx(level)
        {
            if(level === undefined)
            {
                return -1;
            } // end if

            if(typeof level == 'number')
            {
                // If the given index exists in the logging level list, return it; otherwise, return -1 for not found.
                return (logging.levels[level] ? level : -1);
            } // end if

            if(typeof level != 'string')
            {
                level = level.toString();
            } // end if

            var idx = logging.levels.indexOf(level);
            if(idx < 0)
            {
                idx = logging.levels.indexOf(level.toUpperCase());
                if(idx < 0)
                {
                    var err = new Error(util.format("Unrecognized log level %j!", level));
                    err.hint = "Available levels: " + logging.levels.join(', ');
                    throw err;
                } // end if
            } // end if

            return idx;
        }, // end getLevelIdx

        /**
         * Look up the canonical name of a configured log level.
         *
         * An exact match will be attempted first, followed by matching against `level.toUpperCase()`.
         *
         * @param {(string|number)} level - the name or index of the level to look up
         * @returns {string} the canonical name of the matching level, or `undefined` if no matching level was found
         */
        getLevel: function getLevel(level)
        {
            return logging.levels[logging.getLevelIdx(level)];
        }, // end nextLevelDown

        /**
         * Get the next logging level below (less severe than) the given one.
         *
         * @param {(string|number)} level - the name or index of the level to look up
         * @returns {string} the name of the logging level directly below `level`
         */
        nextLevelDown: function nextLevelDown(level)
        {
            return logging.levels[logging.getLevelIdx(level) - 1];
        }, // end nextLevelDown

        /**
         * Get the next logging level above (more severe than) the given one.
         *
         * @param {(string|number)} level - the name or index of the level to look up
         * @returns {string} the name of the logging level directly above `level`
         */
        nextLevelUp: function nextLevelUp(level)
        {
            return logging.levels[logging.getLevelIdx(level) + 1] || logging.levels[logging.levels.length - 1];
        }, // end nextLevelUp

        /**
         * Silence logging.
         *
         * @param {boolean} all - if truthy, _all_ log handlers will be silenced; otherwise, only _console_ handlers
         *          will be silenced
         */
        silence: function silence(all)
        {
            if(all)
            {
                logging._silenceAll = true;
            }
            else
            {
                logging._silenceConsole = true;
            } // end if
        }, // end silence

        /**
         * Un-silence logging.
         *
         * If {@linkcode module:logging.silence} was called with a truthy value (silence _all_ log handlers), that flag
         * will be cleared; otherwise, the flag to silence all _console_ handlers will be cleared.
         *
         * This means that if `silence` has been called both with and without a truthy value, the first call to
         * `unsilence` will only un-silence **non-console** handlers; it would then have to be called a second time in
         * order to unmute _all_ handlers.
         */
        unsilence: function unsilence()
        {
            if(logging._silenceAll)
            {
                logging._silenceAll = false;
            }
            else
            {
                logging._silenceConsole = false;
            } // end if
        }, // end unsilence

        _mainDir: mainDir
    };

    // ----------------------------------------------------------------------------------------------------------------

    // Load and attach Dumper and Logger.
    logging.Dumper = require('./lib/dumper');
    logging.Logger = require('./lib/logger');

    // Load all included handlers.
    logging.handlers.Base = require('./lib/handlers/base');
    logging.handlers.Console = require('./lib/handlers/console');
    logging.handlers.File = require('./lib/handlers/file');

    // ----------------------------------------------------------------------------------------------------------------

    // Set the default level according to the environment.
    var defaultLevel = 'INFO';
    if(process.env.LOG_LEVEL)
    {
        defaultLevel = process.env.LOG_LEVEL;
    } // end if

    /**
     * The default console log handler.
     *
     * This handler is automatically configured at startup, and will set its level to
     *
     * @member {module:logging.handlers.Console} module:logging.defaultConsoleHandler
     */
    logging.defaultConsoleHandler = new logging.handlers.Console({level: defaultLevel});

    var rootLogger = new logging.Logger('root', {
        propagate: false,
        handlers: [logging.defaultConsoleHandler]
    });
    /**
     * The root logger.
     *
     * This is a read-only property.
     *
     * @member {module:logging.Logger} module:logging.root
     */
    Object.defineProperty(this, 'root', {value: rootLogger, configurable: false, enumerable: true, writable: false});

    // ----------------------------------------------------------------------------------------------------------------

    // Set the process-wide `$_omega_logger` property so we don't create the module multiple times.
    process.$_omega_logger = logging;
} // end if
