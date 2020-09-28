const fs = require('fs');
class StorePersistence {
    constructor(memembed) {
        this.memembed = memembed;

        if (!fs.existsSync(memembed.storedataPath)) {
            fs.mkdirSync(memembed.storedataPath, {});
        }

        memembed.on('key:set', (key, value) => {
            fs.writeFile(`${memembed.storedataPath}/${key}`, JSON.stringify(value), (err, data) => { })
        })

        memembed.on('key:del', (key) => {
            this.unlink(key);
        })

        memembed.on('key:expired', (key) => {
            this.unlink(key);
        })
    }
    
    unlink(key) {
        fs.unlink(`${this.memembed.storedataPath}/${key}`, (err) => {
            if (err) {
                throw err;
            }
        })
    }
}

module.exports = StorePersistence;