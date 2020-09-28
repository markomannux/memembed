const fs = require('fs');
const Store = require('../index');
const rimraf = require('rimraf');

const DEFAULT_STOREDATA_DIR = 'storedata';


function ensureStoredataDirIsEmpty(done) {
    rimraf(DEFAULT_STOREDATA_DIR, done);
}

function randomizeKey(key) {
    return `${key}-${Math.floor(Math.random() * 10000)}`
}

describe('Store entry handling', () => {

    const enablePersistence = false;
    const memembed = new Store(enablePersistence);

    test('I can insert a new key in the store', async () => {
        const data = await memembed.set(randomizeKey('test-key'), 'test-value')
        expect(data).toBe('test-value');
    })

    test('I can get a key present in the store', async () => {
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value');
        const data = await memembed.get(key);
        expect(data).toBe('test-value');
    })

    test('Non existant keys return undefined', async () => {
        const data = await memembed.get('non-existant-key');
        expect(data).toBeUndefined();
    })

    test('I can add an object', async () => {
        const testObject = {
            a: "I'm an object"
        }
        const key = randomizeKey('test-key');
        await memembed.set(key, testObject);
        const data = await memembed.get(key);
        expect(data).toEqual(testObject);
    })

    test('I can specify a TTL for the key', async () => {
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value', 2000);
        const data = await memembed.ttl(key);
        expect(data).toBeLessThan(2000);
    })

    test('When no TTL is defined, ttl returns -1', async () => {
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value');
        const data = await memembed.ttl(key);
        expect(data).toBe(-1);
    })

    test('After ttl key is removed from store', async () => {
        const key = randomizeKey('test-key');
        jest.useFakeTimers();
        await memembed.set(key, 'test-value', 2000);
        jest.runAllTimers();
        const data = await memembed.get(key);
        expect(data).toBeUndefined();
    })

    test('I can modify the value of an existing key', async () => {
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value');
        await memembed.set(key, 'test-value2');
        const data = await memembed.get(key)
        expect(data).toBe('test-value2');
    })

    test('Updated key should invalidate previous ttl', async () => {
        const key = randomizeKey('test-key');
        jest.useFakeTimers();
        await memembed.set(key, 'test-value', 2000);
        await memembed.set(key, 'test-value2');
        jest.runAllTimers();
        const data = await memembed.get(key)
        expect(data).toBe('test-value2');
    })

    test('I can clear all the cache', async () => {
        const testObject = {
            a: "I'm an object"
        }
        const objectKey = randomizeKey('test-object');
        const testKey = randomizeKey('test-key');
        await memembed.set(objectKey, testObject);
        await memembed.set(testKey, 'test-key');
        await memembed.clear();
        let data = await memembed.get(objectKey);
        expect(data).toBeUndefined();
        data = await memembed.get(testKey);
        expect(data).toBeUndefined();
    })

})

describe('Memoization', () => {

    const enablePersistence = false;
    const memembed = new Store(enablePersistence);

    test('Momoized object if first created in callback code', async () => {
        const key = randomizeKey('test-key');

        const objectToMemoize = {
                'some-key': 'some-value'
            }
        const objectCreationCallback = jest.fn(() => objectToMemoize);
        const data = await memembed.memoize(key, objectCreationCallback);
        expect(objectCreationCallback).toBeCalled();
        expect(data).toEqual(objectToMemoize);
    })

    test('Already momoized object are retrieved from cache', async () => {
        const key = randomizeKey('test-key');

        const objectToMemoize = {
                'some-key': 'some-value'
            }
        const objectCreationCallback = jest.fn(() => objectToMemoize);
        await memembed.memoize(key, objectCreationCallback);
        const data = await memembed.memoize(key, objectCreationCallback);
        expect(objectCreationCallback).toBeCalledTimes(1);
        expect(data).toEqual(objectToMemoize);
    })

    test('I can set TTL for memoized objects', async () => {
        jest.useFakeTimers();
        const key = randomizeKey('test-key');

        const objectToMemoize = {
                'some-key': 'some-value'
            }
        const objectCreationCallback = jest.fn(() => objectToMemoize);
        await memembed.memoize(key, objectCreationCallback, 2000);
        jest.runAllTimers();
        const data = await memembed.get(key);
        expect(data).toBeUndefined();
    })

})

describe("Store persistence on disk", () => {

    const enablePersistence = true;
    const memembed = new Store(enablePersistence);

    afterAll((done) => {
        ensureStoredataDirIsEmpty(done)
    })

    test('Entry data is stored to disk', async () => {
        const key = randomizeKey('test-string');
        await memembed.set(key, 'test-value');
        fs.readFile(`${DEFAULT_STOREDATA_DIR}/${key}`, 'utf8', (err, data) => {
            if (err) throw err;
            expect(data).toBe(JSON.stringify('test-value'));
        });
    })

    test('Object data is serialized to JSON on disk', async () => {
        const testObject = {
            a: "I'm an object"
        }
        const key = randomizeKey('test-object');
        await memembed.set(key, testObject);
        fs.readFile(`${DEFAULT_STOREDATA_DIR}/${key}`, 'utf8', (err, data) => {
            if (err) throw err;
            expect(data).toBe(JSON.stringify(testObject));
        });
    })

    test('On ttl expired data is removed from disk', async () => {
        jest.useFakeTimers();
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value', 2000);
        jest.runAllTimers();
        setTimeout(() => {
            expect(fs.existsSync(`${DEFAULT_STOREDATA_DIR}/${key}`)).toBe(false);
        }, 100);
    })

    test('I can delete a key', async () => {
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value');
        await memembed.del(key)
        const data = await memembed.get(key);
        setTimeout(() => { //give time to settle
            expect(data).toBeUndefined();
        }, 100);
    })

    test('Deleted key is removed from disk', async () => {
        const key = randomizeKey('test-key');
        await memembed.set(key, 'test-value');
        await memembed.del(key)
        setTimeout(() => {
            expect(fs.existsSync(`${DEFAULT_STOREDATA_DIR}/${key}`)).toBe(false);
        }, 100);
    })

})

describe("Event emission", () => {
    const enablePersistence = false;
    const memembed = new Store(enablePersistence);

    test('When key is set, key:set is emitted', async () => {
        const callback = jest.fn();
        memembed.on('key:set', callback);
        const testKey = randomizeKey('test-key');
        await memembed.set(testKey, 'test-key');
        expect(callback).toHaveBeenCalledWith(testKey, 'test-key');
    })

    test('When key is delets, key:del is emitted', async () => {
        const callback = jest.fn();
        memembed.on('key:del', callback);
        const testKey = randomizeKey('test-key');
        await memembed.set(testKey, 'test-key');
        await memembed.del(testKey);
        expect(callback).toHaveBeenCalledWith(testKey);
    })

    test('When ttl expired, key:expired is emitted', async () => {
        const callback = jest.fn();
        memembed.on('key:expired', callback);
        jest.useFakeTimers();
        const testKey = randomizeKey('test-key');
        await memembed.set(testKey, 'test-value', 2000);
        jest.runAllTimers();
        expect(callback).toHaveBeenCalledWith(testKey);
    })
})