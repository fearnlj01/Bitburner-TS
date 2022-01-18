import { NS } from '@ns'
import { sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.clearLog()
	ns.tail()
	if (globalThis['document'].querySelector('button:nth-child(8)')) {
		const homicide = globalThis['document'].querySelector('button:nth-child(8)')
		let counter = 0;
		while(true) {
			// @ts-expect-error placeholderDescription
			ns.clearLog()
			const karma = ns.heart.break() * -1
			ns.print(`INFO\n${++counter} Victims\nKaram: ${karma}\n${Math.ceil((46e3 - karma)/3)} more victims required`)
			homicide[Object.keys(homicide)[1]].onClick({ isTrusted : true })
			await sleep(3000)
		}
	}
	
	ns.print(`Navigate to the crimes list to continue`)
}