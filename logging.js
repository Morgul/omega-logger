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
         * The list of registered logging levels.
         *
         * This is an **ordered list**; setting a logger or handler's `level` will cause any level occurring _before_
         * it in this list to be **ignored** by that logger/handler.
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
         * @param {string} level - the name of the level to look up
         * @returns {number} the index of the matching level
         */
        getLevelIdx: function getLevelIdx(level)
        {
            if(level === undefined)
            {
                return -1;
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
         * @param {string} level - the name of the level to look up
         * @returns {string} the canonical name of the matching level
         */
        getLevel: function getLevel(level)
        {
            return logging.levels[logging.getLevelIdx(level)];
        }, // end nextLevelDown

        nextLevelDown: function nextLevelDown(level)
        {
            return logging.levels[logging.getLevelIdx(level) - 1];
        }, // end nextLevelDown

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

    // Create default console log handler.
    var ConsoleHandler = logging.handlers.Console;
    logging.defaultConsoleHandler = new ConsoleHandler();

    // Set the default console log handler's level according to the environment.
    if(process.env.LOG_LEVEL)
    {
        logging.defaultConsoleHandler.level = logging.getLevel(process.env.LOG_LEVEL);
    } // end if

    /**
     * The root logger.
     */
    logging.root = new logging.Logger('root', {
        propagate: false,
        handlers: [logging.defaultConsoleHandler]
    });

    // ----------------------------------------------------------------------------------------------------------------

    // Set the process-wide `$_omega_logger` property so we don't create the module multiple times.
    process.$_omega_logger = logging;
} // end if
