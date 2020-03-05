FROM node:lts

ADD . /mu
WORKDIR /mu

ENV USER=root
ENV DEBUG=mu*
ENV DEBUG_COLORS=0
ENV mu_opts__git__remote=$mu_opts__git__remote
ENV mu_opts__git__branch=$mu_opts__git__branch

RUN npm install && npm test || tail -n 5000 npm-test.log && exit 1

ENTRYPOINT [ "/bin/bash" ]
