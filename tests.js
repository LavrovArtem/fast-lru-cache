const { strict } = require('assert');
const assert = require('assert');
const Cache = require('./dist');

const storedNow = Date.now;
const storedSetInterval = setInterval;
const storedClearInterval = clearInterval;

beforeEach(() => {
    let dateNow = 0;

    Date.now = () => {
        dateNow += 100;

        return dateNow;
    };

    setInterval = () => {
        assert.fail('Unexpected an setInterval call!');
    };

    clearInterval = () => {
        assert.fail('Unexpected an clearInterval call!');
    };
});

afterEach(() => {
    Date.now = storedNow;
    setInterval = storedSetInterval;
    clearInterval = storedClearInterval;
});

const equalTimelineFrames = (actual, expected) => {
    assert.strictEqual(actual.key, expected.key);
    assert.strictEqual(actual.entry, expected.entry);
    assert.strictEqual(actual.next, expected.next);
    assert.strictEqual(actual.previous, expected.previous);
    assert.strictEqual(actual.lastGet, expected.lastGet);
};

describe('constructor', () => {
    it('should throw the error when the max attribute is incorrect', () => {
        assert.throws(() => new Cache(1), { name: 'TypeError', message: 'The max(1) attribute is wrong!' });
        assert.throws(() => new Cache(5.3), { name: 'TypeError', message: 'The max(5.3) attribute is wrong!' });
        assert.throws(() => new Cache(NaN), { name: 'TypeError', message: 'The max(NaN) attribute is wrong!' });
    });

    it('should throw the error when the unusedTimeout attribute is incorrect', () => {
        assert.throws(() => new Cache(3, -3), { name: 'TypeError', message: 'The unusedTimeout(-3) attribute is wrong!' });
        assert.throws(() => new Cache(7, NaN), { name: 'TypeError', message: 'The unusedTimeout(NaN) attribute is wrong!' });
        assert.throws(() => new Cache(4, Infinity), { name: 'TypeError', message: 'The unusedTimeout(Infinity) attribute is wrong!' });
    });

    it('should throw the error when the checkoutInterval attribute is incorrect', () => {
        assert.throws(() => new Cache(8, 100, 0), { name: 'TypeError', message: 'The checkoutInterval(0) attribute is wrong!' });
        assert.throws(() => new Cache(5, 150, NaN), { name: 'TypeError', message: 'The checkoutInterval(NaN) attribute is wrong!' });
        assert.throws(() => new Cache(7, 128, Infinity), { name: 'TypeError', message: 'The checkoutInterval(Infinity) attribute is wrong!' });
    });
        
    it('should create an instance with only the max argument correctly', () => {
        const cache = new Cache(2);

        assert.strictEqual(cache.max, 2);
        assert.strictEqual(cache.unusedTimeout, void 0);
        assert.strictEqual(cache.checkoutInterval, void 0);
        assert.strictEqual(cache.isAutoClear, false);
    });
        
    it('should create an instance without the checkoutInterval argument correctly', () => {
        const autoClearedCacheWithDefaultChackoutDelay = new Cache(20, 200);

        assert.strictEqual(autoClearedCacheWithDefaultChackoutDelay.max, 20);
        assert.strictEqual(autoClearedCacheWithDefaultChackoutDelay.unusedTimeout, 200);
        assert.strictEqual(autoClearedCacheWithDefaultChackoutDelay.checkoutInterval, 200);
        assert.strictEqual(autoClearedCacheWithDefaultChackoutDelay.isAutoClear, true);
    });
        
    it('should create an instance with the full arguments set correctly', () => {
        const autoClearedCache = new Cache(25, 250, 100);

        assert.strictEqual(autoClearedCache.max, 25);
        assert.strictEqual(autoClearedCache.unusedTimeout, 250);
        assert.strictEqual(autoClearedCache.checkoutInterval, 100);
        assert.strictEqual(autoClearedCache.isAutoClear, true);
    });
});

