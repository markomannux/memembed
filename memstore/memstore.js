const fs = require('fs');
const EventEmitter = require("events");

const storedataPath = process.env.STOREDATA || 'storedata';

if (!fs.existsSync(storedataPath)) {
    fs.mkdirSync(storedataPath, {});
}

class Store extends EventEmitter {
    constructor() {
        super();
        this.store = {}
    }
    set = function (key, value, ttl) {
        if (this.store[key]) {
            this.store[key].invalidateTtl();
        }
        this.store[key] = new StoreEntry(key, value, ttl, this);
        const entryValue = this.store[key].getValue();
        return new Promise((resolve, reject) => {
            this.emit('key:set', key);
            resolve(entryValue);
        });
    }

    get = function (key) {
        const data = this.store[key];
        return new Promise((resolve, reject) => {
            resolve(data && data.getValue());
        });
    }

    ttl = function (key) {
        const left = this.store[key].ttl();
        return new Promise((resolve, reject) => {
            resolve(left);
        });
    }

    del = function (key) {
        return new Promise((resolve, reject) => {
            if (this.store[key]) {
                this.store[key].invalidateTtl();
                delete this.store[key];
                this.emit('key:del', key);
                resolve();
            }
        })
    }

    clear = function () {
        const promises = [];
        for (const key in this.store) {
            promises.push(this.del(key));
        }

        return Promise.all(promises);
    }

    handleTtlExpired = (entry) => {
        return () => {
            delete this.store[entry.key];
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

const storeInstance = new Store();

storeInstance.on('key:set', (key) => {
    fs.writeFile(`${storedataPath}/${key}`, storeInstance.store[key]._value, (err, data) => { })
})

function unlink(key) {
    fs.unlink(`${storedataPath}/${key}`, (err) => {
        if (err) {
            throw err;
        }
    })
}

storeInstance.on('key:del', (key) => {
    unlink(key);
})

storeInstance.on('key:expired', (key) => {
    unlink(key);
})

module.exports = storeInstance;
