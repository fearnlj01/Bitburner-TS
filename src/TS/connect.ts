import { NS } from '@ns'
import { ServerData } from '@types'
import { getVisibleHostsWithPaths, sendTerminalCommand } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	const serverPathList = getVisibleHostsWithPaths(ns)
	let outputCmd = "home;"

	for (const servers of serverPathList) {
		if (servers[0] == ns.args[0]) {
			const server = servers[0]
			const path = servers[1]
			for (const servers of path) {
				outputCmd += ` connect ${servers};`
			}
			outputCmd += ` connect ${server};`
		}
	}
	sendTerminalCommand(outputCmd)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : ServerData, args : string[]) : string[] {
	return [...data.servers]
}