FROM node:alpine

RUN apk add --no-cache --virtual .gyp \
        python \
        git \
        make \
        g++ 

ENV NODE_ENV dev
RUN mkdir -p /var/app

        
COPY ./package.json /var/app/package.json
WORKDIR /var/app
RUN npm install --silent \
    && apk del .gyp

COPY . /var/app

ENV NODE_ENV=production
CMD ["npm", "start"]