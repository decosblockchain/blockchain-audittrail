FROM ubuntu:latest
RUN apt-get update && apt-get install -y openssl build-essential make sed git 

RUN mkdir /root/sources
WORKDIR /root/sources
RUN git clone https://github.com/maandree/libkeccak
RUN git clone https://github.com/maandree/sha3sum
WORKDIR /root/sources/libkeccak
RUN make
RUN make install 
RUN ldconfig
WORKDIR /root/sources/sha3sum
RUN make all
RUN make install 

COPY *.json /root/config/
COPY setup.sh /root/setup.sh
RUN chmod +x /root/setup.sh
CMD ["/root/setup.sh"]