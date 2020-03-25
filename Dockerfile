FROM node:lts

ADD . /mu
WORKDIR /mu

ENV DEBUG=mu*
ENV DEBUG_COLORS=0
ENV USER=root
ENV TEMP=/tmp
ENV HOME=/home/root
ENV DEBIAN_FRONTEND=noninteractive

RUN mkdir -p ${HOME} && chmod a+rwx ${TEMP} ${HOME} \
  && apt-get update -qq \
  && apt-get upgrade -y \
  && apt-get install -y --no-install-recommends git dumb-init \
  && git config --global user.email "support@stelligent.com" \
  && git config --global user.name "mutato-docker" \
  && npm install \
  && rm -rf /var/lib/apt/lists/*

ENV mu_opts__git__local=/project
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/npm", "run"]
