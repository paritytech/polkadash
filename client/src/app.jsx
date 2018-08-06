import oo7 from 'oo7';
import {Rspan, ReactiveComponent} from 'oo7-react';
import React from 'react';
import {pretty, reviver} from './polkadot.js';

export class WebSocketBond extends oo7.Bond {
	constructor(reviver) {
		super();
		this.reviver = reviver
	}
	initialise () {
		this.start()
	}
	start () {
		let uri = `ws://${new URL(document.location.origin).hostname}:40510`;
		this.ws = new WebSocket(uri)
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
			if (that.reconnect) {
				window.clearTimeout(that.reconnect)
			}
			that.reconnect = window.setTimeout(() => {
				that.ws.close()
				delete that.ws
				that.start()
			}, 60000)
		}
	}
	finalise () {
		delete this.ws;
	}
}

let bonds = (new WebSocketBond(reviver)).subscriptable();

export class Dot extends ReactiveComponent {
	constructor () {
		super(["value", "className"])
	}
	render() {
		return (<span className={this.state.className} name={this.props.name}>
			{(this.props.prefix || '') + pretty(this.state.value) + (this.props.suffix || '')}
		</span>)
	}
}

export class ValidatorBalances extends ReactiveComponent {
	constructor () {
		super(["value", "className"])
	}
	render() {
		if (!this.state.value) return (<div/>)
		return (<div className={this.state.className} name={this.props.name}>
			{this.state.value.map((v, i) => (<div key={i} className="validator-balance">
				<div className="AccountId">{pretty(v.who)}</div>
				<div className="Balance">{pretty(v.balance)}{
					(v.otherBalance > 0
						? <span className="paren">{' (incl. ' + pretty(v.otherBalance) + ' nominated)'}</span>
						: <span/>
					)
				}</div>
				
			</div>))}
		</div>)
	}
}

export class App extends React.Component {
	constructor () {
		super()
		window.bonds = bonds
		window.pretty = pretty
	}
	render() {
		return (
		<div id="dash">
			<div className="value" id="height">
				<div className="label">height</div>
				<Dot prefix="#" value={bonds.height}/>
			</div>
			<div className="value" id="session-blocks-remaining">
				<div className="label">blocks remaining in session</div>
				<Dot value={bonds.sessionBlocksRemaining} suffix=" of "/>
				<Dot value={bonds.sessionLength}/>
			</div>
			<div className="value" id="session-lateness">
				<div className="label">session lateness</div>
				<Dot value={bonds.percentLate.map(Math.round)} suffix="% of "/>
				<Dot value={bonds.brokenPercentLate} suffix="%"/>
			</div>
			<div className="value" id="era-blocks-remaining">
				<div className="label">blocks left in current era</div>
				<Dot value={bonds.eraBlocksRemaining} suffix=" of "/>
				<Dot value={bonds.eraLength}/>
			</div>
			<div className="big list" id="current-validators">
				<div className="label">current validators</div>
				<ValidatorBalances value={bonds.authorities}/>
			</div>
			<div className="big list" id="next-validators">
				<div className="label">next validators</div>
				<ValidatorBalances value={bonds.nextValidators}/>
			</div>
			<div id="rest">
				<div>eraSessionsRemaining: <Dot value={bonds.eraSessionsRemaining}/></div>
				<div>activeReferenda: <Dot value={bonds.activeReferenda}/></div>
				<div>proposedReferenda: <Dot value={bonds.proposed}/></div>
				<div>launchPeriod: <Dot value={bonds.launchPeriod}/></div>
				<div>minimumDeposit: <Dot value={bonds.minimumDeposit}/></div>
				<div>votingPeriod: <Dot value={bonds.votingPeriod}/></div>
			</div>
		</div>);
	}
}
/*
			<div>
				<div>Chain: <div style={{marginLeft: '1em'}}>
					<div>Code: <Rspan>{bonds.codeSize}</Rspan> bytes (<Rspan>{bonds.codeHash}</Rspan>)</div>
					<div>Next three up: <Rspan>{bonds.nextThreeUp.map(pretty)}</Rspan></div>
					<div>Now: <Rspan>{bonds.now.map(pretty)}</Rspan></div>
					<div>Block Period: <Rspan>{bonds.blockPeriod.map(x => x.number + ' seconds')}</Rspan></div>
					<div>Limit to become validator: <Rspan>{bonds.validatorLimit.map(pretty)}</Rspan></div>
				</div></div>
				<div>Sessions: <div style={{marginLeft: '1em'}}>
					<div>Current Index: <Rspan>{bonds.currentIndex.map(pretty)}</Rspan></div>
					<div>Current Start: <Rspan>{bonds.currentStart.map(d => d.toLocaleString())}</Rspan></div>
					<div>Last Length Change: #<Rspan>{bonds.lastLengthChange.map(pretty)}</Rspan></div>
				</div></div>
				<div>Staking: <div style={{marginLeft: '1em'}}>
					<div>Sessions per era: <Rspan>{bonds.sessionsPerEra.map(pretty)}</Rspan></div>
					<div>Current era: <Rspan>{bonds.currentEra.map(pretty)}</Rspan></div>
				</div></div>
			</div>
*/
/*			
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
