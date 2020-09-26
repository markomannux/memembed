
const fs = require('fs');
const store = { }
const storedataPath = process.env.STOREDATA || 'storedata';

if(!fs.existsSync(storedataPath)) {
    fs.mkdirSync(storedataPath, {});
}

function handleTtlExpired(entry) {
    return function() {
        delete store[entry.key];
        fs.unlink(`${storedataPath}/${entry.key}`, (err) => {
            if (err) {
                throw err;
            }
        })
    }
}

function StoreEntry(key, value, ttl) {
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
        this.timer = setTimeout(handleTtlExpired(this), ttl)
        this.ttl = () => {
            return this.initialTtl - (performance.now() - this.start);
        }
    } else {
        this.ttl = () => -1;
    }
};

function set(key, value, ttl) {
    if (store[key]) {
        store[key].invalidateTtl();
    }
    store[key] = new StoreEntry(key, value, ttl);
    const entryValue = store[key].getValue();
    return new Promise((resolve, reject) => {
        fs.writeFile(`${storedataPath}/${key}`, store[key]._value,  (err, data) => {
            resolve(entryValue);
        })
    });
}

function get(key) {
    const data = store[key];
    return new Promise((resolve, reject) => {
        resolve(data && data.getValue());
    });
}

function ttl(key) {
    const left = store[key].ttl();
    return new Promise((resolve, reject) => {
        resolve(left);
    });
}

function del(key) {
    return new Promise((resolve, reject) => {
        if (store[key]) {
            store[key].invalidateTtl();
            fs.unlink(`${storedataPath}/${key}`, (err) => {
                if (err) {
                    throw err;
                }
                delete store[key];
                resolve();
            })
        }
    })
}

function clear() {
    const promises = [];
    for(const key in store) {
        promises.push(del(key));
    }

    return Promise.all(promises);
}

module.exports = {
    set,
    get,
    del,
    clear,
    ttl
}
