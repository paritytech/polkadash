FROM node:10 as builder

# Install any needed packages
RUN apt-get update && apt-get install -y curl git gnupg make gcc g++

WORKDIR /app
COPY . /app

RUN yarn install && cd client && yarn install

FROM node:10

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000 32000

CMD ["yarn", "start"]

