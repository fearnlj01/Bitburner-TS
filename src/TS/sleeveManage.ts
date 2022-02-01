import { NS } from '@ns'
import { sleep, sleeveThings } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	while (true) {
		sleeveThings(ns)
		await sleep(10e3)
	}
}