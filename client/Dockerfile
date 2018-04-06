FROM golang:alpine as build

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh gcc musl-dev
ENV GOROOT=/usr/local/go
COPY . /usr/local/go/src/github.com/decosblockchain/blockchain-audittrail/client
WORKDIR /usr/local/go/src/github.com/decosblockchain/blockchain-audittrail/client
RUN go get -v ./...
RUN go build


FROM alpine
WORKDIR /app
RUN cd /app
COPY --from=build /usr/local/go/src/github.com/decosblockchain/blockchain-audittrail/client /app/bin/client

EXPOSE 8001

CMD ["bin/client"]