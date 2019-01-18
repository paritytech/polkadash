var WebSocketServer = require('ws').Server
let oo7 = require('oo7')

function serveBonds(servedBonds, debugBonds = {}) {
	let wss = new WebSocketServer({port: 40510})
	let connections = []
	let nextBroadcast = {}

	let broadcast = () => {
//		console.debug(`Broadcasting`, nextBroadcast)
		let msg = JSON.stringify(nextBroadcast)
		nextBroadcast = {}

		connections.forEach((ws, i, o) => {
			try {
				ws.send(msg)
			}
			catch (e) {
				console.log(`Error ${e} sending. Closing...`)
				o.splice(i, 1)
				try {
					ws.close()
				}
				catch (ee) {
					console.log(`Error ${ee} closing. Ignoring.`)
				}
			}
		})
	}

	let broadcastTimer = null;
	let notify = (key, i, ready, value) => {
		nextBroadcast[key] = ready ? { value } : {}
		if (debugBonds[key]) {
			console.log(
				debugBonds[key] == 'value'
					? `Updating ${key} := ${ready ? JSON.stringify(value) : '<not ready>'}`
					: `Updating ${key}`
			)
		}
		if (broadcastTimer) {
			clearTimeout(broadcastTimer)
		}
		broadcastTimer = setTimeout(broadcast, 0);
	}
	Object.keys(servedBonds)
		.forEach((key, i) => {
			let b = servedBonds[key]
			if (b) {
				b.notify(() => {
					notify(key, i, b._ready, b._value)
				})
			} else {
				console.log("Not a Bond: ", key, b)
			}
		})

	wss.on('connection', function (ws) {
		connections.push(ws);
		let ready = {}
		Object.keys(servedBonds).forEach(key => {
			let b = servedBonds[key]
			if (b._ready) {
				ready[key] = b._value
			}
		})
		let s = JSON.stringify({ init: true, ready })
		ws.send(s)
	})
	
	return wss
}

module.exports = { serveBonds }