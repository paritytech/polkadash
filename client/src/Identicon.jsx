import React from 'react';
import {ReactiveComponent} from 'oo7-react';
import {ss58decode} from './polkadot';
import {blake2b} from 'blakejs';

const zero = blake2b(new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]))

export default class Identicon extends ReactiveComponent {
	constructor () {
		super(["id"])
	}
	render () {
		let s = this.props.size
		let c = s / 2
		let r = this.props.sixPoint ? s / 2 / 8 * 5 : (s / 2 / 4 * 3)
		let rroot3o2 = r * Math.sqrt(3) / 2
		let ro2 = r / 2
		let rroot3o4 = r * Math.sqrt(3) / 4
		let ro4 = r / 4
		let r3o4 = r * 3 / 4
		if (false) {
			let z = s / 8
			return (<svg width={s} height={s}>
				<circle cx={s / 2} cy={s / 2} r={s / 2} fill="#fff"/>
				<circle cx={c} cy={c} r={z} fill="red"/>
				<circle cx={c - r} cy={c} r={z} fill="red"/>
				<circle cx={c - ro2} cy={c - rroot3o2} r={z} fill="red"/>
				<circle cx={c + ro2} cy={c - rroot3o2} r={z} fill="red"/>
				<circle cx={c + r} cy={c} r={z} fill="red"/>
				<circle cx={c + ro2} cy={c + rroot3o2} r={z} fill="red"/>
				<circle cx={c - ro2} cy={c + rroot3o2} r={z} fill="red"/>
			</svg>)
		} else {
			let z = s / 64 * 5
			let schema = {
				solid: { freq: 1, colors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
				asterisk: { freq: 4, colors: [0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0] },
				cube: { freq: 16, colors: [0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 5] },
				quazar: { freq: 16, colors: [1, 2, 3, 1, 2, 4, 5, 5, 4, 1, 2, 3, 1, 2, 4, 5, 5, 4, 0] },
				flower: { freq: 16, colors: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3] },
				adidas: { freq: 16, colors: [0, 1, 0, 0, 1, 1, 2, 3, 2, 2, 3, 3, 4, 5, 4, 4, 5, 5, 6] },
				cyclic: { freq: 32, colors: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6] },
				vmirror: { freq: 128, colors: [0, 1, 2, 3, 4, 5, 3, 4, 2, 0, 1, 6, 7, 8, 9, 7, 8, 6, 10] },
				hmirror: { freq: 128, colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 8, 6, 7, 5, 3, 4, 2, 11] }
			}

			let total = Object.keys(schema).map(k => schema[k].freq).reduce((a, b) => a + b)
			let findScheme = d => {
				let cum = 0
				let ks = Object.keys(schema)
				for (let i in ks) {
					let n = schema[ks[i]].freq
					cum += n;
					if (d < cum) {
						return schema[ks[i]]
					}
				}
				throw "Impossible"
			}
			
			if (!this.state.id) {
				return <svg width={s} height={s}/>
			}
			let id = typeof this.state.id == 'string' ? ss58decode(this.state.id) : this.state.id
			id = Array.from(blake2b(id)).map((x, i) => (x + 256 - zero[i]) % 256)

			let sat = (Math.floor(id[29] * 70 / 256 + 26) % 80) + 30
			let d = Math.floor((id[30] + id[31] * 256) % total)
			let scheme = findScheme(d)
			let palette = Array.from(id).map((x, i) => {
				let b = (x + i * 58) % 256
				if (b == 0) {
					return '#444'
				}
				if (b == 255) {
					return 'transparent'
				}
				let h = Math.floor(b % 64 * 360 / 64)
				let l = [53, 15, 35, 75][Math.floor(b / 64)]
				return `hsl(${h}, ${sat}%, ${l}%)`
			})

			let rot = (id[28] % 6) * 3

			let colors = scheme.colors.map((_, i) => palette[scheme.colors[i < 18 ? (i + rot) % 18 : 18]])

			let i = 0;
			return (<svg width={s} height={s}>
				<circle cx={s / 2} cy={s / 2} r={s / 2} fill="#eee"/>
				<circle cx={c} cy={c - r} r={z} fill={colors[i++]}/>
				<circle cx={c} cy={c - ro2} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o4} cy={c - r3o4} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o2} cy={c - ro2} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o4} cy={c - ro4} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o2} cy={c} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o2} cy={c + ro2} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o4} cy={c + ro4} r={z} fill={colors[i++]}/>
				<circle cx={c - rroot3o4} cy={c + r3o4} r={z} fill={colors[i++]}/>
				<circle cx={c} cy={c + r} r={z} fill={colors[i++]}/>
				<circle cx={c} cy={c + ro2} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o4} cy={c + r3o4} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o2} cy={c + ro2} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o4} cy={c + ro4} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o2} cy={c} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o2} cy={c - ro2} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o4} cy={c - ro4} r={z} fill={colors[i++]}/>
				<circle cx={c + rroot3o4} cy={c - r3o4} r={z} fill={colors[i++]}/>
				<circle cx={c} cy={c} r={z} fill={colors[i++]}/>
			</svg>)
		}
	}
}
