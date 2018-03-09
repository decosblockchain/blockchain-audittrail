const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const Web3 = require('web3');
const dns = require('dns');
const EthereumTx = require('ethereumjs-tx');
const async = require('async');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');
const request = require('request');

var vertcoinTestNetwork = {
  messagePrefix: 'Vertcoin Signed Message:\n',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x4A,
  scriptHash: 0xC4,
  wif: 0xEF
};

var privkey = process.env.PRIVKEY;
var keypair = bitcoin.ECPair.fromWIF(privkey, vertcoinTestNetwork)
var address = keypair.getAddress().toString()

console.log("Our commitment address on the Vertcoin Testnet chain is ", address, " - make sure this address has enough balance to make the commitment transactions (0.001 VTC per TX)");

var commitEveryBlocks = parseInt(process.env.COMMIT_BLOCKS);

app.use(require('body-parser').json());

web3 = new Web3();

dns.lookup('audittrail-miner', (err, address, family) => {
  console.log('address: %j family: IPv%s', address, family);
  web3.setProvider(new Web3.providers.HttpProvider("http://" + address + ":8000"));
  
});

app.get('/alive', (req, res, next) => {
  web3.eth.getBlock("latest", false, (error, block) => {
    if(error){
      console.log(error);
      return res.json({alive: false, error: error});
    }
    res.json({alive:true , lastBlock : block});
  });
});

var createNonce = function(nonceCallback, queueCallback) {
  var currentNonce = 0;
  if(fs.existsSync('/data/config/nonce')) {
    currentNonce = parseInt(fs.readFileSync('/data/config/nonce').toString());
    currentNonce++;
  }
  var nonceHex = web3.utils.toHex(currentNonce);
  fs.writeFileSync('/data/config/nonce', currentNonce.toString());
  nonceCallback(nonceHex);
  queueCallback();
}

var createNonceQueue = async.queue(createNonce, 1);

var getNonce = function(callback) {
  createNonceQueue.push(callback);
}

app.post('/verify', (req, res, next) => {
  web3.eth.getTransaction(req.body.transactionHash,(err, tx) => {
    if(err || tx == null) return res.json({success : false, error: "Could not retrieve transaction from blockchain"});
    
    var jsonData = {};
    try {
      jsonData = JSON.parse(web3.utils.hexToAscii(tx.input));
    } catch (e) {
      return res.json({success: false, error : "Could not decode audit data from blockchain transaction"});
    }

    if(jsonData.h.a !== req.body.header.actor || jsonData.h.i !== req.body.header.intent || jsonData.h.o !== req.body.header.object) {
      return res.json({success: false, error : "Header data in blockchain mismatches provided header data"});
    }

    if(jsonData.rh !== req.body.recordHash) {
      return res.json({success : false, error: "Record hash in blockchain mismatches provided record hash"});
    }

    res.json({success: true, blockchainTimestamp: jsonData.ts});

  });
});

