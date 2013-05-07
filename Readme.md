# Omega logger

A simple and powerful logger inspired by python's `logger` module. While designed for use in
[omega-node](https://github.com/morgul/omega-node), it is a general enough logging system that it can be used just about
anywhere.

## Basic use

```javascript
var logger = require('../logging').loggerFor(module);

logger.warn("This is a warning. You have to the count of %s to surrender.", 3);
logger.info("Also, you might want to know this information. It's useful.");
logger.critical("OMG, we have an object: %s", logger.dump({foo: "bar"}));
```

### Dumping objects

If you need to dump an object, you can use the convienence function, `logger.dump`. This is just a wrapper for node's
`util.inspect`.

## Configuration

You can configure individual loggers:

```javascript
var logger = new Logger('root',
{
    'level': 'INFO',
    'format': '\033[90m{datetime}\033[m \033[1;30m[\033[{levelColor}m{level}\033[1;30m]\033[0;1m {logger}:\033[m {message}'
});

```

## Exported Methods ##

### `loggerFor(object)`
Get a logger for the object passed in. Typically, this should be the `module` object.

### `getLogger(name)`
Retrieve (or create, if needed) the logger with the given name.

### `log(level, message)`
A convenience logging method, for when you don't want to have to call `getLogger()` first. Instead of using this, you probably want to use `logging.loggerForModule()` and log using the returned `Logger` instance.


## Exported Properties ##

### `levels`
The list of logging levels, in order from lowest to highest severity. Defaults to: `['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']`

### `levelColors`
An object associating logging levels with [ANSI terminal colors](http://en.wikipedia.org/wiki/ANSI_escape_code#Colors). Defaults to: `{'TRACE': '1;30', 'DEBUG': '37', 'INFO': '32', 'WARN': '33', 'ERROR': '31', 'CRITICAL': '1;31'}`

### `root`
The root logger. Generally speaking, you should NOT use this.


## Logger ##

### Methods ###

#### `logger.trace(message, ...)`, `logger.debug(message, ...)`, `logger.info(message, ...)`, `logger.warn(message, ...)`, `logger.error(message, ...)`, `logger.critical(message, ...)`, ...
The log methods. These are automatically created for all built-in log levels, and are shorthand for:

```javascript
logger.log(level, message, ...);
```

...where `level` is the level corresponding to the log method name.

#### `logger.log(message, ...)`
The main implementation method of logging. If any arguments are passed after the message, they are provided to `util.format(message)` as additional arguments.


### Properties ###

Logger properties are inherited from parent loggers if not specified on a given logger; if none in the hierarchy set a given property, it is retrieved from the `root` logger.

#### `logger.level`
The minimum log level for which messages will be logged from this logger.

#### `logger.format`
The log message format which will be used when writing messages to the console for this logger.

## Current Status

Currently, it's just a compitent console logger. The plan is to split that out and support file logging as well
(with archive and rotation support). Then this should get better documented.