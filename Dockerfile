FROM buildkite/puppeteer
WORKDIR /n95
COPY . .
RUN npm i
CMD node index.js && cat data.json
