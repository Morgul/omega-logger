/* global describe: true, it: true, expect: true */

var logging = require('../logging.js');


describe('Logger', function()
{
    describe('#parent', function()
    {
        describe('on the root logger', function()
        {
            it('should be set to an empty object', function()
            {
                var logger = logging.getLogger();

                expect(logger.parent)
                    .to.be.an('object')
                    .that.deep.equals({});
            });
        });

        describe('on any other logger', function()
        {
            it('should be set to this Logger\'s parent', function()
            {
                var logger = logging.getLogger('test1.child');

                expect(logger.parent).to.equal(logging.getLogger('test1'));
            });
        });
    });

    describe('#levelIdx', function()
    {
        it('should be settable', function()
        {
            var logger = logging.getLogger('test1');
            logger.levelIdx = 4;

            expect(logger.levelIdx).to.equal(4);
        });

        it('should be settable through #configure()', function()
        {
            var logger = logging.getLogger('test3');
            logger.configure({ levelIdx: 5 });

            expect(logger.levelIdx).to.equal(5);
        });

        it('should be inherited from the parent Logger if unset on this', function()
        {
            var parentLogger = logging.getLogger('test4');
            parentLogger.levelIdx = 5;

            var logger = parentLogger.child('child');

            expect(parentLogger.levelIdx).to.equal(5);
            expect(logger.levelIdx).to.equal(parentLogger.levelIdx);
        });

        it('should not be inherited from the parent Logger if set on this', function()
        {
            var parentLogger = logging.getLogger('test5');
            parentLogger.levelIdx = 4;

            var logger = parentLogger.child('child');
            logger.levelIdx = 3;

            expect(parentLogger.levelIdx).to.equal(4);
            expect(logger.levelIdx).to.equal(3);
        });

        it('should be inherited from the grandparent Logger if unset on this or parent', function()
        {
            var grandparentLogger = logging.getLogger('test6');
            grandparentLogger.levelIdx = 2;

            var parentLogger = grandparentLogger.child('parent');

            var logger = parentLogger.child('child');

            expect(grandparentLogger.levelIdx).to.equal(2);
            expect(parentLogger.levelIdx).to.equal(grandparentLogger.levelIdx);
            expect(logger.levelIdx).to.equal(grandparentLogger.levelIdx);
        });

        it('should not be inherited from the grandparent Logger if set on this', function()
        {
            var grandparentLogger = logging.getLogger('test7');
            grandparentLogger.levelIdx = 1;

            var parentLogger = grandparentLogger.child('parent');

            var logger = parentLogger.child('child');
            logger.levelIdx = 0;

            expect(grandparentLogger.levelIdx).to.equal(1);
            expect(parentLogger.levelIdx).to.equal(grandparentLogger.levelIdx);
            expect(logger.levelIdx).to.equal(0);
        });
    });
});
