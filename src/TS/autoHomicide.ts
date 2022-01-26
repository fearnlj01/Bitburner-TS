import { NS2 } from '@types'
import { sleep } from '/TS/functions'

export async function main(ns : NS2) : Promise<void> {
	ns.clearLog()
	ns.tail()
	if (ns.heart.break() <= -54e3) {
		while (true) {
			while (ns.isBusy()) await sleep(0)
			await sleep(ns.commitCrime('Larceny'))
		}
	}
	while (ns.heart.break() > -54e3) {
		while (ns.isBusy()) await sleep(0)
		await sleep(ns.commitCrime('homicide'))
		ns.print(`INFO\nKarma: ${-ns.heart.break()}\n${Math.ceil((54e3 + ns.heart.break())/3)} more victims required`)
	}
	ns.joinFaction('Slum Snakes')
}