// --------------------------------------------------------------------------------------------------------------------
// A logging context.
// --------------------------------------------------------------------------------------------------------------------

var path = require('path');
var util = require('util');

var logging = require('../logging');

var assign = require('../util/assign');
var stack = require('../util/stack');

var HasLevel = require('./HasLevel');

// --------------------------------------------------------------------------------------------------------------------

var datetimeSplitRE = /T/;

/**
 * Extra properties to be assigned to all log messages.
 *
 * Populated from the `LOG_MSG_DATA` environment variable.
 *
 * @see {@linkcode Context#assign}
 */
var globalLogData = {};
if(process.env.LOG_MSG_DATA)
{
    try
    {
        globalLogData = JSON.parse(process.env.LOG_MSG_DATA);
    }
    catch(exc)
    {
        console.warn("Error parsing LOG_MSG_DATA from environment: %s", exc.stack || exc);
    } // end try
} // end if

// --------------------------------------------------------------------------------------------------------------------

/**
 * A context representing an individual log event.
 *
 * @constructor
 * @extends HasLevel
 *
 * @param {string} logger - the name of the logger that generated the event
 * @param {string} levelIdx - the index of the severity level at which this message was logged
 * @param {string} message - the message string, containing zero or more `printf`-style placeholders (`%s`, `%d`, `%j`,
 *          or `%%`; see `util.format`)
 * @param {Array.<string>} args - arguments to render in place of placeholders in `message`; if more arguments than
 *          placeholders are present, they are converted to strings and concatenated to the message (see `util.format`)
 */
function Context(logger, levelIdx, message, args)
{
    HasLevel.apply(this);

    // Assign any global log data that was given.
    assign(this, globalLogData);

    this.logger = logger;
    this.levelIdx = levelIdx;
    this.message = message;
    this.args = args || [];

    this._setUnserializedProp('args', args || []);
    this._setUnserializedProp('stack', stack.getStack());

    if(typeof this.message != 'string')
    {
        this.args.unshift(this.message);
        this.message = '%s';
    } // end if
} // end Context

util.inherits(Context, HasLevel);

// --------------------------------------------------------------------------------------------------------------------

/**
 * Create a proxy context attached to the given handler.
 *
 * This allows the dumper (and possibly other code) to tailor its behavior to the handler currently being used.
 *
 * @param {module:logging.handlers.Base} handler - the handler to attach to
 */
Context.prototype.attachToHandler = function(handler)
{
    return Object.create(this, {
        handler: {value: handler, enumerable: true},
        _dumperArgs: {value: handler.dumperArgs, enumerable: true},
        _context: {value: this, enumerable: true},
    });
}; // end Context#attachToHandler

Context.prototype.toJSON = function()
{
    var serialized = {};
    var ctx = this._context || this;
    for(var key in ctx)
    {
        serialized[key] = ctx[key];
    } // end for
    return serialized;
}; // end Context#toJSON

/**
 * Assign extra data properties to this context.
 *
 * Extra data properties will NOT be displayed by the console handler by default, but will be shown when `LOG_AS_JSON`
 * is enabled, and will also be available to all other handlers.
 *
 * @param {object} extraProperties - an object defining the extra properties to assign
 *
 * @returns {Context} `this`, for chaining
 */
Context.prototype.assign = function(extraProperties)
{
    return assign(this, extraProperties);
}; // end Context#assign

// --------------------------------------------------------------------------------------------------------------------

Context.prototype._setUnserializedProp = function(name, value)
{
    Object.defineProperty(this, name, {'value': value, 'enumerable': false, 'writable': true});
}; // end _setUnserializedProp

function ctxProp(getter, setter, serialized)
{
    var name = getter.name;
    Object.defineProperty(Context.prototype, name, {'get': getter, 'set': setter, 'enumerable': serialized !== false});
} // end ctxProp

ctxProp(function datetime()
    {
        return this._date.toISOString().replace(datetimeSplitRE, ' ');
    }); // end datetime

ctxProp(function shortDatetime()
    {
        var date = this.date;
        if(this.handler && date != this.handler._lastDate)
        {
            this.handler._lastDate = date;
            return date + ' ' + this.time;
        } // end if
        return this.time;
    }, undefined, false); // end shortDatetime

ctxProp(function date()
    {
        return this._date.toISOString().split(datetimeSplitRE)[0];
    }, undefined, false); // end date

ctxProp(function time()
    {
        return this._date.toISOString().split(datetimeSplitRE)[1];
    }, undefined, false); // end time

ctxProp(function message()
    {
        this.args.forEach(function(arg)
        {
            if(arg && arg.setLoggingContext)
            {
                arg.setLoggingContext(this);
            } // end if
        }.bind(this));

        return util.format.apply(util, [this._message].concat(this.args));
    },
    function set_message(message)
    {
        this._setUnserializedProp('_message', message);
        this._setUnserializedProp('_date', new Date());
    }); // end message

ctxProp(function type()
    {
        return this.stack[0].getTypeName();
    }); // end type

ctxProp(function func()
    {
        return this.stack[0].getMethodName() || '<anonymous>';
    }); // end func

ctxProp(function filename()
    {
        var fileName = this.stack[0].getFileName();
        if(fileName[0] == '/')
        {
            return path.relative(logging._mainDir, fileName);
        }
        else
        {
            return '<builtin> ' + fileName;
        } // end if
    }); // end filename

ctxProp(function line()
    {
        return this.stack[0].getLineNumber();
    }); // end line

ctxProp(function column()
    {
        return this.stack[0].getColumnNumber();
    }); // end column

// --------------------------------------------------------------------------------------------------------------------

module.exports = Context;