describe('set', () => {
    it('should set the first element', () => {
        const cache = new Cache(6);

        assert.strictEqual(cache.cacheMap.size, 0);
        assert.strictEqual(cache.firstFrame, null);
        assert.strictEqual(cache.lastFrame, null);

        cache.set(1, 'A');
    
        assert.strictEqual(cache.cacheMap.size, 1);
        assert.strictEqual(cache.firstFrame, cache.cacheMap.get(1));
        assert.strictEqual(cache.lastFrame, cache.firstFrame);
        equalTimelineFrames(cache.firstFrame, {
            key: 1,
            entry: 'A',
            next: null,
            previous: null,
            lastGet: -1
        });
    });

    it('should set the elements', () => {
        const cache = new Cache(3);

        cache.set('1', 'X');
        cache.set('2', 'Y');
    
        assert.strictEqual(cache.cacheMap.size, 2);
        assert.strictEqual(cache.firstFrame, cache.cacheMap.get('2'));
        assert.strictEqual(cache.lastFrame, cache.cacheMap.get('1'));
        equalTimelineFrames(cache.firstFrame, {
            key: '2',
            entry: 'Y',
            next: cache.lastFrame,
            previous: null,
            lastGet: -1
        });
        equalTimelineFrames(cache.lastFrame, {
            key: '1',
            entry: 'X',
            next: null,
            previous: cache.firstFrame,
            lastGet: -1
        });
    });

    it('should supplant first added element', () => {
        const cache = new Cache(2, 500);

        setInterval = () => 0;

        cache.set(1, 'I');
        cache.set(2, 'J');

        const deletedFrame = cache.lastFrame;
    
        cache.set(3, 'K');
    
        assert.strictEqual(cache.cacheMap.size, 2);
        assert.strictEqual(cache.firstFrame, cache.cacheMap.get(3));
        assert.strictEqual(cache.lastFrame, cache.cacheMap.get(2));
        equalTimelineFrames(cache.firstFrame, {
            key: 3,
            entry: 'K',
            next: cache.lastFrame,
            previous: null,
            lastGet: 300
        });
        equalTimelineFrames(cache.lastFrame, {
            key: 2,
            entry: 'J',
            next: null,
            previous: cache.firstFrame,
            lastGet: 200
        });
        equalTimelineFrames(deletedFrame, {
            key: 1,
            entry: 'I',
            next: null,
            previous: null,
            lastGet: 100
        });
    });

    it('should throw the error when set the duplicate key', () => {
        const cache = new Cache(32);

        cache.set('duplicate', 'no');

        assert.throws(() => cache.set('duplicate', 'yes'), {
            name: 'Error',
            message: 'The provided key("duplicate") has already existed!'
        });
    });

    it('should run the clear timer', () => {
        const cache = new Cache(10, 777);
        let isSetIntervalCalled = false;
        let isUnrefCalled = false;

        setInterval = (_, delay) => {
            assert.strictEqual(delay, 777);
            isSetIntervalCalled = true;

            return {
                unref () {
                    isUnrefCalled = true;
                }
            };
        };

        cache.set(111, { a: 3 });

        assert.ok(isSetIntervalCalled);
        assert.ok(isUnrefCalled);

        setInterval = () => assert.fail();
        
        cache.set(222, { a: 6 });
    });
});

describe('get', () => {
    it('should return null if element doesn`t exist', () => {
        const cache = new Cache(2);

        assert.strictEqual(cache.get(1), null);
    });

    it('should get first element', () => {
        const cache = new Cache(3, 500);

        setInterval = () => 0;

        cache.set('a', 9);
        cache.set('b', 8);

        assert.strictEqual(cache.firstFrame, cache.cacheMap.get('b'));
        assert.strictEqual(cache.lastFrame, cache.cacheMap.get('a'));
        assert.strictEqual(cache.get('b'), 8);
        equalTimelineFrames(cache.cacheMap.get('a'), {
            key: 'a',
            entry: 9,
            next: null,
            previous: cache.cacheMap.get('b'),
            lastGet: 100
        });
        equalTimelineFrames(cache.cacheMap.get('b'), {
            key: 'b',
            entry: 8,
            next: cache.cacheMap.get('a'),
            previous: null,
            lastGet: 300
        });
    });

    it('should get last element', () => {
        const cache = new Cache(3);

        cache.set('a1b2c3', 'test');
        cache.set('d1e2f3', 'tset');

        assert.strictEqual(cache.get('a1b2c3'), 'test');
        assert.strictEqual(cache.firstFrame, cache.cacheMap.get('a1b2c3'));
        assert.strictEqual(cache.lastFrame, cache.cacheMap.get('d1e2f3'));
        equalTimelineFrames(cache.cacheMap.get('a1b2c3'), {
            key: 'a1b2c3',
            entry: 'test',
            next: cache.cacheMap.get('d1e2f3'),
            previous: null,
            lastGet: -1
        });
        equalTimelineFrames(cache.cacheMap.get('d1e2f3'), {
            key: 'd1e2f3',
            entry: 'tset',
            next: null,
            previous: cache.cacheMap.get('a1b2c3'),
            lastGet: -1
        });
    });

    it('should get middle element', () => {
        const cache = new Cache(3, 1000);

        setInterval = () => 0;

        cache.set(123, 1);
        cache.set(456, 2);
        cache.set(789, 3);

        assert.strictEqual(cache.get(456), 2);
        assert.strictEqual(cache.firstFrame, cache.cacheMap.get(456));
        assert.strictEqual(cache.lastFrame, cache.cacheMap.get(123));
        equalTimelineFrames(cache.cacheMap.get(456), {
            key: 456,
            entry: 2,
            next: cache.cacheMap.get(789),
            previous: null,
            lastGet: 400
        });
        equalTimelineFrames(cache.cacheMap.get(789), {
            key: 789,
            entry: 3,
            next: cache.cacheMap.get(123),
            previous: cache.cacheMap.get(456),
            lastGet: 300
        });
        equalTimelineFrames(cache.cacheMap.get(123), {
            key: 123,
            entry: 1,
            next: null,
            previous: cache.cacheMap.get(789),
            lastGet: 100
        });
    });
});

