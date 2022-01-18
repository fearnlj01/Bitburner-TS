import { NS } from '@ns'
import { CONSTANTS, getHackableHosts, primeServer, sleep, updateRemoteScripts } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('ALL')
	ns.clearLog()

	ns.print('priming')
	await primeServer(ns,'joesguns')
	ns.print('primed')

	while (true) {
		const serverList = ['home', ...getHackableHosts(ns)]
		for (const server of serverList) {
			const serverData = ns.getServer(server)
			const freeRam = serverData.maxRam - serverData.ramUsed
			const threadCount = Math.floor(freeRam / 1.75)

			await updateRemoteScripts(ns, server)
			if (threadCount > 0) ns.exec(CONSTANTS.scripts.grow, server, threadCount, CONSTANTS.xpServer, performance.now())
		}
		await sleep(20)
	}
}