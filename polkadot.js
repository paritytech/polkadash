const {Bond, TimeBond, TransformBond} = require('oo7');
const XXH = require('xxhashjs');
const {blake2b} = require('blakejs');
const bs58 = require('bs58');
require('isomorphic-fetch');

function ss58_decode(address) {
	let a;
	try {
		a = bs58.decode(address);
	}
	catch (e) {
		return null;
	}
	if (a[0] == 42) {
		if (a.length == 32 + 1 + 2) {
			let address = a.slice(0, 33);
			let hash = blake2b(address);
			if (a[33] == hash[0] && a[34] == hash[1]) {
				return address.slice(1);
			} else {
				// invalid checksum
				return null;
			}
		} else {
			// Invalid length.
			return null;
		}
	} else {
		// Invalid version.
		return null;
	}
}

function ss58_encode(address) {
	if (address.length != 32) {
		return null;
	}
	let bytes = new Uint8Array([42, ...address]);
	let hash = blake2b(bytes);
	let complete = new Uint8Array([...bytes, hash[0], hash[1]]);
	return bs58.encode(complete);
}

const Calls = {0: {
	name: 'consensus',
	calls: interpretRustCalls(`
fn report_misbehavior(aux, report: MisbehaviorReport) = 0;
	`),
	priv_calls: interpretRustCalls(`
fn set_code(new: Vec<u8>) = 0;
fn set_storage(items: Vec<KeyValue>) = 1;
	`)
}, 1: {
	name: 'session',
	calls: interpretRustCalls(`
fn set_key(aux, key: T::SessionKey) = 0;
	`),
	priv_calls: interpretRustCalls(`
fn set_length(new: T::BlockNumber) = 0;
fn force_new_session() = 1;
	`)
}, 2: {
	name: 'staking',
	calls: interpretRustCalls(`
fn transfer(aux, dest: T::AccountId, value: T::Balance) = 0;
fn stake(aux) = 1;
fn unstake(aux) = 2;
	`),
	priv_calls: interpretRustCalls(`
fn set_sessions_per_era(new: T::BlockNumber) = 0;
fn set_bonding_duration(new: T::BlockNumber) = 1;
fn set_validator_count(new: u32) = 2;
fn force_new_era() = 3;
	`)
}, 3: {
	name: 'timestamp',
	calls: [],
	priv_calls: []
}, 5: {
	name: 'democracy',
	calls: interpretRustCalls(`
fn propose(aux, proposal: Box<T::Proposal>, value: T::Balance) = 0;
fn second(aux, proposal: PropIndex) = 1;
fn vote(aux, ref_index: ReferendumIndex, approve_proposal: bool) = 2;
	`),
	priv_calls: interpretRustCalls(`
fn start_referendum(proposal: Box<T::Proposal>, vote_threshold: VoteThreshold) = 0;
fn cancel_referendum(ref_index: ReferendumIndex) = 1;
	`)
}, 6: {
	name: 'council',
	calls: interpretRustCalls(`
fn set_approvals(aux, votes: Vec<bool>, index: VoteIndex) = 0;
fn reap_inactive_voter(aux, signed_index: u32, who: T::AccountId, who_index: u32, assumed_vote_index: VoteIndex) = 1;
fn retract_voter(aux, index: u32) = 2;
fn submit_candidacy(aux, slot: u32) = 3;
fn present_winner(aux, candidate: T::AccountId, total: T::Balance, index: VoteIndex) = 4;
	`),
	priv_calls: interpretRustCalls(`
fn set_desired_seats(count: u32) = 0;
fn remove_member(who: T::AccountId) = 1;
fn set_presentation_duration(count: T::BlockNumber) = 2;
fn set_term_duration(count: T::BlockNumber) = 3;
	`)
}, 7: {
	name: 'council_voting',
	calls: interpretRustCalls(`
fn propose(aux, proposal: Box<T::Proposal>) = 0;
fn vote(aux, proposal: T::Hash, approve: bool) = 1;
fn veto(aux, proposal_hash: T::Hash) = 2;
	`),
	priv_calls: interpretRustCalls(`
fn set_cooloff_period(blocks: T::BlockNumber) = 0;
fn set_voting_period(blocks: T::BlockNumber) = 1;
	`)
}};
function interpretRustCalls(s) {
	var r = {};
	s.split('\n')
		.map(s => s.trim())
		.filter(s => !s.startsWith('//') && !s.length == 0)
		.map(s => s.match(/fn ([a-z_]*)\((aux,? ?)?(.*)\) = ([0-9]+);/))
		.map(([_0, name, _2, p, index], i) => {
			let params = p.length == 0 ? [] : p.split(',').map(p => {
				let m = p.match(/([a-z_]*): *([A-Za-z][A-Za-z<>:0-9]+)/);
				let name = m[1];
				var type = m[2].replace('T::', '');
				type = type.match(/^Box<.*>$/) ? type.slice(4, -1) : type;
				return { name, type };
			});
			r[index] = { name, params };
		});
	return r;
}

