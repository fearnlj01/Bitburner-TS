import { NS } from '@ns'
import { sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.clearLog()
	ns.tail()
	if (globalThis['document'].querySelector('button:nth-child(8)')) {
		const homicide = globalThis['document'].querySelector('button:nth-child(8)')
		while(true) {
			// @ts-expect-error placeholderDescription
			homicide[Object.keys(homicide)[1]].onClick({ isTrusted : true })
			await sleep(4005)
		}
	}
	ns.print(`Navigate to the crims list to continue`)
}