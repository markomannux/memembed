const fs = require('fs');
const memstore = require('./memstore');
const rimraf = require('rimraf');

afterAll((done) => {
    ensureStoredataDirIsEmpty(done)
})

function ensureStoredataDirIsEmpty(done) {
    rimraf('storedata', done);
}

function randomizeKey(key) {
    return `${key}-${Math.floor(Math.random() * 10000)}`
}

test('I can insert a new key in the store', async () => {
    const data = await memstore.set(randomizeKey('test-key'), 'test-value')
    expect(data).toBe('test-value');
})

test('I can get a key present in the store', async () => {
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value');
    const data = await memstore.get(key);
    expect(data).toBe('test-value');
})

test('Non existant keys return undefined', async () => {
    const data = await memstore.get('non-existant-key');
    expect(data).toBeUndefined();
})

test('I can add an object', async () => {
    const testObject = {
        a: "I'm an object"
    }
    const key = randomizeKey('test-key');
    await memstore.set(key, testObject);
    const data = await memstore.get(key);
    expect(data).toEqual(testObject);
})

test('I can specify a TTL for the key', async () => {
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value', 2000);
    const data = await memstore.ttl(key);
    expect(data).toBeLessThan(2000);
})

test('When no TTL is defined, ttl returns -1', async () => {
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value');
    const data = await memstore.ttl(key);
    expect(data).toBe(-1);
})

test('After ttl key is removed from store', async () => {
    const key = randomizeKey('test-key');
    jest.useFakeTimers();
    await memstore.set(key, 'test-value', 2000);
    jest.runAllTimers();
    const data = await memstore.get(key);
    expect(data).toBeUndefined();
})

test('I can modify the value of an existing key', async () => {
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value');
    await memstore.set(key, 'test-value2');
    const data = await memstore.get(key)
    expect(data).toBe('test-value2');
})

test('Updated key should invalidate previous ttl', async () => {
    const key = randomizeKey('test-key');
    jest.useFakeTimers();
    await memstore.set(key, 'test-value', 2000);
    await memstore.set(key, 'test-value2');
    jest.runAllTimers();
    const data = await memstore.get(key)
    expect(data).toBe('test-value2');
})

test('Entry data is stored to disk', async () => {
    const key = randomizeKey('test-string');
    await memstore.set(key, 'test-value');
    fs.readFile(`storedata/${key}`, 'utf8', (err, data) => {
    if (err) throw err;
        expect(data).toBe(JSON.stringify('test-value'));
    });
})

test('Object data is serialized to JSON on disk', async () => {
    const testObject = {
        a: "I'm an object"
    }
    const key = randomizeKey('test-object');
    await memstore.set(key, testObject);
    fs.readFile(`storedata/${key}`, 'utf8', (err, data) => {
    if (err) throw err;
        expect(data).toBe(JSON.stringify(testObject));
    });
})

test('On ttl expired data is removed from disk', async () => {
    jest.useFakeTimers();
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value', 2000);
    jest.runAllTimers();
    setTimeout(() => {
        expect(fs.existsSync(`storedata/${key}`)).toBe(false);
    }, 100);
})

test('I can delete a key', async () => {
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value');
    await memstore.del(key)
    const data = await memstore.get(key);
    setTimeout(() => { //give time to settle
        expect(data).toBeUndefined();
    }, 100);
})

test('Deleted key is removed from disk', async () => {
    const key = randomizeKey('test-key');
    await memstore.set(key, 'test-value');
    await memstore.del(key)
    setTimeout(() => {
        expect(fs.existsSync('storedata/test-key')).toBe(false);
    }, 100);
})

test('I can clear all the cache', async () => {
    const testObject = {
        a: "I'm an object"
    }
    const objectKey = randomizeKey('test-object');
    const testKey = randomizeKey('test-key');
    await memstore.set(objectKey, testObject);
    await memstore.set(testKey, 'test-key');
    await memstore.clear();
    let data = await memstore.get(objectKey);
    expect(data).toBeUndefined();
    data = await memstore.get(testKey);
    expect(data).toBeUndefined();
})