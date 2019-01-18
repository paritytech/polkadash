var express = require('express')
var serveBonds = require('./ws').serveBonds
let {Bond} = require('oo7')
WebSocket = require('ws')
let {runtime, chain, system, bytesToHex, initRuntime} = require('oo7-substrate')

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

initRuntime(() => {
	serveBonds({
		height: chain.height,
		finalisedHeight: chain.finalisedHeight,
		lag: chain.lag,
		chainName: system.chain,
		clientVersion: system.version,
		runtimeVersion: runtime.version,
		codeSize: runtime.core.codeSize,
		codeHash: runtime.core.codeHash.map(bytesToHex),
		authorities: runtime.core.authorities,
		validators: runtime.staking.validators,
		nextThreeUp: runtime.staking.nextThreeUp,
		nextValidators: runtime.staking.nextValidators,
		now: runtime.timestamp.now,
		blockPeriod: runtime.timestamp.blockPeriod,
		validatorLimit: runtime.session.validators.map(who =>
			runtime.staking.currentStakingBalance(who[who.length - 1])
		),

		thisSessionReward: runtime.staking.thisSessionReward,
		sessionReward: runtime.staking.sessionReward,
		sessionBlocksRemaining: runtime.session.blocksRemaining,
		sessionLength: runtime.session.sessionLength,
		percentLate: runtime.session.percentLate,
		currentIndex: runtime.session.currentIndex,
		currentStart: runtime.session.currentStart,
		lastLengthChange: runtime.session.lastLengthChange,

		sessionsPerEra: runtime.staking.sessionsPerEra,
		currentEra: runtime.staking.currentEra,
		eraBlocksRemaining: runtime.staking.eraBlocksRemaining,
		eraSessionsRemaining: runtime.staking.eraSessionsRemaining,
		eraLength: runtime.staking.eraLength,
		offlineSlashGrace: runtime.staking.offlineSlashGrace,

		launchPeriod: runtime.democracy.launchPeriod,
		minimumDeposit: runtime.democracy.minimumDeposit,
		votingPeriod: runtime.democracy.votingPeriod,
//		proposedReferenda: runtime.democracy.proposed,
//		activeReferenda: runtime.democracy.active
		/*Bond.all([polkadot.democracy.active, polkadot.height])
			.map(([active, h]) =>
				active.map(i => Object.assign({ remaining: i.ends - h }, i)
			))*/
	}, {
		authorities: 'value'
	})
})

global.runtime = runtime
global.chain = chain