describe('delete', () => {
    it('should delete single element', () => {
        const cache = new Cache(3, 1000);

        setInterval = () => 7;

        cache.set('foo', 'bar');

        const frame = cache.cacheMap.get('foo');
        let isClearIntervalCalled = false;

        clearInterval = (id) => {
            assert.strictEqual(id, 7);
            isClearIntervalCalled = true;
        };

        cache.delete('foo');

        assert.strictEqual(cache.cacheMap.size, 0);
        assert.ok(isClearIntervalCalled);
        assert.strictEqual(cache.firstFrame, null);
        assert.strictEqual(cache.lastFrame, null);
        equalTimelineFrames(frame, {
            key: 'foo',
            entry: 'bar',
            next: null,
            previous: null,
            lastGet: 100
        });
    });

    it('should not call clearTimeout', () => {
        const cache = new Cache(2);

        cache.set('single', 'element');
        cache.delete('single');

        assert.strictEqual(cache.cacheMap.size, 0);
        assert.strictEqual(cache.firstFrame, null);
        assert.strictEqual(cache.lastFrame, null);
    });

    it('should delete first element', () => {
        const cache = new Cache(6, 555);

        setInterval = () => 0;

        cache.set('last', 'el1');
        cache.set('first', 'el2');

        const frame = cache.cacheMap.get('first');

        cache.delete('first');

        assert.strictEqual(cache.cacheMap.size, 1);
        assert.strictEqual(cache.firstFrame, cache.lastFrame);
        equalTimelineFrames(cache.firstFrame, {
            key: 'last',
            entry: 'el1',
            next: null,
            previous: null,
            lastGet: 100
        });
        equalTimelineFrames(frame, {
            key: 'first',
            entry: 'el2',
            next: null,
            previous: null,
            lastGet: 200
        });
    });

    it('should delete last element', () => {
        const cache = new Cache(2);

        cache.set('last', 'foo');
        cache.set('first', 'bar');

        const frame = cache.cacheMap.get('last');

        cache.delete('last');

        assert.strictEqual(cache.cacheMap.size, 1);
        assert.strictEqual(cache.firstFrame, cache.lastFrame);
        equalTimelineFrames(cache.firstFrame, {
            key: 'first',
            entry: 'bar',
            next: null,
            previous: null,
            lastGet: -1
        });
        equalTimelineFrames(frame, {
            key: 'last',
            entry: 'foo',
            next: null,
            previous: null,
            lastGet: -1
        });
    });

    it('should delete middle element', () => {
        const cache = new Cache(5);

        cache.set(0, 25);
        cache.set(1, 125);
        cache.set(2, 625);

        const frame = cache.cacheMap.get(1);

        cache.delete(1);

        assert.strictEqual(cache.cacheMap.size, 2);
        assert.strictEqual(cache.firstFrame, cache.cacheMap.get(2));
        assert.strictEqual(cache.lastFrame, cache.cacheMap.get(0));
        equalTimelineFrames(cache.cacheMap.get(2), {
            key: 2,
            entry: 625,
            next: cache.cacheMap.get(0),
            previous: null,
            lastGet: -1
        });
        equalTimelineFrames(cache.cacheMap.get(0), {
            key: 0,
            entry: 25,
            next: null,
            previous: cache.cacheMap.get(2),
            lastGet: -1
        });
        equalTimelineFrames(frame, {
            key: 1,
            entry: 125,
            next: null,
            previous: null,
            lastGet: -1
        });
    });
});

