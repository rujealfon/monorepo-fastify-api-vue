FROM node:24-alpine
RUN npm install -g pg
WORKDIR /app
COPY cleanup.mjs .
# Run daily at 02:00 UTC via Alpine crond
RUN echo "0 2 * * * node /app/cleanup.mjs >> /var/log/cleanup.log 2>&1" > /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