function stringify(input, type) {
	if (typeof type === 'object') {
		return type.map(t => stringify(input, t));
	}
	switch (type) {
		case 'Call': {
			let c = Calls[input.data[0]];
			let res = c.name + '.';
			c = c.calls[input.data[1]];
			input.data = input.data.slice(2);
			return res + c.name + '(' + c.params.map(p => p.name + "=" + stringify(input, p.type)).join(', ') + ')';
		}
		case 'Proposal': {
			let c = Calls[input.data[0]];
			let res = c.name + '.';
			c = c.priv_calls[input.data[1]];
			input.data = input.data.slice(2);
			return res + c.name + '(' + c.params.map(p => p.name + "=" + stringify(input, p.type)).join(', ') + ')';
		}
		case 'AccountId': {
			let res = ss58_encode(input.data.slice(0, 32));
			input.data = input.data.slice(32);
			return res;
		}
		case 'Hash': {
			let res = '0x' + bytesToHex(input.data.slice(0, 32));
			input.data = input.data.slice(32);
			return res;
		}
		case 'Balance':
			let res = '' + leToNumber(input.data.slice(0, 16));
			input.data = input.data.slice(16);
			return res;
		case 'BlockNumber': {
			let res = '' + leToNumber(input.data.slice(0, 8));
			input.data = input.data.slice(8);
			return res;
		}
		case 'VoteThreshold': {
			const VOTE_THRESHOLD = ['SuperMajorityApprove', 'NotSuperMajorityAgainst', 'SimpleMajority'];
			let res = VOTE_THRESHOLD[input.data[0]];
			input.data = input.data.slice(1);
			return res;
		}
		case 'u32':
		case 'VoteIndex':
		case 'PropIndex':
		case 'ReferendumIndex': {
			let res = '' + leToNumber(input.data.slice(0, 4));
			input.data = input.data.slice(4);
			return res;
		}
		case 'bool': {
			let res = input.data[0] ? 'true' : 'false';
			input.data = input.data.slice(1);
			return res;
		}
		case 'KeyValue': {
			return stringify(input, '(Vec<u8>, Vec<u8>)');
		}
		case 'Vec<bool>': {
			let size = leToNumber(input.data.slice(0, 4));
			input.data = input.data.slice(4);
			let res = '[' + [...input.data.slice(0, size)].join('') + ']';
			input.data = input.data.slice(size);
			return res;
		}
		case 'Vec<u8>': {
			let size = leToNumber(input.data.slice(0, 4));
			input.data = input.data.slice(4);
			let res = '[' + bytesToHex(input.data.slice(0, size)) + ']';
			input.data = input.data.slice(size);
			return res;
		}
		default: {
			let v = type.match(/^Vec<(.*)>$/);
			if (v) {
				let size = leToNumber(input.data.slice(0, 4));
				input.data = input.data.slice(4);
				let res = '[' + [...new Array(size)].map(() => stringify(input, v[1])).join(', ') + ']';
				return res;
			}
			let t = type.match(/^\((.*)\)$/);
			if (t) {
				return '(' + stringify(input, t[1].split(', ')).join(', ') + ')';
			}
			throw 'Unknown type to stringify: ' + type;
		}
	}
}

