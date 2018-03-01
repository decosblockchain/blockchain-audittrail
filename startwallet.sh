#!/bin/bash
ethereumwallet --network 192001 --node geth --node-datadir "/home/gertjaap/.decosaudit" --node-networkid 192001 --node-bootnodes "enode://$(< $PWD/data/config/miner.pub )@172.26.0.2:33003"
