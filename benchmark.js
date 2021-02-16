const Suite = require('benchmark').Suite;
const FastLRUCache = require('./dist/index.js');
const LRUCache = require('lru-cache');

let fastLRUCache = new FastLRUCache(1000);
let lruCache = new LRUCache(1000);
let fastLRUCacheCounter = 0;
let lruCacheCounter = 0;

new Suite('set')
    .add('lru-cahce.set()', () => lruCache.set(lruCacheCounter++, 'value'))
    .add('fast-lru-cahce.set()', () => fastLRUCache.set(fastLRUCacheCounter++, 'value'))
    .on('cycle', event => console.log(String(event.target)))
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n');
        fastLRUCache.clear();
        lruCache.reset();
    })
    .run();


fastLRUCache = new FastLRUCache(500);
lruCache = new LRUCache(500);
fastLRUCacheCounter = 0;
lruCacheCounter = 0;

while (fastLRUCacheCounter < 500) {
    fastLRUCache.set(fastLRUCacheCounter++, 'data');
    lruCache.set(lruCacheCounter++, 'data');
}

new Suite('get')
    .add('lru-cahce.get()', () => lruCache.get(lruCacheCounter++ % 550))
    .add('fast-lru-cahce.get()', () => fastLRUCache.get(fastLRUCacheCounter++ % 550))
    .on('cycle', event => console.log(String(event.target)))
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n');
        fastLRUCache.clear();
        lruCache.reset();
    })
    .run();
