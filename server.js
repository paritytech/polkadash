var express = require('express')
var serveBonds = require('./ws').serveBonds
let {Polkadot, bytesToHex} = require('./polkadot.js')

var app = express()

let port = 80;

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/client/dist/index.html');
})
app.get('/bundle.js', function (req, res) {
  res.sendFile(__dirname + '/client/dist/bundle.js');
})
app.listen(port, function () {
	console.log(`Listening on port ${port}!`)
})

let polkadot = new Polkadot
serveBonds({
	height: polkadot.height,
	codeSize: polkadot.codeSize,
	codeHash: polkadot.codeHash.map(bytesToHex),
	authorities: polkadot.authorities.map(
		w => w.map(
			who => ({who, balance: polkadot.staking.balance(who)})
		), 2
	),
	nextThreeUp: polkadot.staking.intentions.map(
		l => ([polkadot.authorities, l.map(a => ({
			a: a, balance: polkadot.staking.balance(a)
		}) ) ]), 3
	).map(([c, l]) => l.sort((a, b) => +b.balance - +a.balance)
	.filter(i => !c.some(x => x+'' == i.a+'')).slice(0, 3)),
	now: polkadot.timestamp.now,
	blockPeriod: polkadot.timestamp.blockPeriod,
	validatorLimit: polkadot.authorities.map(who =>
		polkadot.staking.balance(who[who.length - 1])
	),

	blocksRemaining: polkadot.session.blocksRemaining,
	length: polkadot.session.length,
	percentLate: polkadot.session.percentLate,
	brokenPercentLate: polkadot.session.brokenPercentLate,
	currentIndex: polkadot.session.currentIndex,
	currentStart: polkadot.session.currentStart,
	lastLengthChange: polkadot.session.lastLengthChange
})