app.post('/hash', (req, res, next) => {
  res.json({recordHash: crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex')});
});

app.post('/audit', (req, res, next) => {
  var blockchainData = {};
  blockchainData.h = {
    a : req.body.header.actor,
    i : req.body.header.intent,
    o : req.body.header.object
  };
  blockchainData.rh = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  blockchainData.ts = (new Date).getTime();
  getNonce((nonceHex) => {
    const txParams = {
      nonce: nonceHex,
      gasPrice:"0x0737be7600", // 31 GWEI gas price
      gasLimit:"0xf4240", // 1 million gas limit
      to: "0x" + fs.readFileSync('/data/etherbase.addr').toString().trim(),
      value: "0x0",
      chainId: 192001,
      data: web3.utils.toHex(JSON.stringify(blockchainData))
    }

    const tx = new EthereumTx(txParams);
    var privateKey = fs.readFileSync('/data/etherbase.key').toString();
    tx.sign(Buffer.from(privateKey, 'hex'));
    const serializedTx = '0x' + tx.serialize().toString('hex');

    web3.eth.sendSignedTransaction(serializedTx, function(err, hash) {
      if (!err)
        res.json({ success: true, recordHash: blockchainData.rh, transactionHash : hash });
      else {
        console.error("Error sending raw transaction", err);
        //res.sendStatus(500);
        res.json({ success: false, error: err });
      }
    });
  });
});

var committingBlockHashes = [];

function addBlockHash(index, callback) {
  web3.eth.getBlock(index, (error, block) => {
    if(error) {
      console.error(error);      
      process.exit(-1);
    }
    committingBlockHashes.push(Buffer.from(block.hash.substring(2),'hex'));
    callback();
  });
}


var committing = false;

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest()
}

function merkleRoot(blockHashes) {
  if (!Array.isArray(values)) throw TypeError('Expected values Array')
  if (typeof digestFn !== 'function') throw TypeError('Expected digest Function')

  var length = values.length
  var results = values.concat()

  while (length > 1) {
    var j = 0

    for (var i = 0; i < length; i += 2, ++j) {
      var left = results[i]
      var right = i + 1 === length ? left : results[i + 1]
      var data = Buffer.concat([left, right])

      results[j] = sha256(data)
    }

    length = j
  }

  return results[0]
}

function commitToMasterChain() {
  if(committing) return;
  committing = true;
  var lastCommit = 0;
  if(fs.existsSync('/data/config/lastcommit')) {
    lastCommit = parseInt(fs.readFileSync('/data/config/lastcommit').toString());
  }

  web3.eth.getBlockNumber((err, result) => {
    if(err) {
      committing = false;
      return console.error(err);
    }
    
    if((result - lastCommit) > commitEveryBlocks) {
      var from = lastCommit+1;
      var to = Math.min(result,lastCommit+commitEveryBlocks);

      console.log("Committing block ", from, "to", to, "to master chain");
      committingBlockHashes = [];
      var addBlockHashQueue = async.queue(addBlockHash, 1);

      for(var i = from; i <= to; i++) {
        addBlockHashQueue.push(i);
      }

      addBlockHashQueue.drain = () => {
        var highestHash = committingBlockHashes[committingBlockHashes.length-1];
        console.log("Committing", committingBlockHashes.length, " hashes to master chain - highest hash ", highestHash.toString('hex'));
        commitMerkleRootToMasterChain(merkleRoot, highestHash, (success) => {
          if(success) {
            fs.writeFileSync('/data/config/lastcommit', to.toString());
            committing = false;
          } else {
            console.error("Could not commit to master chain. Retrying later");
            setTimeout(() => {
              committing = false;
            }, 60000);
          }

        });
      };
      
    } else {
      committing = false;
    }
  });
}

function commitMerkleRootToMasterChain(merkleHashBuffer, highestBlockHashBuffer, callback) {
  request.get('https://tvtc.blkidx.org/addressTxos/' + address + '?unconfirmed=1', {json:true}, (err, result, body) => {
    if (err) {
      console.error(err);
      callback(false);
    }

    var tx = new bitcoin.TransactionBuilder(vertcoinTestNetwork);
    var total = 0;
    body.forEach((txo) => {
        if(txo.spender == null) {
            if(total <= 100000) {
                total += txo.value;
                tx.addInput(txo.txhash,txo.vout);
            }
        }
    });
    if (100000 > total) {
      console.error(new Error('Address doesn\'t contain enough money to make a commitment transaction. Please send funds to ' + address + ' to continue committing to master chain.'));
      return callback(false);
    }
    tx.addOutput(address, total-100000);
    var ret = bitcoin.script.compile(
      [
        bitcoin.opcodes.OP_RETURN,
        merkleHashBuffer
      ])
    tx.addOutput(ret, 0);
    var ret = bitcoin.script.compile(
      [
        bitcoin.opcodes.OP_RETURN,
        highestBlockHashBuffer
      ])
    tx.addOutput(ret, 0);

    tx.inputs.forEach((input, i) => {
      tx.sign(i, keypair);
    });
    var txHex = tx.build().toHex();
    request.post('https://tvtc.blkidx.org/sendRawTransaction', { body : txHex }, (err, result, body) => {
      if (err) {
        callback(false);
        return console.error(err);
      }
      if(body.indexOf('Exception') == -1)
      {
        console.log("Committed to master chain - txid:", body);
        callback(true);
      } else {
        console.error("Error committing to master chain: " , body);
        callback(false);
      }
    });
  });
}

setInterval(commitToMasterChain, 15000);

module.exports = app;