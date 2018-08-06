import React from 'react';
import {ReactiveComponent} from 'oo7-react';

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
			// solid    2   1
			// flower   4   4
			// asterisc 7   4
			// adidas   7   7
			// 3cyclic  7   7
			// hmirror 11  11
			// vmirror 12  12
			// --------------
			//             46
			let schema = {
				solid: 1,
				flower: 4,
				asterisk: 4,
				adidas: 7,
				"3cyclic": 7,
				hmirror: 11,
				vmirror: 12
			}
			let findScheme = d => {
				let cum = 0
				let ks = Object.keys(schema)
				for (let i in ks) {
					let n = schema[ks[i]]
					cum += n;
					if (d < cum) {
						return ks[i]
					}
				}
				throw "Invalid"
			}
			
			let id = this.state.id
			if (!id) {
				return <svg width={s} height={s}/>
			}
			let sat = id[29] * 80 / 256 + 20
			let d = Math.floor((id[30] + id[31] * 256) * 46 / 65536)
			let type = findScheme(d)
			let palette = Array.from(id).map(b => {
				if (b == 0) {
					return 'transparent'
				}
				let h = b % 64 * 360 / 64
				let l = b / 64 * 100 / 4
				return `hsl(${h}, ${sat}%, ${l}%)`
			})

			let scheme = { type, palette }

			let colors = (() => { switch (scheme.type) {
				case 'solid': return [
					scheme.palette[0], scheme.palette[0], scheme.palette[0],
					scheme.palette[0], scheme.palette[0], scheme.palette[0],
					scheme.palette[0], scheme.palette[0], scheme.palette[0],
					scheme.palette[0], scheme.palette[0], scheme.palette[0],
					scheme.palette[0], scheme.palette[0], scheme.palette[0],
					scheme.palette[0], scheme.palette[0], scheme.palette[0],
					scheme.palette[1]
				]
				case '3cyclic': return [
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[3], scheme.palette[4], scheme.palette[5],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[3], scheme.palette[4], scheme.palette[5],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[3], scheme.palette[4], scheme.palette[5],
					scheme.palette[6]
				]
				case 'flower': return [
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[3]
				]
				case 'asterisk': return [
					scheme.palette[0], scheme.palette[0], scheme.palette[1],
					scheme.palette[0], scheme.palette[0], scheme.palette[2],
					scheme.palette[0], scheme.palette[0], scheme.palette[3],
					scheme.palette[0], scheme.palette[0], scheme.palette[4],
					scheme.palette[0], scheme.palette[0], scheme.palette[5],
					scheme.palette[0], scheme.palette[0], scheme.palette[6],
					scheme.palette[0]
				]
				case 'adidas': return [
					scheme.palette[0], scheme.palette[1], scheme.palette[0],
					scheme.palette[0], scheme.palette[1], scheme.palette[1],
					scheme.palette[2], scheme.palette[3], scheme.palette[2],
					scheme.palette[2], scheme.palette[3], scheme.palette[3],
					scheme.palette[4], scheme.palette[5], scheme.palette[4],
					scheme.palette[4], scheme.palette[5], scheme.palette[5],
					scheme.palette[6]
				]
				case 'hmirror': return [
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[3], scheme.palette[4], scheme.palette[5],
					scheme.palette[3], scheme.palette[4], scheme.palette[2],
					scheme.palette[0], scheme.palette[1], scheme.palette[6],
					scheme.palette[7], scheme.palette[8], scheme.palette[9],
					scheme.palette[7], scheme.palette[8], scheme.palette[6],
					scheme.palette[10]
				]
				case 'vmirror': return [
					scheme.palette[0], scheme.palette[1], scheme.palette[2],
					scheme.palette[3], scheme.palette[4], scheme.palette[5],
					scheme.palette[6], scheme.palette[7], scheme.palette[8],
					scheme.palette[9], scheme.palette[10], scheme.palette[8],
					scheme.palette[6], scheme.palette[7], scheme.palette[5],
					scheme.palette[3], scheme.palette[4], scheme.palette[2],
					scheme.palette[11]
				]
			}})()
			let i = 0;
			return (<svg width={s} height={s}>
				<circle cx={s / 2} cy={s / 2} r={s / 2} fill="#fff"/>

				<circle cx={c - r} cy={c} r={z} fill={colors[i++]}/>
				<circle cx={c - ro2} cy={c} r={z} fill={colors[i++]}/>
				<circle cx={c - r3o4} cy={c - rroot3o4} r={z} fill={colors[i++]}/>

				<circle cx={c - ro2} cy={c - rroot3o2} r={z} fill={colors[i++]}/>
				<circle cx={c - ro4} cy={c - rroot3o4} r={z} fill={colors[i++]}/>
				<circle cx={c} cy={c - rroot3o2} r={z} fill={colors[i++]}/>

				<circle cx={c + ro2} cy={c - rroot3o2} r={z} fill={colors[i++]}/>
				<circle cx={c + ro4} cy={c - rroot3o4} r={z} fill={colors[i++]}/>
				<circle cx={c + r3o4} cy={c - rroot3o4} r={z} fill={colors[i++]}/>

				<circle cx={c + r} cy={c} r={z} fill={colors[i++]}/>
				<circle cx={c + ro2} cy={c} r={z} fill={colors[i++]}/>
				<circle cx={c + r3o4} cy={c + rroot3o4} r={z} fill={colors[i++]}/>

				<circle cx={c + ro2} cy={c + rroot3o2} r={z} fill={colors[i++]}/>
				<circle cx={c + ro4} cy={c + rroot3o4} r={z} fill={colors[i++]}/>
				<circle cx={c} cy={c + rroot3o2} r={z} fill={colors[i++]}/>

				<circle cx={c - ro2} cy={c + rroot3o2} r={z} fill={colors[i++]}/>
				<circle cx={c - ro4} cy={c + rroot3o4} r={z} fill={colors[i++]}/>
				<circle cx={c - r3o4} cy={c + rroot3o4} r={z} fill={colors[i++]}/>

				<circle cx={c} cy={c} r={z} fill={colors[i++]}/>
			</svg>)
		}
	}
}
