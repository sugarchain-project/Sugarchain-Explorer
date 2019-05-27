const { decimaljs } = require('./../config.js');
const Decimal = require('decimal.js-light');

Decimal.set({
    precision: decimaljs.precision,
    toExpNeg: decimaljs.toExpNeg
});

const blockchain = {
    hashRegExp: /^([A-Fa-f0-9]{64})$/,
    intRegExp: /^([0-9]{1,18})$/,
    addressRegExp: /^([A-Za-z0-9]{34})$/,

    isHash(string) {
        return this.hashRegExp.test(string);
    },

    isInt(string) {
        return this.intRegExp.test(string);
    },

    isAddress(string) {
        return this.addressRegExp.test(string);
    },

    // txs = txs array of a block
    setVoutsSum(txs) {
        for (let tx of txs) {
            let amount_out = Decimal(0);
            let vout_value;

            for (let vout of tx.vout) {
                vout_value = Decimal(vout.value.toFixed(8));
                amount_out = amount_out.plus(vout_value);
            }

            tx.amount_out = amount_out.toString();
        }
    },

    // block = extended block object from rpc
    prepareBlock(block) {
        block._id = block.height;
        block.tx = block.tx.map(tx => tx.txid);
        delete block.confirmations;

        return block;
    },

    // block = extended block object from rpc
    prepareTxs(block) {
        const txs = block.tx;

        txs.map(tx => {
            tx._id = tx.txid;
            tx.blockhash = block.hash;
            tx.blocktime = block.time;
            // tx.blockheight = block.height;
        });

        return txs;
    },

    // array = inputs or recipients, address & value & tx = current
    _findAndSum(array, address, value, tx) {
        let object = array.find(item => item.address === address);

        if (object === undefined) {
            array.push({
                address: address,
                value: value,
                time: tx.blocktime,
                txid: tx.txid
            });
        } else {
            let index = array.indexOf(object);
            const sum = Decimal(object.value).plus(Decimal(value));
            array.fill(object.value = sum.toString(), index, index++);
        }
    },

    // txs = txs collection, tx = tx object
    async getInputs(txs, tx) {
        let inputs = [];

        for (const v of tx.vin) {
            if (v.hasOwnProperty('coinbase')) {
                inputs.push(v);
            } else {
                const vin = await txs.findOne({ txid: v.txid });

                const address = vin.vout[v.vout].scriptPubKey.addresses[0];
                const value = vin.vout[v.vout].value.toString();

                this._findAndSum(inputs, address, value, tx);
            }
        }

        return inputs;
    },

    // tx = tx object
    async getRecipients(tx) {
        let recipients = [];

        for (const vout of tx.vout) {
            if (Array.isArray(vout.scriptPubKey.addresses)) {
                const address = vout.scriptPubKey.addresses[0];
                const value = vout.value.toString();

                this._findAndSum(recipients, address, value, tx);
            }
        }

        return recipients;
    },

    // tx = tx object, addresses & address_txs = collections, session = mongodb session for transactions
    async prepareVouts(tx, addresses, address_txs, session) {
        const recipients = await this.getRecipients(tx);

        const voutOffsets = [];

        for (const recipient of recipients) {
            const address = recipient.address;
            let value = recipient.value;

            let addressTx = await address_txs.findOne({ txid: tx.txid, address, type: 'vout' });
            if (!addressTx) {
                const addressTx = {
                    txid: tx.txid,
                    address,
                    type: 'vout',
                    value: value,
                    time: recipient.time
                };
                await address_txs.insertOne(addressTx, { session });

                voutOffsets.push({ address, value });
            }
        }

        return voutOffsets;
    }
};

module.exports = blockchain;