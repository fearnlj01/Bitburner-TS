import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	const targetServer = ns.args[0] as string
	const sleepTime = ns.args[1] as number - performance.now() 
	
	ns.print(`Sleeping for ${ns.tFormat(sleepTime)}`)
	await sleep(sleepTime)
	for (let i = 0; i <= ((ns.args[0] == 'joesguns') ? 9 : 0); ++i)
		await ns.grow(targetServer)
}

function sleep(ms : number) : Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}