FROM node:lts

ADD . /mu
WORKDIR /mu
ENV USER=root

RUN npm install  && npm test && npm run clean

ENTRYPOINT [ "/bin/bash" ]
