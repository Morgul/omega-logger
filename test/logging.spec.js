/* global describe: true, it: true, expect: true */

var logging = require('../logging.js');


describe('logging', function()
{
    describe('.getLogger()', function()
    {
        it('should return the same Logger instance if called multiple times with the same name', function()
        {
            var logger = logging.getLogger('test1');

            expect(logger).to.equal(logging.getLogger('test1'));
        });
    });
});