describe('clear', () => {
    it('should clear empty cache', () => {
        const cache = new Cache(5);

        cache.clear();

        assert.strictEqual(cache.cacheMap.size, 0);
        assert.strictEqual(cache.firstFrame, null);
        assert.strictEqual(cache.lastFrame, null);
    });

    it('should clear cache', () => {
        const cache = new Cache(4, 123);
        let isClearIntervalCalled = false;

        setInterval = () => 9;
        clearInterval = (id) => {
            assert.strictEqual(id, 9);
            isClearIntervalCalled = true;
        };

        cache.set('a', 'test1');
        cache.set('b', 'test2');
        cache.set('c', 'test3');

        const aFrame = cache.cacheMap.get('a');
        const bFrame = cache.cacheMap.get('b');
        const cFrame = cache.cacheMap.get('c');

        cache.clear();

        assert.ok(isClearIntervalCalled);
        assert.strictEqual(cache.cacheMap.size, 0);
        assert.strictEqual(cache.firstFrame, null);
        assert.strictEqual(cache.lastFrame, null);
        equalTimelineFrames(aFrame, {
            key: 'a',
            entry: 'test1',
            next: null,
            previous: null,
            lastGet: 100
        });
        equalTimelineFrames(bFrame, {
            key: 'b',
            entry: 'test2',
            next: null,
            previous: null,
            lastGet: 200
        });
        equalTimelineFrames(cFrame, {
            key: 'c',
            entry: 'test3',
            next: null,
            previous: null,
            lastGet: 300
        });
    });

    it('should not call clearInterval', () => {
        const cache = new Cache(5);

        setInterval = () => 0;
        
        cache.set(55, '55');
        cache.set(77, '77');

        cache.clear();
    });
});

describe('auto clear', () => {
    it('should clear unused cache elements', () => {
        const cache = new Cache(5, 200, 135);
        let unrefIsCalled = false;
        let intervalFn = null;

        setInterval = (fn, interval) => {
            intervalFn = fn;

            assert.strictEqual(interval, 135);

            return {
                id: 123,
                unref() {
                    unrefIsCalled = true;
                }
            };
        };

        cache.set(1, 'test1');
        cache.set(2, 'test2');
        cache.set(3, 'test3');
        cache.set(4, 'test4');

        const frame1 = cache.cacheMap.get(1);
        const frame2 = cache.cacheMap.get(2);

        intervalFn();

        assert.ok(unrefIsCalled);
        assert.strictEqual(cache.cacheMap.size, 2);
        equalTimelineFrames(cache.firstFrame, {
            key: 4,
            entry: 'test4',
            next: cache.cacheMap.get(3),
            previous: null,
            lastGet: 400
        });
        equalTimelineFrames(cache.lastFrame, {
            key: 3,
            entry: 'test3',
            next: null,
            previous: cache.cacheMap.get(4),
            lastGet: 300
        });
        equalTimelineFrames(frame1, {
            key: 1,
            entry: 'test1',
            next: null,
            previous: null,
            lastGet: 100
        });
        equalTimelineFrames(frame2, {
            key: 2,
            entry: 'test2',
            next: null,
            previous: null,
            lastGet: 200
        });
    });

    it('should clear all cache', () => {
        const cache = new Cache(10, 200, 256);
        let intervalFn = null;
        let isClearIntervalCalled = false;

        setInterval = (fn, interval) => {
            intervalFn = fn;

            assert.strictEqual(interval, 256);

            return 0;
        };

        cache.set('A', 'data');
        cache.set('B', 'test');

        const frameA = cache.cacheMap.get('A');
        const frameB = cache.cacheMap.get('B');

        clearInterval = interval => {
            isClearIntervalCalled = true;
        };
        Date.now();
        Date.now();
        intervalFn();

        assert.ok(isClearIntervalCalled);
        assert.strictEqual(cache.cacheMap.size, 0);
        assert.strictEqual(cache.firstFrame, null);
        assert.strictEqual(cache.lastFrame, null);
        
        equalTimelineFrames(frameA, {
            key: 'A',
            entry: 'data',
            next: null,
            previous: null,
            lastGet: 100
        });
        equalTimelineFrames(frameB, {
            key: 'B',
            entry: 'test',
            next: null,
            previous: null,
            lastGet: 200
        });
    });
});
