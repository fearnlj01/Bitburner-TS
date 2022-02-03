import { GangMemberAscension, GangMemberInfo, GangOtherInfo, NS } from '@ns'
import { GangMember } from '@types'
import { CONSTANTS } from '/TS/functions'

/**
 * Sets the tasks for the input gang members to what is most optimal
 * @param ns 
 * @param memberInfo - Array of gang member info objects of which will be iterated over
 */
export function setGangTasks2(ns : NS, memberInfo: GangMemberInfo[]) : void {
	const memberArray = memberInfo.map(m => {
		return Object.assign({},m,{
			maxMult     : Math.max(m.str_asc_mult, m.def_asc_mult, m.dex_asc_mult, m.agi_asc_mult),
			maxCombat   : Math.max(m.str, m.def, m.dex, m.agi),
			totalCombat : m.str + m.def + m.dex + m.agi,
			baseStr     : m.str / (m.str_asc_mult * m.str_mult),
			baseDef     : m.def / (m.def_asc_mult * m.def_mult),
			baseDex     : m.dex / (m.dex_asc_mult * m.dex_mult),
			baseAgi     : m.agi / (m.agi_asc_mult * m.agi_mult),
			get baseCombat() { return this.baseStr + this.baseDef + this.baseDex + this.baseAgi }
		}) as GangMember
	})

	const memberArrayTraining  = memberArray.filter(member => member.baseCombat <= (150 * 4) || member.maxMult <= 5.5)
	const memberArrayTaskReady = memberArray.filter(member => !memberArrayTraining.includes(member))

	memberArrayTraining.forEach(member => ns.gang.setMemberTask(member.name, 'Train Combat'))
	contextualSetMemberTask(ns, memberArrayTaskReady)
}

/**
 * Sets the gang members tasks according to a set distribution of money/respect/territory
 * @param ns 
 * @param memberInfo - Array of GangMember objects to assign tasks to
 */
export function contextualSetMemberTask(ns : NS, memberInfo : GangMember[]) : void {
	memberInfo.sort(() => Math.random() - 0.5).forEach((member, index) => {
		if ((index + 1) <= CONSTANTS.gang.percentMoney * memberInfo.length) {
			ns.gang.setMemberTask(member.name,gangMoneyTask(member))
		} else if ((index + 1) <= (CONSTANTS.gang.percentMoney + CONSTANTS.gang.percentRespect) * memberInfo.length) {
			ns.gang.setMemberTask(member.name,gangRespectTask(ns, member))
		} else {
			ns.gang.setMemberTask(member.name,gangTerritoryTask(ns, member))
		}
	})
}

/**
 * Gets the most optimal task to generate money for a gang member at any given time
 * @param memberInfo Individual GangMember object
 * @returns A string value for which task should be performed
 */
export function gangMoneyTask(memberInfo : GangMember) : string {
	if (Math.random() < 0.2) {
		return 'Train Combat'
	} else if (memberInfo.totalCombat > 750) {
		return 'Human Trafficking'
	} else {
		return 'Mug People'
	}
}

/**
 * Gets the most optimal task to generate the most respect for a gang member at any given time.
 * Falls back to territory if insufficent stats or sufficient respect.
 * @param ns 
 * @param memberInfo Individual GangMember object
 * @returns A string value for which task should be performed
 */
export function gangRespectTask(ns : NS, memberInfo : GangMember) : string {
	if ((ns.getFactionRep(ns.gang.getGangInformation().faction) > 2.5e6) || (memberInfo.totalCombat < 1000)) {
		return gangTerritoryTask(ns, memberInfo)
	} else {
		return 'Terrorism'
	}
}

/**
 * Gets the most optimal task to generate the most territory for a gang member at any given time.
 * Falls back to generating money if no territory needed.
 * @param ns 
 * @param memberInfo Individual GangMember object
 * @returns A string value for which task should be performed
 */
export function gangTerritoryTask(ns : NS, memberInfo : GangMember) : string {
	const gangInfo      = ns.gang.getGangInformation()
	if (gangGetTerritory(ns) < 1 && !gangInfo.territoryWarfareEngaged) {
		return 'Territory Warfare'
	} else {
		return gangMoneyTask(memberInfo)
	}
}

