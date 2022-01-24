import { NS } from '@ns'
import { ServerData } from '@types'
import { getHackableHosts, getVisibleHostsWithPaths } from '/TS/functions';

export async function main(ns : NS) : Promise<void> {
	const purchasedServers : string[] = [];
	const outputArray = [];
	let result = 'INFO\n'

	for (let i = 0; i < 25; i++) purchasedServers.push(`pserv-${i}`)
	const serverListHackable = getHackableHosts(ns).filter((a) => !purchasedServers.includes(a))
	const serverList = getVisibleHostsWithPaths(ns).filter(([a,_b]) => !purchasedServers.includes(a))

	for (const server of serverList) {
		if (!ns.args.length) {
			if (serverListHackable.includes(server[0])) {
				outputArray.push({ 'server' : server[0], 'path' : server[1].join(', ')})
			}
		} else {
			outputArray.push({ 'server' : server[0], 'path' : server[1].join(', ')})
		}
	}
	for (const stringObject of outputArray) result += stringObject.server.padEnd(18,' ') + (stringObject.path.length ? ` || ${stringObject.path}\n` : `\n`)
	ns.tprintf(result)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : ServerData, args : string[]) : string[] {
	return [...data.servers]
}