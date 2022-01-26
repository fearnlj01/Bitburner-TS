import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	const targetServer = ns.args[0] as string
	while (true) await ns.grow(targetServer)
}