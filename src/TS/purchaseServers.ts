import { NS } from '@ns'
import { buyServer, deletePurchasedServers, getHackableHosts, getMaxRamBuyable, sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('ALL')

	while (true) {
		const ram = getMaxRamBuyable(ns)[0]
		const purchasedServers = getHackableHosts(ns).filter((server) => server.startsWith('pserv-'))

		if (purchasedServers.length == 0) {
			await buyServer(ns, ram, 200)
		} else {
			if (ram > ns.getServer(purchasedServers[0]).maxRam) {
				await deletePurchasedServers(ns, purchasedServers)
				await buyServer(ns, ram, 0)
			}
		}

		if (ram == ns.getPurchasedServerMaxRam()) ns.exit()

		await sleep(30e3)
	}
}