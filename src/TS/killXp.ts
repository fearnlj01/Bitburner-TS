import { NS } from '@ns'
import { CONSTANTS, getRunningInfo } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	getRunningInfo(ns).filter(p => p.filename == CONSTANTS.scripts.maxGrow).forEach(p => ns.kill(p.pid))
}