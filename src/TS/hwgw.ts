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
		const targetServerInfo = ns.getServer(optimalServer)

		ns.print(`INFO\nTargeting ${optimalServer}\nMin sec: ${targetServerInfo.minDifficulty}\nMax money: ${ns.nFormat(targetServerInfo.moneyMax,'$ 0.00a')}`)

		await primeServer(ns, optimalServer)

		ns.print(`SUCCESS\nTarget primed, starting batch`)

		while (i < cyclesToRePrime) {
			const serverList = ["home", ...getHackableHosts(ns)]

			for (const server of serverList) {
				await updateRemoteScripts(ns, server)
				runHWGWCycle(ns, server, optimalServer, delayPeriod)
				await sleep(delayPeriod)
			}
			++i
		}
	}
}