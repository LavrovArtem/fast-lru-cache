# Least recently used cache

The fast and simple LRU cache realization.

* No other dependencies;
* Flyweight (~4.4KB or ~2.4KB if you minify it);
* TypeScript typings;
* Short and simple API.

## Installation:

```
npm install fast-lru-cache --save
```

## API

### LRUCache

`LRUCache<K, T>` is a generic class that has two type parameters:
- `K` - is a type of cache keys. The acceptable values are `string` or `number`;
- `T` - is a type of cache entries. The acceptable value is `any` of the types.

#### constructor

```ts
constructor(max: number, unusedTimeout?: number, checkoutInterval?: number);
```

* `max` - sets the maximum count of the cache entries. It is an integer and should not be less than 2. Also, it should not be equal to `Infinity` because, in that case, it will be a `Map` object with redundant functionality.
* `unusedTimeout`_(optional)_ - sets the maximum time in milliseconds, after which cache entries rates as unused. It should be more than `0` and not equal to `Infinity`. If this argument passed, the cache validity method will be called with the defined interval and cleanse unused cache entries.
* `checkoutInterval`_(optional)_ - sets the checkout interval in milliseconds of the validity of cache entries. It should be more than `0` and not equal to `Infinity`. The default value is equal to `unusedTimeout`.

#### get

```ts
get(key: K): T | null;
```

Gets a cache entry by the specified key. The method returns the `null` if the `key` is absent in a `Cache` object.

#### set

```ts
set(key: K, entry: T): void;
```

Adds a cache entry with a specified key. The method throws the error if a specified key already exists in a `Cache` object.

#### delete

```ts
delete(key: K): boolean;
```

Deletes a cache entry by the specified key and returns `true` if the specified key exists. Or `false` if the entry does not exist.

#### clear

```ts
clear(): void;
```

Clears a `Cache` object.
