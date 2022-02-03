import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	let i = 0
	while (i < 6) {
		await ns.share()
		++i
	}
	ns.exit()
}