// ---------------------------------------------------------------------------------------------------------------------
// A logging context.
//
// @module lib/context
// ---------------------------------------------------------------------------------------------------------------------

var path = require('path');
var util = require('util');

var logging = require('../logging');
var stack = require('../util/stack');

// ---------------------------------------------------------------------------------------------------------------------

var datetimeSplitRE = /T/;

// ---------------------------------------------------------------------------------------------------------------------

function Context(logger, level, message, args)
{
    this.logger = logger;
    this.level = level;
    this.message = message;
    this.args = args || [];
    this.stack = stack.getStack();
} // end Context

Context.prototype.attachToHandler = function(handler)
{
    function AttachedContext(handler)
    {
        this.handler = handler;
        this._dumperArgs = handler.dumperArgs;
    } // end AttachedContext

    AttachedContext.prototype = this;

    return new AttachedContext(handler);
}; // end Context#attachToHandler

// ---------------------------------------------------------------------------------------------------------------------

function ctxProp(getter, setter)
{
    var name = getter.name;
    Object.defineProperty(Context.prototype, name, {'get': getter, 'set': setter});
} // end ctxProp

ctxProp(function datetime()
    {
        return this._date.toISOString().replace(datetimeSplitRE, ' ');
    }); // end datetime

ctxProp(function shortDatetime()
    {
        var date = this.date;
        if(date != this.handler._lastDate)
        {
            this.handler._lastDate = date;
            return date + ' ' + this.time;
        } // end if
        return this.time;
    }); // end shortDatetime

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
        this._message = message;
        this._date = new Date();
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

// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
    Context: Context
};
