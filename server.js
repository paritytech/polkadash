var express = require('express')
var serveBonds = require('./ws').serveBonds
let {Bond} = require('oo7')
let {Polkadot, bytesToHex} = require('oo7-polkadot')

let config = {};
try {
	config = JSON.parse(require('fs').readFileSync(__dirname + '/config.json', 'utf8'))
} catch (e) {
	console.log(`Error reading config.json: ${e}. Using defaults`)
}

var app = express()

let port = config.port || 3000;
let serveFiles = {
	'': 'index.html',
	'bundle.js': 'bundle.js',
	'styles.css': 'styles.css'
}

Object.keys(serveFiles).forEach(k =>
	app.get('/' + k, (req, res) => 
		res.sendFile(__dirname + '/client/dist/' + serveFiles[k])
	)
)
app.listen(port, function () {
	console.log(`Listening on port ${port}!`)
})

process.on('unhandledRejection', error => {
	// Will print "unhandledRejection err is not defined"
	console.log('unhandledRejection', error);
});

let polkadot = new Polkadot
serveBonds({
	height: polkadot.height,
	codeSize: polkadot.codeSize,
	codeHash: polkadot.codeHash.map(bytesToHex),
	authorities: polkadot.consensus.authorities,
	validators: polkadot.staking.validators,
	nextThreeUp: polkadot.staking.nextThreeUp,
	nextValidators: polkadot.staking.nextValidators,
	now: polkadot.timestamp.now,
	blockPeriod: polkadot.timestamp.blockPeriod,
	validatorLimit: polkadot.session.validators.map(who =>
		polkadot.staking.currentStakingBalance(who[who.length - 1])
	),

	thisSessionReward: polkadot.staking.thisSessionReward,
	sessionReward: polkadot.staking.sessionReward,
	sessionBlocksRemaining: polkadot.session.blocksRemaining,
	sessionLength: polkadot.session.length,
	percentLate: polkadot.session.percentLate,
	brokenPercentLate: polkadot.session.brokenPercentLate,
	currentIndex: polkadot.session.currentIndex,
	currentStart: polkadot.session.currentStart,
	lastLengthChange: polkadot.session.lastLengthChange,

	sessionsPerEra: polkadot.staking.sessionsPerEra,
	currentEra: polkadot.staking.currentEra,
	eraBlocksRemaining: polkadot.staking.eraBlocksRemaining,
	eraSessionsRemaining: polkadot.staking.eraSessionsRemaining,
	eraLength: polkadot.staking.eraLength,
	offlineSlashGrace: polkadot.staking.offlineSlashGrace,
	earlyEraSlash: polkadot.staking.earlyEraSlash,

	proposedReferenda: polkadot.democracy.proposed,
	launchPeriod: polkadot.democracy.launchPeriod,
	minimumDeposit: polkadot.democracy.minimumDeposit,
	votingPeriod: polkadot.democracy.votingPeriod,
	activeReferenda: polkadot.democracy.active/*Bond.all([polkadot.democracy.active, polkadot.height])
		.map(([active, h]) =>
			active.map(i => Object.assign({ remaining: i.ends - h }, i)
		))*/
}, {
	authorities: 'value'
})