import { NS } from '@ns'
import { CorporationInformation } from '/TS/classes'

export async function main(ns : NS) : Promise<void> {
	ns.clearLog()
	while (true) {
		const corp = new CorporationInformation(ns)
		for (const division of corp.divisions) {
			for (const office of division.offices) {
				if (await office.hireEmployees()) await office.setJobs()
			}
		}
	}
}