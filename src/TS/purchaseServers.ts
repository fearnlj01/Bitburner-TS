import { NS } from '@ns'
import { buyServer, deletePurchasedServers, getHackableHosts, getMaxRamBuyable, getServerCostArray, sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('ALL')
	ns.tail()
	while (true) {
		const ram = getMaxRamBuyable(ns)[0]
		const purchasedServers = getHackableHosts(ns).filter((server) => server.startsWith('pserv-'))

		if (purchasedServers.length == 0) {
			await buyServer(ns, ram, 200)
		} else {
			const maxRam = Math.max(...purchasedServers.map(server => ns.getServer(server).maxRam))
			if (ram > maxRam) {
				await deletePurchasedServers(ns, purchasedServers)
				await buyServer(ns, ram, 0)
			} else {
				ns.clearLog()
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const nextRam = getServerCostArray(ns).filter(([ram, cost]) => ram > ns.getServer(purchasedServers[0]).maxRam).shift() ?? [0,0]
				ns.print(`INFO\nNext step:${ns.nFormat(nextRam[0] * 1024**3,'0.00ib')} for ${ns.nFormat(nextRam[1],'$0.00a')}\nCan buy ${ns.nFormat(getMaxRamBuyable(ns)[0] * 1024**3,'0.00ib')} for: ${ns.nFormat(getMaxRamBuyable(ns)[1],'$ 0.00a')}`)
			}
		}

		if (ram == ns.getPurchasedServerMaxRam()) ns.exit()

		await sleep(30e3)
	}
}