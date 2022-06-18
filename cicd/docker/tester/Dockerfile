FROM node:18

RUN curl -fsSL https://uploader.codecov.io/latest/linux/codecov > /usr/local/bin/codecov \
    && chmod +x /usr/local/bin/codecov

RUN yarn config set enableGlobalCache true
# Warm the package cache
COPY package.json yarn.lock /tmp/package/
RUN cd /tmp/package && yarn
