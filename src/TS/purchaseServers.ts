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
			const maxRam = Math.max(...purchasedServers.map(server => ns.getServer(server).maxRam))
			if (ram > maxRam) {
				await deletePurchasedServers(ns, purchasedServers)
				await buyServer(ns, ram, 0)
			} else {
				ns.clearLog()
				ns.print(`INFO\nCurrent max:${ns.getServer(purchasedServers[0]).maxRam}\nCan buy ${ns.nFormat(getMaxRamBuyable(ns)[0] * 1024**3,'0.00ib')} for: ${ns.nFormat(getMaxRamBuyable(ns)[1],'$ 0.00a')}`)
			}
		}

		if (ram == ns.getPurchasedServerMaxRam()) ns.exit()

		await sleep(30e3)
	}
}