class AccountId extends Uint8Array { toJSON() { return { _type: 'AccountId', data: Array.from(this) } }}
class Hash extends Uint8Array { toJSON() { return { _type: 'Hash', data: Array.from(this) } }}
class VoteThreshold extends String { toJSON() { return { _type: 'VoteThreshold', data: this + ''} }}
class Moment extends Date {
	constructor(seconds) {
		super(seconds * 1000)
		this.number = seconds
	}
	toJSON() {
		return { _type: 'Moment', data: this.number }
	}
}
class Balance extends Number { toJSON() { return { _type: 'Balance', data: this+0 } }}
class BlockNumber extends Number { toJSON() { return { _type: 'BlockNumber', data: this+0 } }}
class Tuple extends Array { toJSON() { return { _type: 'Tuple', data: this } }}
class CallProposal extends Object { constructor (isCall) { super(); this.isCall = isCall; } }
class Proposal extends Object {
	constructor () { super(false) }
	toJSON() { return { _type: 'Proposal', data: this } }
}
class Call extends Object {
	constructor () { super(true) }
	toJSON() { return { _type: 'Call', data: this } }
}

function reviver(key, bland) {
	if (typeof bland == 'object') {
		switch (bland._type) {
			case 'AccountId': return new AccountId(bland.data);
			case 'Hash': return new Hash(bland.data);
			case 'VoteThreshold': return new VoteThreshold(bland.data);
			case 'Moment': return new Moment(bland.data);
			case 'Tuple': return new Tuple(bland.data);
			case 'Proposal': return new Proposal(bland.data);
			case 'Call': return new Call(bland.data);
			case 'Balance': return new Balance(bland.data);
			case 'BlockNumber': return new BlockNumber(bland.data);
		}
	}
	return bland;
}

function deslice(input, type) {
	if (typeof input.data === 'undefined') {
		input = { data: input };
	}
	if (typeof type === 'object') {
		return type.map(t => deslice(input, t));
	}
	while (type.startsWith('T::')) {
		type = type.slice(3);
	}
	switch (type) {
		case 'Call':
		case 'Proposal': {
			let c = Calls[input.data[0]];
			let res = type === 'Call' ? new Call : new Proposal;
			res.module = c.name;
			c = c[type == 'Call' ? 'calls' : 'priv_calls'][input.data[1]];
			input.data = input.data.slice(2);
			res.name = c.name;
			res.params = c.params.map(p => ({ name: p.name, type: p.type, value: deslice(input, p.type) }));
			return res;
		}
		case 'AccountId': {
			let res = new AccountId(input.data.slice(0, 32));
			input.data = input.data.slice(32);
			return res;
		}
		case 'Hash': {
			let res = new Hash(input.data.slice(0, 32));
			input.data = input.data.slice(32);
			return res;
		}
		case 'Balance': {
			let res = leToNumber(input.data.slice(0, 16));
			input.data = input.data.slice(16);
			return new Balance(res);
		}
		case 'BlockNumber': {
			let res = leToNumber(input.data.slice(0, 8));
			input.data = input.data.slice(8);
			return new BlockNumber(res);
		}
		case 'Moment': {
			let n = leToNumber(input.data.slice(0, 8));
			input.data = input.data.slice(8);
			return new Moment(n);
		}
		case 'VoteThreshold': {
			const VOTE_THRESHOLD = ['SuperMajorityApprove', 'NotSuperMajorityAgainst', 'SimpleMajority'];
			let res = new VoteThreshold(VOTE_THRESHOLD[input.data[0]]);
			input.data = input.data.slice(1);
			return res;
		}
		case 'u32':
		case 'VoteIndex':
		case 'PropIndex':
		case 'ReferendumIndex': {
			let res = leToNumber(input.data.slice(0, 4));
			input.data = input.data.slice(4);
			return res;
		}
		case 'bool': {
			let res = !!input.data[0];
			input.data = input.data.slice(1);
			return res;
		}
		case 'KeyValue': {
			return deslice(input, '(Vec<u8>, Vec<u8>)');
		}
		case 'Vec<bool>': {
			let size = leToNumber(input.data.slice(0, 4));
			input.data = input.data.slice(4);
			let res = [...input.data.slice(0, size)].map(a => !!a);
			input.data = input.data.slice(size);
			return res;
		}
		case 'Vec<u8>': {
			let size = leToNumber(input.data.slice(0, 4));
			input.data = input.data.slice(4);
			let res = input.data.slice(0, size);
			input.data = input.data.slice(size);
			return res;
		}
		default: {
			let v = type.match(/^Vec<(.*)>$/);
			if (v) {
				let size = leToNumber(input.data.slice(0, 4));
				input.data = input.data.slice(4);
				return [...new Array(size)].map(() => deslice(input, v[1]));
			}
			let t = type.match(/^\((.*)\)$/);
			if (t) {
				return new Tuple(...deslice(input, t[1].split(', ')));
			}
			throw 'Unknown type to deslice: ' + type;
		}
	}
}

