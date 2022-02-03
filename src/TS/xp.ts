import { NS } from '@ns'
import { CONSTANTS, getHackableHosts, primeServer, sleep, updateRemoteScripts } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('ALL')
	ns.clearLog()

	ns.print('priming')
	await primeServer(ns,CONSTANTS.xpServer)
	ns.print('primed')

	while (true) {
		const serverList = ['home', ...getHackableHosts(ns)]
		for (const server of serverList) {
			const serverData = ns.getServer(server)
			const freeRam = (server == 'home') ? ((serverData.maxRam * 0.8) - serverData.ramUsed) : serverData.maxRam - serverData.ramUsed
			const threadCount = Math.floor(freeRam / 1.75)

			await updateRemoteScripts(ns, server)
			if (threadCount > 0) ns.exec(CONSTANTS.scripts.maxGrow, server, threadCount, CONSTANTS.xpServer, performance.now())
		}
		await sleep(10e3)
	}
}