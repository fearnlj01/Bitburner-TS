import { NS } from '@ns'
import { CONSTANTS, getHackableHosts, sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	while (true) {
		const serverList = ["home",...getHackableHosts(ns)]
		for (const server of serverList) {
			const svr = ns.getServer(server)
			const threadCount = (svr.maxRam-svr.ramUsed) / 4
			if (threadCount) ns.exec(CONSTANTS.scripts.share,server,threadCount)
		}
		await sleep(100)
	}
}