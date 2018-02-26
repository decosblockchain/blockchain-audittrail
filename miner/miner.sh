#!/bin/bash

if [ ! -f /data/config/miner-initialized ]; then
  bootnode -genkey  /data/config/miner.key
  bootnode -nodekey /data/config/miner.key -writeaddress > /data/config/miner.pub

  geth --datadir "/data/blockchain" init /data/config/genesis.json
  touch /data/config/miner-initialized
fi
geth --ipcpath /root/.ethereum/geth.ipc --rpcaddr "$NODEIP" --rpcapi "db,eth,net,web3" --rpc --rpcport "8000" --nodekey /data/config/miner.key --networkid $NETWORKID --port "$PORT" --datadir "/data/blockchain" --nodiscover --mine --minerthreads 1 --etherbase $MINERPROCEEDS  --verbosity 9
