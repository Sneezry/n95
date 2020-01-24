FROM buildkite/puppeteer
RUN groupadd -r n95 && useradd -r -g n95 -G audio,video n95 \
    && mkdir -p /home/n95/n95 \
    && chown -R n95:n95 /home/n95
USER n95
WORKDIR /home/n95/n95
COPY --chown=n95:n95 . .
RUN npm i
CMD node index.js && cat data.json
