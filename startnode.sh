#!/bin/bash
geth --networkid 192001 --datadir "/home/gertjaap/.decosaudit" --bootnodes "enode://$(< $PWD/data/config/miner.pub )@172.26.0.2:33003"
