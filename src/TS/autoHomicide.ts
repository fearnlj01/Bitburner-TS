import { NS } from '@ns'
import { sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.clearLog()
	ns.tail()
	const query = 'button:nth-child(6)'
	if (globalThis['document'].querySelector(query)) {
		const homicide = globalThis['document'].querySelector(query)
		let counter = 0;
		while(true) {
			ns.clearLog()
			// @ts-expect-error placeholderDescription
			const karma = ns.heart.break() * -1
			ns.print(`INFO\n${++counter} Victims\nKarma: ${karma}\n${Math.ceil((46e3 - karma)/3)} more victims required`)
			// @ts-expect-error placeholderDescription
			homicide[Object.keys(homicide)[1]].onClick({ isTrusted : true })
			await sleep(300e3)
		}
	}
	
	
	ns.print(`Navigate to the crimes list to continue`)
}