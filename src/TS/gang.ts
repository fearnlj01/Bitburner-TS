import { NS } from '@ns'
import { ascendGangMember, getEquipmentAvailable, sleep, uuidv4 } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	const noLogFuncs = ['gang.canRecruitMember','gang.getMemberNames','gang.purchaseEquipment']
	noLogFuncs.forEach((command) => ns.disableLog(command))
	ns.clearLog()

	while (true) {
		if (ns.gang.canRecruitMember()) ns.gang.recruitMember(uuidv4())

		const gangMembers = ns.gang.getMemberNames()

		for (const member of gangMembers) {
			const gangInfo = ns.gang.getGangInformation()
			const currMember = ns.gang.getMemberInformation(member)
			const currCombatMax = Math.max(currMember.str / currMember.str_asc_mult, currMember.def / currMember.def_asc_mult, currMember.dex / currMember.dex_asc_mult, currMember.agi / currMember.agi_asc_mult)
			const combatMax = Math.max(currMember.str, currMember.def, currMember.dex, currMember.agi)

			if (currCombatMax < 200) {
				(currMember.task == 'Train Combat') || ns.gang.setMemberTask(currMember.name, 'Train Combat')
			} else if (gangInfo.moneyGainRate < 1000) {
				if (combatMax > 250) {
					(currMember.task == 'Human Trafficking') || ns.gang.setMemberTask(currMember.name, 'Human Trafficking')
				} else {
					(currMember.task == 'Mug People') || ns.gang.setMemberTask(currMember.name, 'Mug People')
				}
			// } else if (gangInfo.wantedLevelGainRate > 0) {
			// 	(currMember.task == 'Vigilante Justice') || ns.gang.setMemberTask(currMember.name, 'Vigilante Justice')
			} else if (currMember.task != 'Territory Warfare') {
				ns.gang.setMemberTask(currMember.name, 'Territory Warfare')
			}

			if (!ascendGangMember(ns, currMember)) getEquipmentAvailable(ns, currMember).forEach((item) => ns.gang.purchaseEquipment(member, item))

			await sleep(2000)
		}
	}
}