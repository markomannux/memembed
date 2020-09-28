const EventEmitter = require("events");
const StorePersistence = require('./persistence');

class Store extends EventEmitter {
    constructor(enablePersistence, storedataPath) {
        super();
        this.store = {}

        this.storedataPath = storedataPath || 'storedata';

        if (enablePersistence) {
            this.storePersistence = new StorePersistence(this);
        }
    }

    set(key, value, ttl) {
        if (this.store[key]) {
            this.store[key].invalidateTtl();
        }
        this.store[key] = new StoreEntry(key, value, ttl, this);
        const entryValue = this.store[key].getValue();
        return new Promise((resolve, reject) => {
            this.emit('key:set', key, value);
            resolve(entryValue);
        });
    }

    get(key) {
        const data = this.store[key];
        return new Promise((resolve, reject) => {
            resolve(data && data.getValue());
        });
    }

    memoize(key, objectCreationFunction, ttl) {
        return this.get(key)
        .then(data => {
            if(data) {
                return data;
            }

            this.set(key, objectCreationFunction(), ttl);
            return this.get(key);
        })

    }

    ttl(key) {
        const left = this.store[key].ttl();
        return new Promise((resolve, reject) => {
            resolve(left);
        });
    }

    del(key) {
        return new Promise((resolve, reject) => {
            if (this.store[key]) {
                this.store[key].invalidateTtl();
                delete this.store[key];
                this.emit('key:del', key);
                resolve();
            }
        })
    }

    clear() {
        const promises = [];
        for (const key in this.store) {
            promises.push(this.del(key));
        }

        return Promise.all(promises);
    }

    handleTtlExpired(entry) {
        const _store = this.store;
        return () => {
            delete _store[entry.key];
            this.emit('key:expired', entry.key);
        }
    }
}

function StoreEntry(key, value, ttl, store) {
    this.key = key;
    this._value = JSON.stringify(value);
    this.getValue = () => JSON.parse(this._value);

    this.invalidateTtl = () => {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    if (ttl) {
        this.initialTtl = ttl;
        this.start = performance.now();
        this.timer = setTimeout(store.handleTtlExpired(this), ttl)
        this.ttl = () => {
            return this.initialTtl - (performance.now() - this.start);
        }
    } else {
        this.ttl = () => -1;
    }
};


module.exports = Store;
