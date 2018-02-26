#!/bin/bash
openssl ecparam -name secp256k1 -genkey -noout | openssl ec -text -noout > "/data/etherbase_key"
cat "/data/etherbase_key" | grep pub -A 5 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^04//' > "/data/etherbase.pub"
cat "/data/etherbase_key" | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^00//' > "/data/etherbase.key"
cat "/data/etherbase.pub" | keccak-256sum -x -l | tr -d ' -' | tail -c 41 > "/data/etherbase.addr"
rm "/data/etherbase_key"

mkdir -p /data/config

cp /root/config/*.json /data/config/