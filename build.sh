#!/bin/bash
docker build miner/ -t audittrail-miner
docker build setup/ -t audittrail-setup
docker build service/ -t audittrail-service
