// --------------------------------------------------------------------------------------------------------------------
// A logging context.
// --------------------------------------------------------------------------------------------------------------------

var path = require('path');
var util = require('util');

var logging = require('../logging');

var stack = require('../util/stack');

var HasLevel = require('./HasLevel');

// --------------------------------------------------------------------------------------------------------------------

var datetimeSplitRE = /T/;

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
        toJSON: {value: this.toJSON.bind(this)}
    });
}; // end Context#attachToHandler

Context.prototype.toJSON = function()
{
    var serialized = {};
    for(var key in this)
    {
        serialized[key] = this[key];
    } // end for
    return serialized;
}; // end Context#toJSON

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
    }); // end date

ctxProp(function time()
    {
        return this._date.toISOString().split(datetimeSplitRE)[1];
    }); // end time

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
