import { NS } from '@ns'
import { uuidv4, sleep } from '/TS/functions'
import { ascendAvailableGangMembers, buyAvailableEquipment, checkSetWarfare, setGangTasks2 } from '/TS/gangFunctions'

export async function main(ns : NS) : Promise<void> {
	// const noLogFuncs = ['gang.canRecruitMember','gang.getMemberNames','gang.purchaseEquipment']
	// noLogFuncs.forEach((command) => ns.disableLog(command))
	ns.disableLog('ALL')
	ns.tail()
	
	if (!ns.gang.inGang()) ns.gang.createGang('Slum Snakes')
	
	while (true) {
		checkSetWarfare(ns) //Sets warfare to enabled if likely to win
		if(ns.gang.canRecruitMember()) ns.gang.recruitMember(uuidv4())

		const memberInfo  = ns.gang.getMemberNames().map(member => ns.gang.getMemberInformation(member))

		setGangTasks2(ns, memberInfo)
		ascendAvailableGangMembers(ns, memberInfo)
		buyAvailableEquipment(ns, memberInfo)

		let outputString = `INFO\n${'#'.padEnd(2,' ')}` + 
		` | ${'Task'.padEnd(17,' ')}` + 
		` | ${'str'.padEnd(7,' ')}` + 
		` | ${'def'.padEnd(7,' ')}` + 
		` | ${'dex'.padEnd(7,' ')}` + 
		` | ${'agi'.padEnd(7,' ')}` + 
		` | ${'$'.padEnd(8,'$')}` + 
		` | ${'respect'.padEnd(8,' ')} |`
		memberInfo.forEach((member, index) => {
			outputString += '\n' + (index + 1).toString().padEnd(2,' ') + ' | ' + member.task.padEnd(17,' ') +
			' | ' + ns.nFormat(member.str,'0.00a').padEnd(7,' ') + ' | ' + ns.nFormat(member.def,'0.00a').padEnd(7,' ') +
			' | ' + ns.nFormat(member.dex,'0.00a').padEnd(7,' ') + ' | ' + ns.nFormat(member.agi,'0.00a').padEnd(7,' ') +
			' | ' + ns.nFormat(member.moneyGain*5,'$0.00a').padEnd(8,' ') + ' | ' + ns.nFormat(member.respectGain*5,'0.00a').padEnd(8,' ') + ' | '
		})
		outputString += `\n${'t'.padEnd(2,' ')}` +
						` | ${''.padEnd(17,' ')}`+
						` | ${''.padEnd(7,' ')}` +
						` | ${''.padEnd(7,' ')}` +
						` | ${''.padEnd(7,' ')}` +
						` | ${''.padEnd(7,' ')}` +
						` | ${ns.nFormat(memberInfo.reduce((acc, member) => acc + member.moneyGain*5, 0),'$0.00a').padEnd(8,' ')}` + 
						` | ${ns.nFormat(memberInfo.reduce((acc, member) => acc + member.respectGain*5, 0),'0.00a').padEnd(8,' ')} |`;
		ns.clearLog()
		ns.print(outputString)
		// print to log table of current statuses?
		await sleep(2e3)
	}
}