FROM node:lts

ADD . /mu
WORKDIR /mu

ENV USER=root
ENV DEBUG=mu*
ENV DEBUG_COLORS=0

RUN npm install && npm test

ENTRYPOINT [ "/bin/bash" ]
