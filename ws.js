var WebSocketServer = require('ws').Server
let oo7 = require('oo7')

function serveBonds(servedBonds) {
	let wss = new WebSocketServer({port: 40510})

	wss.on('connection', function (ws) {
		var ready = {};
		var notReady = [];
		let dk = []
		Object.keys(servedBonds).forEach(key => {
			let b = servedBonds[key]
			dk.push(b.notify(() => {
				console.log(`Updating host ${ws.address} with ${key}`)
				try {
					let s = JSON.stringify(b._ready ? { key, value: b._value } : { key })
					ws.send(s)
				}
				catch (e) {
					console.log(`Error. Closing ${ws.address}`)
					if (dk) {
						Object.keys(servedBonds).forEach((key, i) => {
							servedBonds[key].unnotify(dk[i])
						})
						delete dk
					}
					ws.close()
				}
			}))
			if (b._ready) {
				ready[key] = b._value
			} else {
				notReady.push(key)
			}
		})
		let s = JSON.stringify({ init: true, notReady, ready })
		ws.send(s)
	})
	
	return wss
}

module.exports = { serveBonds }