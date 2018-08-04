import oo7 from 'oo7';
import {Rspan} from 'oo7-react';
import React from 'react';
import {pretty, reviver} from './polkadot.js';

export class WebSocketBond extends oo7.Bond {
	constructor(reviver) {
		super();
		this.reviver = reviver
	}
	initialise () {
		this.ws = new WebSocket('ws://localhost:40510')
		this.ws.onopen = function () {}
		let that = this;
		this.ws.onmessage = function (ev) {
			let d = JSON.parse(ev.data, that.reviver)
			if (!that.isReady() && d.init) {
				that.trigger(d.ready)
			} else if (that.isReady() && !d.init) {
				let o = Object.assign({}, that._value)
				if (d.value) {
					o[d.key] = d.value
				} else {
					delete o[d.key]
				}
				that.trigger(o)
			}
		}
	}
	finalise () {
		delete this.ws;
	}
}

let bonds = (new WebSocketBond(reviver)).subscriptable();

export class App extends React.Component {
	constructor () {
		super();
	}
	render() {
		return (<div>
			<div>Chain: <div style={{marginLeft: '1em'}}>
				<div>Height: <Rspan>{bonds.height}</Rspan></div>
				<div>Code: <Rspan>{bonds.codeSize}</Rspan> bytes (<Rspan>{bonds.codeHash}</Rspan>)</div>
				<div>Authorities:
					<Rspan>{bonds.authorities.map(pretty)}</Rspan></div>
				<div>Next three up: <Rspan>{bonds.nextThreeUp.map(pretty)}</Rspan></div>
				<div>Now: <Rspan>{bonds.now.map(pretty)}</Rspan></div>
				<div>Block Period: <Rspan>{bonds.blockPeriod.map(x => x.number + ' seconds')}</Rspan></div>
				<div>Limit to become validator: <Rspan>{bonds.validatorLimit.map(pretty)}</Rspan></div>
			</div></div>
			<div>Sessions: <div style={{marginLeft: '1em'}}>
				<div>Remaining: <Rspan>{bonds.blocksRemaining}</Rspan> of <Rspan>{bonds.length}</Rspan></div>
				<div>Lateness: <Rspan>{bonds.percentLate.map(Math.round)}</Rspan>% of <Rspan>{bonds.brokenPercentLate}</Rspan>%</div>
				<div>Current Index: <Rspan>{bonds.currentIndex}</Rspan></div>
				<div>Current Start: <Rspan>{bonds.currentStart.map(d => d.toLocaleString())}</Rspan></div>
				<div>Last Length Change: <Rspan>{bonds.lastLengthChange}</Rspan></div>
			</div></div>
		</div>);
	}
}
/*
		this.pd = new Polkadot;
		this.who = new oo7.Bond;
*/
/*			<div>Staking: <div style={{marginLeft: '1em'}}>
				<div>Sessions per era: <Rspan>{this.pd.staking.sessionsPerEra}</Rspan></div>
				<div>Current era: <Rspan>{this.pd.staking.currentEra}</Rspan></div>
				<div>Intentions: <Rspan>{this.pd.staking.intentions.map(pretty)}</Rspan></div>
			</div></div>
			<div>Democracy: <div style={{marginLeft: '1em'}}>
				<div>Active referenda: <Rspan>{oo7.Bond.all([this.pd.democracy.active, this.pd.height]).map(([active, h]) =>
					active.map(i => Object.assign({ remaining: i.ends - h }, i))
				).map(pretty)}</Rspan></div>
				<div>Proposed referenda: <Rspan>{this.pd.democracy.proposed.map(pretty)}</Rspan></div>
				<div>Launch period: <Rspan>{this.pd.democracy.launchPeriod.map(pretty)}</Rspan></div>
				<div>Minimum deposit: <Rspan>{this.pd.democracy.minimumDeposit.map(pretty)}</Rspan></div>
				<div>Voting period: <Rspan>{this.pd.democracy.votingPeriod.map(pretty)}</Rspan></div>
			</div></div>
			<div>Council: <div style={{marginLeft: '1em'}}>
				<div>Members: <Rspan>{this.pd.council.active.map(pretty)}</Rspan></div>
				<div>Candidates: <Rspan>{this.pd.council.candidates.map(pretty)}</Rspan></div>
				<div>Candidacy bond: <Rspan>{this.pd.council.candidacyBond.map(pretty)}</Rspan></div>
				<div>Voting bond: <Rspan>{this.pd.council.votingBond.map(pretty)}</Rspan></div>
				<div>Present slash per voter: <Rspan>{this.pd.council.presentSlashPerVoter.map(pretty)}</Rspan></div>
				<div>Carry count: <Rspan>{this.pd.council.carryCount.map(pretty)}</Rspan></div>
				<div>Presentation duration: <Rspan>{this.pd.council.presentationDuration.map(pretty)}</Rspan></div>
				<div>Inactive grace period: <Rspan>{this.pd.council.inactiveGracePeriod.map(pretty)}</Rspan></div>
				<div>Voting period: <Rspan>{this.pd.council.votingPeriod.map(pretty)}</Rspan></div>
				<div>Term duration: <Rspan>{this.pd.council.termDuration.map(pretty)}</Rspan></div>
				<div>Desired seats: <Rspan>{this.pd.council.desiredSeats.map(pretty)}</Rspan></div>
			</div></div>
			<div>Council Voting: <div style={{marginLeft: '1em'}}>
				<div>Voting Period: <Rspan>{this.pd.councilVoting.votingPeriod.map(pretty)}</Rspan></div>
				<div>Cooloff Period: <Rspan>{this.pd.councilVoting.cooloffPeriod.map(pretty)}</Rspan></div>
				<div>Proposals: <Rspan>{this.pd.councilVoting.proposals.map(pretty)}</Rspan></div>
			</div></div>
			<div>
			<AccountIdBond bond={this.who} />
			Balance of <Rspan style={{fontFamily: 'monospace', fontSize: 'small'}}>{this.who.map(ss58_encode)}</Rspan> is <Rspan>{this.pd.staking.balance(this.who)}</Rspan>
			</div>
*/