/**
 * Get the amount of territory that the players gang has.
 * Required as other factions can all be at zero prior to your gang being at one.
 * @param ns 
 * @returns Amount of territory the players gang has
 */
export function gangGetTerritory(ns : NS) : number {
	const gangInfo       = ns.gang.getGangInformation()
	const allGangs       = ns.gang.getOtherGangInformation()
	const otherGangKeys  = Object.keys(allGangs).filter(gang => gang != gangInfo.faction)
	return 1 - otherGangKeys.reduce((prev,curr) => allGangs[curr as keyof GangOtherInfo]['territory'] + prev, 0)
}

/**
 * Gets the 'optimal' ascension ratio to ascend at
 * @param member 
 * @returns A number between the max and min ascension ratio scaling down as it's harder to gain more exp
 */
export function calcAscMult(member : GangMemberInfo) : number {

	const getGradient = (maxMult : number) => ((CONSTANTS.gang.minAscRatio - CONSTANTS.gang.maxAscRatio) / (maxMult - 1))

	const gradient = getGradient(30) 
	const mathConst = (CONSTANTS.gang.maxAscRatio - gradient)
	const maxCombat = Math.max(member.str_asc_mult, member.def_asc_mult, member.dex_asc_mult, member.agi_asc_mult)

	return Math.min(Math.max((gradient * maxCombat) + mathConst, CONSTANTS.gang.minAscRatio), CONSTANTS.gang.maxAscRatio)
}

/**
 * Ascends a given gang member if it meets the otherwise defined criteria
 * @param ns 
 * @param member - Gang member info object to attempt to ascend
 * @returns a boolean, true if a member has been ascended
 */
export function ascendGangMember(ns : NS, member : GangMemberInfo) : boolean {
	const ascensionPeek = ns.gang.getAscensionResult(member.name) ?? { str : 1, def : 1, dex : 1, agi : 1 } as GangMemberAscension
	const ascensionMax = Math.max(ascensionPeek.str, ascensionPeek.def, ascensionPeek.dex, ascensionPeek.agi)

	if (ascensionMax > calcAscMult(member)) {
		ns.gang.ascendMember(member.name)
		return true
	} else {
		return false
	}
}

/**
 * Ascends all available gang members meeting the relevant criteria
 * @param ns 
 * @param membersInfo - Array of gang member info objects
 */
export function ascendAvailableGangMembers(ns : NS, membersInfo : GangMemberInfo[]) : void {
	for (const memberInfo of membersInfo) {
		ascendGangMember(ns, memberInfo)
	}
}

/**
 * Gets a list of all the equipment available and relevant for purchase for a given gang member
 * @param ns 
 * @param member - Gang member info object
 * @returns 
 */
export function getEquipmentAvailable(ns : NS, member : GangMemberInfo) : string[] {
	const equipment = ns.gang.getEquipmentNames().filter(equipment => !(ns.gang.getEquipmentStats(equipment).hack))
	return equipment.filter(item => !(member.upgrades.includes(item)))
}

/**
 * Attempts to buy all available equipment for all gang members
 * @param ns 
 * @param membersInfo - Array of all gang member info objects
 */
export function buyAvailableEquipment(ns : NS, membersInfo : GangMemberInfo[]) : void {
	for (const memberInfo of membersInfo) {
		for (const item of getEquipmentAvailable(ns, memberInfo)) {
			ns.gang.purchaseEquipment(memberInfo.name, item)
		}
	}
}

/**
 * Sets territory warfare to enabled if likely to win
 * @param ns 
 */
export function checkSetWarfare(ns : NS) : void {
	const gangInfo = ns.gang.getGangInformation()

	if (gangGetTerritory(ns) < 1) {
		const minWarfareChance = Object.keys(ns.gang.getOtherGangInformation()).filter((gangName) => (gangName != gangInfo.faction))
			.reduce((prev, gangName) => Math.min(prev,ns.gang.getChanceToWinClash(gangName)),1)
		minWarfareChance > 0.8 ? ns.gang.setTerritoryWarfare(true) : ns.gang.setTerritoryWarfare(false)
	} else {
		ns.gang.setTerritoryWarfare(false)
	}
}