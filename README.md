# memembed
A simple embeddable memstore with optional persistence

[![Actions Status](https://github.com/markomannux/memembed/workflows/Build%20and%20Test/badge.svg)](https://github.com/markomannux/memembed/actions)

## Usage
```javascript
const Memembed = require('memembed');

const memembed = new Memembed();

/*
 * Setting a new key in the store
 */
memembed.set('some-key', {foo: 'foo', bar: 'bar'})
.then(data => {
    console.log(`${data} has been set in the store`);
});

/*
 * Retrieving the value
 */
memembed.get('some-key')
.then(data => {
    console.log(data);
});
```

## Options
`Memembed` may be instantiated with the following arguments:

```javascript
const memembed = new Memembed(enablePersistence, storedataPath)
```
Name | Description
-----|-------------
enablePersistence | Enable persistence on disk
storedataPath | Optional path of the directory where data is persisted. It defaults to `storedata`

## API

### set(key, value, [ttl])
Sets a new key in the store with provided value.  
Value will be serialized to JSON.
Optionally sets a TTL for the key, after which the key is deleted. If no TTL is provided, it will be set to -1 (never expires).

### get(key)
Retrieves the value associated to the key in the store.  
The value is JSON parsed before being returned.

### memoize(key, fn)
Retrieves the value associated to the key in the store.  
If the key does not exists, `fn` is executed to determine its value and the result is then stored in memembed.
The value is JSON parsed before being returned.

### del(key)
Deletes the value associated to the key in the store and remove the key.  

### ttl(key)
Returns the TTL left for the key.

### clear()
Removes all keys from the store.

## Events

### key:set
Emitted when a key is set in the store. It will pass the key as first argument to callbacks.

### key:del
Emitted when a key is deleted from the store. It will pass the key as first argument to callbacks.

### key:expired
Emitted when TTL for a key is reached. It will pass the key as first argument to callbacks.