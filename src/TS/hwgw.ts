import { NS } from '@ns'
import { findOptimalHost, getHackableHosts, primeServer, runHWGWCycle, sleep, updateRemoteScripts } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('ALL')
	while (true) {
		ns.clearLog()

		const delayPeriod = 50
		const cyclesToRePrime = 250
		let i = 0

		const optimalServer = findOptimalHost(ns)
		// const optimalServer = 'n00dles'
		const targetServerInfo = ns.getServer(optimalServer)

		ns.print(`INFO\nTargeting ${optimalServer}\nMin sec: ${targetServerInfo.minDifficulty}\nMax money: ${ns.nFormat(targetServerInfo.moneyMax,'$ 0.00a')}`)

		await primeServer(ns, optimalServer)

		ns.print(`SUCCESS\nTarget primed, starting batch`)

		while (i < cyclesToRePrime) {
			const serverList = ["home", ...getHackableHosts(ns)]

			for (const server of serverList) {
				try { await updateRemoteScripts(ns, server) } catch (e) { /* empty */ }
				if (await runHWGWCycle(ns, server, optimalServer, delayPeriod)) {
					await sleep(delayPeriod)
				} else {
					await sleep(0)
				}
			}
			++i
		}
	}
}