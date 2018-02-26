FROM ubuntu:latest
RUN apt-get update && apt-get install -y software-properties-common \
      && add-apt-repository -y ppa:ethereum/ethereum \
      && apt-get update \
      && apt-get -y install ethereum

ADD miner.sh /root/scripts/miner.sh
RUN chmod +x /root/scripts/miner.sh
EXPOSE 8000
ENTRYPOINT ["/root/scripts/miner.sh"]
