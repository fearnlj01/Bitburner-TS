import { NS } from '@ns'
import { ascend } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	await ascend(ns)
	ns.tprintf("SUCCESS\t\tREADY TO CONTINUE")
}