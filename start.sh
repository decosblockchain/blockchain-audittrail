#!/bin/bash

docker run --rm -v "$(pwd)/data":/data audittrail-setup:latest
docker run --rm --network audittrailnetwork --memory 1g -v "$(pwd)/data/ethash":/root/.ethash -v "$(pwd)/data":/data --env PORT=33003 --env MINERPROCEEDS=0x$(< "$(pwd)/data/etherbase.addr" ) --env NETWORKID=192001 --name audittrail-miner audittrail-miner:latest