import { NS2 } from '@types'
import { sleep } from '/TS/functions'

export async function main(ns : NS2) : Promise<void> {
	ns.disableLog('ALL')
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
		ns.clearLog()
		ns.print(`INFO\nKarma: ${ns.nFormat(-ns.heart.break(),'0.[0]')}\n${Math.ceil((54e3 + ns.heart.break())/3)} more victims required`)
	}

	ns.joinFaction('Slum Snakes')
	if (ns.gang.inGang()) {
		ns.gang.createGang('Slum Snakes')
		ns.spawn('/TS/gang.js')
	}
}