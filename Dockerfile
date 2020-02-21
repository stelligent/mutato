FROM node:lts

ADD . /mu
WORKDIR /mu
ENV USER=root

RUN npm install && npm test

ENTRYPOINT [ "/bin/bash" ]