const numberWithCommas = (x) => {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function pretty(expr) {
	if (expr === null) {
		return 'null';
	}
	if (expr instanceof VoteThreshold) {
		return 'VoteThreshold.' + expr;
	}
	if (expr instanceof Balance) {
		return numberWithCommas(expr) + ' DOT';
	}
	if (expr instanceof BlockNumber) {
		return numberWithCommas(expr);
	}
	if (expr instanceof Hash) {
		return '0x' + bytesToHex(expr);
	}
	if (expr instanceof Moment) {
		return expr.toLocaleString() + " (" + expr.number + " seconds)";
	}
	if (expr instanceof AccountId) {
		return ss58_encode(expr);
	}
	if (expr instanceof Tuple) {
		return '(' + expr.map(pretty).join(', ') + ')';
	}
	if (expr instanceof Uint8Array) {
		return '[' + bytesToHex(expr) + ']';
	}
	if (expr instanceof Array) {
		return '[' + expr.map(pretty).join(', ') + ']';
	}
	if (expr instanceof Call || expr instanceof Proposal) {
		return expr.module + '.' + expr.name + '(' + expr.params.map(p => p.name + '=' + pretty(p.value)).join(', ') + ')';
	}
	if (typeof expr === 'object') {
		return '{' + Object.keys(expr).map(k => k + ': ' + pretty(expr[k])).join(', ') + '}';
	}
	return '' + expr;
}

function req(method, params = []) {
	try {
		return fetch("http://127.0.0.1:9933/", {
			method: 'POST',
			mode: 'cors',
			body: JSON.stringify({
				"jsonrpc": "2.0",
				"id": "1",
				"method": method,
				"params": params
			}),
			headers: new Headers({ 'Content-Type': 'application/json' })
		}).then(r => r.json()).then(r => r.result || null);
	}
	catch (e) {
		return new Promise((resolve, reject) => resolve());
	}
}

function balanceOf(pubkey) {
	let loc = new Uint8Array([...stringToBytes('sta:bal:'), ...hexToBytes(pubkey)]);
	return req('state_getStorage', ['0x' + toLEHex(XXH.h64(loc.buffer, 0), 8) + toLEHex(XXH.h64(loc.buffer, 1), 8)])
		.then(r => r ? leHexToNumber(r.substr(2)) : 0);
}

function indexOf(pubkey) {
	let loc = new Uint8Array([...stringToBytes('sys:non'), ...hexToBytes(pubkey)]);
	return req('state_getStorage', ['0x' + toLEHex(XXH.h64(loc.buffer, 0), 8) + toLEHex(XXH.h64(loc.buffer, 1), 8)])
		.then(r => r ? leHexToNumber(r.substr(2)) : 0);
}

function stringToSeed(s) {
	var data = new Uint8Array(32);
	data.fill(32);
	for (var i = 0; i < s.length; i++){
		data[i] = s.charCodeAt(i);
	}
	return data;
}
function stringToBytes(s) {
	var data = new Uint8Array(s.length);
	for (var i = 0; i < s.length; i++){
		data[i] = s.charCodeAt(i);
	}
	return data;
}
function hexToBytes(str) {
	if (!str) {
		return new Uint8Array();
	}
	var a = [];
	for (var i = str.startsWith('0x') ? 2 : 0, len = str.length; i < len; i += 2) {
		a.push(parseInt(str.substr(i, 2), 16));
	}

	return new Uint8Array(a);
}
function bytesToHex(uint8arr) {
	if (!uint8arr) {
		return '';
	}
	var hexStr = '';
	for (var i = 0; i < uint8arr.length; i++) {
		var hex = (uint8arr[i] & 0xff).toString(16);
		hex = (hex.length === 1) ? '0' + hex : hex;
		hexStr += hex;
	}

	return hexStr.toLowerCase();
}
function toLEHex(val, bytes) {
	let be = ('00'.repeat(bytes) + val.toString(16)).slice(-bytes * 2);
	var le = '';
	for (var i = 0; i < be.length; i += 2) {
		le = be.substr(i, 2) + le;
	}
	return le;
}
function leHexToNumber(le) {
	var be = '';
	for (var i = le.startsWith('0x') ? 2 : 0; i < le.length; i += 2) {
		be = le.substr(i, 2) + be;
	}
	return Number.parseInt(be, 16);
}

function toLE(val, bytes) {
	let r = new Uint8Array(bytes);
	for (var o = 0; val > 0; ++o) {
		r[o] = val % 256;
		val /= 256;
	}
	return r;
}

function leToNumber(le) {
	let r = 0;
	let a = 1;
	le.forEach(x => { r += x * a; a *= 256; });
	return r;
}

String.prototype.chunks = function(size) {
	var r = [];
	var count = this.length / size;
	for (var i = 0; i < count; ++i) {
		r.push(this.substr(i * size, size));
	}
	return r;
}

String.prototype.mapChunks = function(sizes, f) {
	var r = [];
	var count = this.length / sizes.reduce((a, b) => a + b, 0);
	var offset = 0;
	for (var i = 0; i < count; ++i) {
		r.push(f(sizes.map(s => {
			let r = this.substr(offset, s);
			offset += s;
			return r;
		})));
	}
	return r;
}

Uint8Array.prototype.mapChunks = function(sizes, f) {
	var r = [];
	var count = this.length / sizes.reduce((a, b) => a + b, 0);
	var offset = 0;
	for (var i = 0; i < count; ++i) {
		r.push(f(sizes.map(s => {
			offset += s;
			return this.slice(offset - s, offset);
		})));
	}
	return r;
}

function tally(x) {
	var r = [0, 0];
	x.forEach(v => r[v ? 1 : 0]++);
	return {aye: r[1], nay: r[0]};
}

function tallyAmounts(x) {
	var r = [0, 0];
	x.forEach(([v, b]) => r[v ? 1 : 0] += b);
	return {aye: r[1], nay: r[0]};
}

class Polkadot {
	constructor () {
		let head = new TransformBond(() => req('chain_getHead'), [], [new TimeBond])
		this.head = head;
		this.header = hashBond => new TransformBond(hash => req('chain_getHeader', [hash]), [hashBond], [new TimeBond]).subscriptable();
		this.height = this.header(this.head).map(h => new BlockNumber(h.number));
		this.storage = locBond => new TransformBond(loc => req('state_getStorage', ['0x' + toLEHex(XXH.h64(loc.buffer, 0), 8) + toLEHex(XXH.h64(loc.buffer, 1), 8)]), [locBond], [head]);
		this.code = new TransformBond(() => req('state_getStorage', ['0x' + bytesToHex(stringToBytes(":code"))]).then(hexToBytes), [], [head]);
		this.codeHash = new TransformBond(() => req('state_getStorageHash', ['0x' + bytesToHex(stringToBytes(":code"))]).then(hexToBytes), [], [head]);
		this.codeSize = new TransformBond(() => req('state_getStorageSize', ['0x' + bytesToHex(stringToBytes(":code"))]), [], [head]);
		this.authorityCount = new TransformBond(() => req('state_getStorage', ['0x' + bytesToHex(stringToBytes(":auth:len"))]).then(leHexToNumber), [], [head]);
		this.authorities = this.authorityCount.map(
			n => [...Array(n)].map((_, i) =>
				req('state_getStorage', ['0x' + bytesToHex(stringToBytes(":auth:")) + bytesToHex(toLE(i, 4))])
					.then(r => r ? deslice(hexToBytes(r), 'AccountId') : null)
			), 2);
		function storageMap(prefix, formatResult = r => r, formatArg = x => x, postApply = x => x) {
			let prefixBytes = stringToBytes(prefix);
			return argBond => postApply((new TransformBond(
				arg => {
					let loc = new Uint8Array([...prefixBytes, ...formatArg(arg)]);
					return req('state_getStorage', ['0x' + toLEHex(XXH.h64(loc.buffer, 0), 8) + toLEHex(XXH.h64(loc.buffer, 1), 8)]).then(r => formatResult(r && hexToBytes(r), arg));
				},
				[argBond],
				[head]
			)).subscriptable());
		}
		function storageValueKey(stringLocation) {
			let loc = stringToBytes(stringLocation);
			return '0x' + toLEHex(XXH.h64(loc.buffer, 0), 8) + toLEHex(XXH.h64(loc.buffer, 1), 8);
		}
		function storageValue(stringLocation, formatResult = r => r) {
			return (new TransformBond(
				arg => {
					return req('state_getStorage', [storageValueKey(stringLocation)]).then(r => formatResult(r && hexToBytes(r), arg))
				},
				[],
				[head]
			)).subscriptable();
		}

		this.system = {
			index: storageMap('sys:non', r => r ? leToNumber(r) : 0)
		};

		this.timestamp = {
			blockPeriod: storageValue('tim:block_period', r => deslice(r, 'T::Moment')),
			now: storageValue('tim:val', r => deslice(r, 'T::Moment'))
		}

		this.session = {
			validators: storageValue('ses:val', r => deslice(r, 'Vec<T::AccountId>')),
			length: storageValue('ses:len', r => deslice(r, 'T::BlockNumber')),
			currentIndex: storageValue('ses:ind', r => deslice(r, 'T::BlockNumber')),
			currentStart: storageValue('ses:current_start', r => deslice(r, 'T::Moment')),
			brokenPercentLate: storageValue('ses:broken_percent_late', r => deslice(r, 'u32')),
			lastLengthChange: storageValue('ses:llc', r => r ? deslice(r, 'T::BlockNumber') : 0)
		};
		this.session.blocksRemaining = Bond
			.all([this.height, this.session.lastLengthChange, this.session.length])
			.map(([h, c, l]) => {
				c = (c || 0);
				return l - (h - c - 1 + l) % l;
			});
		this.session.percentLate = Bond
			.all([
				this.timestamp.blockPeriod,
				this.timestamp.now,
				this.session.blocksRemaining,
				this.session.length,
				this.session.currentStart,
			]).map(([p, n, r, l, s]) =>
				r == l || r == 0
					? 0
					: (n.number + p.number * (r - 1) - s.number) / (p.number * l) * 100 - 100
			);

		this.staking = {
			freeBalance: storageMap('sta:bal:', r => r ? deslice(r, 'T::Balance') : new Balance(0)),
			reservedBalance: storageMap('sta:lbo:', r => r ? deslice(r, 'T::Balance') : new Balance(0)),
			currentEra: storageValue('sta:era', r => deslice(r, 'T::BlockNumber')),
			sessionsPerEra: storageValue('sta:spe', r => deslice(r, 'T::BlockNumber')),
			intentions: storageValue('sta:wil:', r => r ? deslice(r, 'Vec<AccountId>') : []),
			lastEraLengthChange: storageValue('sta:lec', r => r ? deslice(r, 'T::BlockNumber') : 0),
			validatorCount: storageValue('sta:vac', r => r ? deslice(r, 'u32') : 0),
			nominatorsFor: storageMap('sta:nominators_for', r => r ? deslice(r, 'Vec<T::AccountId>') : []),
			currentNominatorsFor: storageMap('sta:current_nominators_for', r => r ? deslice(r, 'Vec<T::AccountId>') : [])
		};
		this.staking.currentNominatedBalance = who => this.staking.currentNominatorsFor(who)
			.map(ns => ns.map(n => this.staking.votingBalance(n)), 2)
			.map(bs => new Balance(bs.reduce((a, b) => a + b, 0)))
		this.staking.nominatedBalance = who => this.staking.nominatorsFor(who)
			.map(ns => ns.map(n => this.staking.votingBalance(n)), 2)
			.map(bs => new Balance(bs.reduce((a, b) => a + b, 0)))
		this.staking.balance = who => Bond
			.all([this.staking.freeBalance(who), this.staking.reservedBalance(who)])
			.map(([f, r]) => new Balance(f + r));
		this.staking.votingBalance = this.staking.balance;
		this.staking.stakingBalance = who => Bond
			.all([this.staking.votingBalance(who), this.staking.nominatedBalance(who)])
			.map(([f, r]) => new Balance(f + r));
		this.staking.currentStakingBalance = who => Bond
			.all([this.staking.votingBalance(who), this.staking.currentNominatedBalance(who)])
			.map(([f, r]) => new Balance(f + r));
			
		this.staking.eraLength = Bond
			.all([
				this.staking.sessionsPerEra,
				this.session.length
			]).map(([a, b]) => a * b);
		this.staking.nextValidators = Bond
			.all([
				this.staking.intentions.map(as => as.map(a => ({
					who: a,
					balance: this.staking.stakingBalance(a)
				})), 2),
				this.staking.validatorCount
			]).map(([as, vc]) => as.sort((a, b) => b.balance - a.balance).slice(0, vc));
		this.staking.eraBlocksRemaining = Bond
			.all([
				this.staking.sessionsPerEra,
				this.session.length,
				this.session.currentIndex,
				this.session.blocksRemaining
			]).map(([spe, sl, si, br]) => {
				return br + sl * (spe - 1 - ((si - 1 + spe) % spe));
			});
		
		// TODO: if era ends early, we need to reset era length change...
/*		this.staking.currentSession = Bond
			.all([this.session.currentIndex, this.session.length])
			.map(([r, i, l]) =>
				r + 
			);
*/			

		{
			let referendumCount = storageValue('dem:rco', r => r ? leToNumber(r) : 0);
			let nextTally = storageValue('dem:nxt', r => r ? leToNumber(r) : 0);
			let referendumVoters = storageMap('dem:vtr:', r => r ? deslice(r, 'Vec<AccountId>') : [], i => toLE(i, 4));
			let referendumVoteOf = storageMap('dem:vot:', r => r && !!r[0], i => new Uint8Array([...toLE(i[0], 4), ...i[1]]));
			let referendumInfoOf = storageMap('dem:pro:', (r, index) => {
				if (r == null) return null;
				let [ends, proposal, voteThreshold] = deslice(r, ['BlockNumber', 'Proposal', 'VoteThreshold']);
				let votes = referendumVoters(index).map(r => r || []).mapEach(v => Bond.all([referendumVoteOf([index, v]), this.staking.balance(v)])).map(tallyAmounts);
				return { index, ends, proposal, voteThreshold, votes };
			}, i => toLE(i, 4), x => x.map(x=>x, 1));
			let depositOf = storageMap('dem:dep:', r => {
				if (r) {
					let i = deslice(r, '(T::Balance, Vec<T::AccountId>)');
					return { bond: i[0], sponsors: i[1] };
				} else {
					return null;
				}
			}, i => toLE(i, 4));

			this.democracy = {
				proposed: storageValue('dem:pub', r => r ? deslice(r, 'Vec<(PropIndex, Proposal, AccountId)>').map(i => {
					let d = depositOf(i[0]);
					return { index: i[0], proposal: i[1], proposer: i[2], sponsors: d.map(v => v ? v.sponsors : null), bond: d.map(v => v ? v.bond : null) };
				}) : []).map(x=>x, 2),
				active: Bond.all([nextTally, referendumCount]).map(([f, t]) => [...Array(t - f)].map((_, i) => referendumInfoOf(f + i)), 1),
				launchPeriod: storageValue('dem:lau', r => deslice(r, 'T::BlockNumber')),
				minimumDeposit: storageValue('dem:min', r => deslice(r, 'T::Balance')),
				votingPeriod: storageValue('dem:per', r => deslice(r, 'T::BlockNumber')),
				depositOf
			};
		}

		{
			let candidates = storageValue('cou:vrs', r => r ? deslice(r, 'Vec<T::AccountId>') : []);
			let registerInfoOf = storageMap('cou:reg', r => { let i = deslice(r, '(VoteIndex, u32)'); return { since: i[0], slot: i[1] }; });
			this.council = {
				candidacyBond: storageValue('cou:cbo', r => deslice(r, 'T::Balance')),
				votingBond: storageValue('cou:vbo', r => deslice(r, 'T::Balance')),
				presentSlashPerVoter: storageValue('cou:pss', r => deslice(r, 'T::Balance')),
				carryCount: storageValue('cou:cco', r => deslice(r, 'u32')),
				presentationDuration: storageValue('cou:pdu', r => deslice(r, 'T::BlockNumber')),
				inactiveGracePeriod: storageValue('cou:vgp', r => deslice(r, 'VoteIndex')),
				votingPeriod: storageValue('cou:per', r => deslice(r, 'T::BlockNumber')),
				termDuration: storageValue('cou:trm', r => deslice(r, 'T::BlockNumber')),
				desiredSeats: storageValue('cou:sts', r => deslice(r, 'u32')),
				voteCount: storageValue('cou:vco', r => r ? deslice(r, 'VoteIndex') : 0),
				active: storageValue('cou:act', r => r ? deslice(r, 'Vec<(T::AccountId, T::BlockNumber)>').map(i => ({ id: i[0], expires: i[1] })) : []),

				voters: storageValue('cou:vrs', r => r ? deslice(r, 'Vec<T::AccountId>') : []),
				candidates: candidates.mapEach((id, slot) => id.some(x => x) ? { slot, id, since: registerInfoOf(id).since } : null).map(l => l.filter(c => c)),
				candidateInfoOf: registerInfoOf
			};
		}

		{
			let proposalVoters = storageMap('cov:voters:', r => r && deslice(r, 'Vec<AccountId>'));
			let proposalVoteOf = storageMap('cov:vote:', r => r && !!r[0], i => new Uint8Array([...i[0], ...i[1]]));
			this.councilVoting = {
				cooloffPeriod: storageValue('cov:cooloff', r => deslice(r, 'BlockNumber')),
				votingPeriod: storageValue('cov:period', r => deslice(r, 'BlockNumber')),
				proposals: storageValue('cov:prs', r => deslice(r, 'Vec<(BlockNumber, Hash)>').map(i => ({
					ends: i[0],
					hash: i[1],
					proposal: storageMap('cov:pro', r => r && deslice(r, 'Proposal'))(i[1]),
					votes: proposalVoters(i[1]).map(r => r || []).mapEach(v => proposalVoteOf([i[1], v])).map(tally)
				}))).map(x=>x, 2)
			};
		}

		if (typeof window !== 'undefined') {
			window.polkadot = this;
			window.req = req;
			window.ss58_encode = ss58_encode;
			window.ss58_decode = ss58_decode;
			window.bytesToHex = bytesToHex;
			window.stringToBytes = stringToBytes;
			window.hexToBytes = hexToBytes;
			window.that = this;
			window.storageMap = storageMap;
			window.storageValue = storageValue;
			window.storageValueKey = storageValueKey;
			window.toLE = toLE;
			window.leToNumber = leToNumber;
			window.stringify = stringify;
			window.pretty = pretty;
			window.deslice = deslice;
		}
	}
}

module.exports = { ss58_decode, ss58_encode, Calls, pretty, req, balanceOf, indexOf,
	stringToSeed, stringToBytes, hexToBytes, bytesToHex, toLEHex, leHexToNumber, toLE,
	leToNumber, Polkadot, reviver
}