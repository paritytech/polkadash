# Polkadash

The Polkadot Dashboard

## Screenshot

![image](https://user-images.githubusercontent.com/138296/43685489-48767cf6-98b4-11e8-82ea-cefc4f6dd04c.png)

## How it works

Polkadash comes in two parts: the server and the client. The server serves out an HTML file containing the basic static page and the JS "bundle" file built from the client project. It also sets up a Websockets server that pushes updated data to the client as it becomes ready. The data is fetched from the local Polkadot node (assumed to be running on ws://localhost:9933) via RPC, cached and sent onto the Websockets connection using polkadot.js Bonds API and the generic `serveBonds` function.

The client is a basic Bonds + React application which uses `WebsocketBond` to succinctly receive the updates to the page in the form of Bonds. The Bonds represent richly typed values that makes working with the composite types common in Polkadot easier. They are isolated and displayed using simple `Rspan` tags from the `oo7-react` library, after being prettified/stringified according to their type.

## Install

To install, ensure you use `npm i` in both the server (top level directory) and client (under `client/`):

```sh
npm i && cd client npm i
```

## Development

To develop, run `npm run dev` in both the top-level directory and the `client/` subdirectory. In one terminal keep the client bundle up to date:

```sh
$ cd client && npm run dev
```

Then in another, keep the server up to date:

```sh
$ npm run dev
``` 

Finally, open your browser (the default port to serve the page from is 3000):

```
http://localhost:3000/
```

## Deploy

The port on which the page is served is 3000 by default. To change it to e.g. 80, create `config.json` in the top-level and edit it so it reads:

```json
{
  "port": 80
}
```

The Websockets connection is hard-coded to be 40510. Ensure this port and the previous are both open on your server.

Finally, just run `npm start`. This will build the client bundle once and then run the server:

```sh
$ npm start
```

