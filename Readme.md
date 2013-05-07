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

## Current Status

Currently, it's just a compitent console logger. The plan is to split that out and support file logging as well
(with archive and rotation support). Then this should get better documented.