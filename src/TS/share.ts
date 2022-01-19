import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	const i = 0;
	while (i < 6) {
		await ns.share()
	}
	ns.exit()
}