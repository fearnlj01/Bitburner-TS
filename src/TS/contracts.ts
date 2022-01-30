import { NS } from '@ns'
import { solveContracts } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	const logDisable = ['disableLog','scan','codingcontract.attempt']
	logDisable.forEach(a => ns.disableLog(a))
	ns.clearLog()
	ns.tail()

	solveContracts(ns)
}