import { NS } from '@ns'
import { getHackableHosts, getVisibleHostsWithPaths } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('scan')
	ns.disableLog('getHackingLevel')
	ns.clearLog()

	const serverPaths = getVisibleHostsWithPaths(ns)
	const getFilteredHosts = (ns : NS) => getHackableHosts(ns).filter(host => (
		!(ns.getServer(host).backdoorInstalled) &&
		!(ns.getServer(host).purchasedByPlayer) &&
		host != 'home')
	)

	while (getFilteredHosts(ns).length > 0) {
		const serverList = getFilteredHosts(ns).sort((a, b) =>  ns.getHackTime(a) - ns.getHackTime(b))
		for (const server of serverList) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const pathList = serverPaths.find(([host, _path]) => host == server) ?? ['home',['home']]
			ns.connect('home')
			for (const serv of pathList[1]) {
				ns.connect(serv)
			}
			ns.connect(server)
			ns.print(`${ns.tFormat(getFilteredHosts(ns).reduce((prev,host) => prev + ns.getHackTime(host),0))} to go`)
			await ns.installBackdoor()
		}
	}
	ns.connect('home')
}