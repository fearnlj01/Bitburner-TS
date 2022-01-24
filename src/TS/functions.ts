import { GangGenInfo, GangMemberAscension, GangMemberInfo, NS, Player, Server } from '@ns'
import { threadRatios, hgwTimes, psInfo, threadCountTarget, GangMemberInfoMulti } from '@types'

export const CONSTANTS = {
	hackSecInc : 0.002,
	get growSecInc() : number { return this.hackSecInc * 2 },
	weakenSecDec : 0.05,
	scripts : {
        hack      : '/TS/hack.js',
        grow      : '/TS/grow.js',
        weaken    : '/TS/weaken.js',
		share     : '/TS/share.js',
	},
	targetHackPercent : 0.25,
	xpServer : 'joesguns',
	gang : {
		maxAscRatio      : 1.6,
		minAscRatio      : 1.1,
		percentMoney     : 0.5,
		percentRespect   : 0.3,
		percentTerritory : 0.2,
	},
}

export function sleep(ms : number) : Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function recursiveScan(ns : NS, host : string, seen : Set<string>, path : string[]) : [string, string[]][] {
	seen.add(host)

	const connectedHosts : string[] = ns.scan(host)
	const newHosts : [string, string[]][] = connectedHosts.filter((host) => !seen.has(host)).map((host) => [host, path])

	const result : [string, string[]][] = newHosts.concat(newHosts.map(([host, path]) => recursiveScan(ns, host, seen, [...path, host])).flat())
	
	return result
}

export function getVisibleHostsWithPaths(ns : NS) : [string, string[]][] {
	return recursiveScan(ns, "home", new Set(), [])
}

export function getVisibleHosts(ns : NS) : string[] {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return getVisibleHostsWithPaths(ns).map(([host, _path]) => host)
}

export function getRoot(ns : NS, hosts : string[]) : string[] {
	for (const host of hosts) {
		for (const program of [ns.brutessh, ns.sqlinject, ns.ftpcrack, ns.relaysmtp, ns.httpworm, ns.nuke]) {
			try { program(host) } catch (e) { /** Do nothing */ }
		}
	}
	return hosts.filter((host) => !ns.getServer(host).hasAdminRights)
}

export function getRootedHosts(ns : NS) : string[] {
	const visibleHosts = getVisibleHosts(ns)
	
	getRoot(ns, visibleHosts.filter((host) => !ns.getServer(host).hasAdminRights))
	return visibleHosts.filter((host) => ns.getServer(host).hasAdminRights)
}

export function getHackableHosts(ns : NS) : string[] {
	const hackingLevel = ns.getHackingLevel()
	const rootedHosts = getRootedHosts(ns)
	const hackableHosts = rootedHosts.filter((host) => ns.getServer(host).requiredHackingSkill <= hackingLevel)

	return [...hackableHosts.filter(server => server.startsWith('pserv-')), ...hackableHosts.filter(server => !server.startsWith('pserv-'))]
}

export function findNthProfitable(ns : NS, n : number) : string {
	const data : [string, number][] = []
	for (const currServer of getHackableHosts(ns)) {
		const server = ns.getServer(currServer)
		const ht_mul = 2.5 * server.requiredHackingSkill * server.minDifficulty + 500
		const raw = server.moneyMax * server.serverGrowth
		data.push([currServer, raw / ht_mul / 1e7])
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const results = data.sort((a, b) => b[1] - a[1]).filter(([_a, b]) => (b > 0))
	return results[Math.min(n, results.length)][0]
}

export function findOptimalHost(ns : NS) : string {
	return findNthProfitable(ns, 0)
}

export function hackThreadsFromMax(ns : NS, player : Player, server : Server, hackPercent : number) : number{
	/* const balanceFactor = 240

	const difficultyMult = (100 - server.hackDifficulty) / 100
	const skillMult = (player.hacking - (server.requiredHackingSkill - 1)) / player.hacking
	
	const percentHacked = Math.min(Math.max((difficultyMult * skillMult * player.hacking_money_mult) / balanceFactor, 0), 1)
	return (server.moneyMax * hackPercent) / Math.floor(server.moneyMax * percentHacked) */
	server.moneyAvailable = server.moneyMax

	const threadCount = hackPercent / ns.formulas.hacking.hackPercent(server,player)
	return threadCount
}

export function getThreadRatios(ns : NS, host : string, targetHost : string, hackPercent : number) : threadRatios {
	const hostServer = ns.getServer(host)
	const targetServer = ns.getServer(targetHost)
	// const postAtkTgt = targetServer
	// postAtkTgt.moneyAvailable = postAtkTgt.moneyMax * hackPercent
	const player = ns.getPlayer()

	const coreBonus = 1 + (hostServer.cpuCores - 1) / 16

	const h0 = Math.floor(hackThreadsFromMax(ns, player, targetServer, hackPercent))
    const w0 = Math.min(Math.ceil(((CONSTANTS.hackSecInc * h0) / CONSTANTS.weakenSecDec) / coreBonus), 2000)
    const g0 = Math.ceil(ns.growthAnalyze(targetHost, (1 - hackPercent) ** - 1, hostServer.cpuCores))
	// const g0 = Math.ceil(Math.log(1/(1-hackPercent)) / Math.log(ns.formulas.hacking.growPercent(targetServer,1,player,hostServer.cpuCores)))
    const w1 = Math.ceil(((CONSTANTS.growSecInc * g0) / CONSTANTS.weakenSecDec) / coreBonus)
	return { 'hack0' : h0, 'weaken0': w0, 'grow0': g0, 'weaken1' : w1 }
}

export function getHGWTimes(ns : NS, targetHost : string, delayPeriod : number) : hgwTimes {
	const hackDur   = ns.formulas.hacking.hackTime(ns.getServer(targetHost),ns.getPlayer())   /* Math.ceil(ns.getHackTime(targetHost)) */
	const growDur   = ns.formulas.hacking.growTime(ns.getServer(targetHost),ns.getPlayer())   /* Math.ceil(hackDur * 3.2) */
	const weakenDur = ns.formulas.hacking.weakenTime(ns.getServer(targetHost),ns.getPlayer()) /* Math.ceil(hackDur * 4) */

	const cycleDur = weakenDur + (2 * delayPeriod)
	const relativeEnd = performance.now() + cycleDur

	const batchDelays = {
		hack0   : relativeEnd - hackDur   - 3 * delayPeriod,
		weaken0 : relativeEnd - weakenDur - 2 * delayPeriod,
		grow0   : relativeEnd - growDur   - 1 * delayPeriod,
		weaken1 : relativeEnd - weakenDur - 0 * delayPeriod
	}

	return batchDelays
}

export async function runHWGWCycle(ns : NS, host : string, optimalServer : string, delayPeriod : number) : Promise<boolean> {
	const fileList = [CONSTANTS.scripts.hack, CONSTANTS.scripts.grow, CONSTANTS.scripts.weaken]
	let hostServer : Server
	try {
		hostServer = ns.getServer(host)
	} catch (e) {
		await sleep(10e3)
		hostServer = ns.getServer(host)
	}

	const maxScriptRam = fileList.reduce((acc, curr) => Math.max(acc, ns.getScriptRam(curr, "home")), 0)
	const availableThreads = Math.floor((hostServer.maxRam - hostServer.ramUsed) / maxScriptRam)

	const timing = getHGWTimes(ns, optimalServer, delayPeriod)
	const ratios = getThreadRatios(ns, host, optimalServer, CONSTANTS.targetHackPercent)
	const maxThreadsReq = Object.values(ratios).reduce((a, b) => a + b)

	if (availableThreads >= maxThreadsReq) {
		try {
			ns.exec(CONSTANTS.scripts.hack  , host, ratios.hack0  , optimalServer, timing.hack0  );
            ns.exec(CONSTANTS.scripts.weaken, host, ratios.weaken0, optimalServer, timing.weaken0);
            ns.exec(CONSTANTS.scripts.grow  , host, ratios.grow0  , optimalServer, timing.grow0  );
            ns.exec(CONSTANTS.scripts.weaken, host, ratios.weaken1, optimalServer, timing.weaken1);
			
		} catch (e) { /* DO NOTHING */ }
		return true
	} else if (availableThreads > 0) {
		try {
			const serverInfo = ns.getServer(CONSTANTS.xpServer)
			if (host != 'home') {
				if (serverInfo.hackDifficulty > serverInfo.minDifficulty) {
					ns.exec(CONSTANTS.scripts.weaken, host, availableThreads, CONSTANTS.xpServer, performance.now())
				} else {
					ns.exec(CONSTANTS.scripts.grow, host, availableThreads, CONSTANTS.xpServer, performance.now())
				}
				// const availableThreads = Math.floor((hostServer.maxRam - hostServer.ramUsed) / ns.getScriptRam(CONSTANTS.scripts.share))
				// if (availableThreads) ns.exec(CONSTANTS.scripts.share, host, availableThreads)
			}
		} catch (e) { /* DO NOTHING */ }
		return true
	} else {
		return false
	} 
}

export function sendTerminalCommand(command : string) : void {
	/* eslint-disable @typescript-eslint/no-unsafe-call */
	const terminalInput = globalThis['document'].getElementById('terminal-input') as HTMLInputElement
	terminalInput.value = command

	const handler = Object.keys(terminalInput)[1]
	// @ts-expect-error placeholderDescription
	terminalInput[handler as keyof HTMLInputElement].onChange({ target: terminalInput })
	// @ts-expect-error placeholderDescription
	terminalInput[handler as keyof HTMLInputElement].onKeyDown({ keyCode: 13, preventDefault: () => null})
}

export async function updateRemoteScripts(ns : NS, host : string) : Promise<boolean> {
	return await ns.scp(Object.values(CONSTANTS.scripts), host)
}

export async function deletePurchasedServers(ns : NS, purchasedServers : string[]) : Promise<void> {
	for (const server of purchasedServers) {
		ns.killall(server)
		// await sleep(1e3)
		ns.deleteServer(server)
	}
}

export function getServerCostArray(ns : NS) : number[][] {
	const serverCosts = []
	for (let i = 3; i <= Math.log2(ns.getPurchasedServerMaxRam()); ++i) {
		serverCosts.push([(2 ** i), ns.getPurchasedServerCost(2 ** i) * ns.getPurchasedServerLimit()])
	}
	return serverCosts
}

export function getMaxRamBuyable(ns : NS) : number[] {
	const serverCostArray = getServerCostArray(ns)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const filteredArray = serverCostArray.filter(([_ram, totalCost]) => ns.getServerMoneyAvailable("home") > totalCost)
	if (filteredArray.length) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return filteredArray.pop()!
	} else {
		return serverCostArray[0]
	}
}

export async function buyServer(ns : NS, ram : number, sleepTime : number) : Promise<void> {
	let i = 0;
	while (i < ns.getPurchasedServerLimit()) {
		if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
			const hostname = "pserv-" + i
			ns.purchaseServer(hostname, ram)
			ns.toast(`Purchased Server (${ns.nFormat(ram * (2 ** 30), "0 ib")} RAM): ${hostname} for ${ns.nFormat(ns.getPurchasedServerCost(ram), "$0.00a")}`)
			++i
		}
		await sleep(sleepTime)
	}
}

export function getRunningInfo(ns : NS) : psInfo[] {
	const serverList = ["home", ...getHackableHosts(ns)]
	const psInfo : psInfo[] = [];
	for (const server of serverList) {
		// @ts-expect-error placeholderDescription
		for (const process of ns.ps(server).filter((a) => a.length != 0)) {
			// @ts-expect-error placeholderDescription
			process.host = server
			// @ts-expect-error placeholderDescription
			psInfo.push(process)
		}
	}
	return psInfo
}

export function getTargetTotalThreads(ns : NS, target : string) : threadCountTarget {
	const processList = getRunningInfo(ns)
	const result : threadCountTarget = {
		hack: 0,
		grow: 0,
		weaken: 0
	}
	for (const process of processList) {
		if (process.filename == CONSTANTS.scripts.hack && process.args[0] == target) {
			result.hack += process.threads
		} else if (process.filename == CONSTANTS.scripts.grow && process.args[0] == target) {
			result.grow += process.threads
		} else if (process.filename == CONSTANTS.scripts.weaken && process.args[0] == target) {
			result.weaken += process.threads
		}
	}
	return result
}

export async function primeServer(ns:NS, host : string) : Promise<void> {
	const threadCountFn = function (serverObj : Server, scriptType : string) { return Math.floor((serverObj.maxRam - serverObj.ramUsed) / ns.getScriptRam(scriptType,"home")) }

	while (true) {
		const serverList = [...getHackableHosts(ns), "home"]
		const target     = ns.getServer(host)

		for (const server of serverList) {
			const currServInfo = ns.getServer(server)
			await updateRemoteScripts(ns, server)

			const maxGrowThreads = Math.ceil(ns.growthAnalyze(host, target.moneyMax / target.moneyAvailable, currServInfo.cpuCores))
			const maxWeakenThreads = Math.ceil((((maxGrowThreads * CONSTANTS.growSecInc) + (target.hackDifficulty - target.minDifficulty)) / CONSTANTS.weakenSecDec) * (1 - (0.0625 * (currServInfo.cpuCores - 1))))
				
			if (getTargetTotalThreads(ns, host).weaken < maxWeakenThreads) {
				const threadCount = Math.min(threadCountFn(currServInfo,CONSTANTS.scripts.weaken),maxWeakenThreads)
				if (threadCount) ns.exec(CONSTANTS.scripts.weaken,server,threadCount,host,performance.now())
			}

			if (getTargetTotalThreads(ns, host).grow < maxGrowThreads) {
				const threadCount = Math.min(threadCountFn(currServInfo,CONSTANTS.scripts.grow),maxGrowThreads)
				if (threadCount) ns.exec(CONSTANTS.scripts.grow  ,server,threadCount,host,performance.now())
			}


			if (target.moneyMax == target.moneyAvailable && target.minDifficulty == target.hackDifficulty) return

		}

		await sleep(5e3)
	}
}

export function uuidv4() : string {
	// @ts-expect-error placeholderDescription
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
	// return randomUUID()
}

export function calcAscMult(member : GangMemberInfo) : number {

	const getGradient = (maxMult : number) => ((CONSTANTS.gang.minAscRatio - CONSTANTS.gang.maxAscRatio) / (maxMult - 1))

	const gradient = getGradient(30) 
	const mathConst = (CONSTANTS.gang.maxAscRatio - gradient)
	const maxCombat = Math.max(member.str_asc_mult, member.def_asc_mult, member.dex_asc_mult, member.agi_asc_mult)

	return Math.min(Math.max((gradient * maxCombat) + mathConst, CONSTANTS.gang.minAscRatio), CONSTANTS.gang.maxAscRatio)
}

export function ascendGangMember(ns : NS, member : GangMemberInfo) : boolean {
	const ascensionPeek : GangMemberAscension = ns.gang.getAscensionResult(member.name) ?? { str : 1, def : 1, dex : 1, agi : 1 } as GangMemberAscension
	const ascensionMax = Math.max(ascensionPeek.str, ascensionPeek.def, ascensionPeek.dex, ascensionPeek.agi)

	if (ascensionMax > calcAscMult(member)) {
		ns.gang.ascendMember(member.name)
		return true
	} else {
		return false
	}
}

export function ascendAvailableGangMembers(ns : NS, membersInfo : GangMemberInfo[]) : void {
	for (const memberInfo of membersInfo) {
		ascendGangMember(ns, memberInfo)
	}
}

export function getEquipmentAvailable(ns : NS, member : GangMemberInfo) : string[] {
	const equipment = ns.gang.getEquipmentNames().filter((equipment) => ns.gang.getEquipmentType(equipment) != 'Rootkit')
	return equipment.filter((item) => !(member.upgrades.includes(item)))
}

export function buyAvailableEquipment(ns : NS, membersInfo : GangMemberInfo[]) : void {
	for (const memberInfo of membersInfo) {
		for (const item of getEquipmentAvailable(ns, memberInfo)) {
			ns.gang.purchaseEquipment(memberInfo.name, item)
		}
	}
}

export function checkSetWarfare(ns : NS) : void {
	const gangInfo = ns.gang.getGangInformation()

	if (gangGetTerritory(ns) < 1 && !gangInfo.territoryWarfareEngaged) {
		const minWarfareChance = Object.keys(ns.gang.getOtherGangInformation()).filter((gangName) => (gangName != gangInfo.faction))
			.reduce((prev, gangName) => Math.min(prev,ns.gang.getChanceToWinClash(gangName)),1)
		if (minWarfareChance > 0.9) ns.gang.setTerritoryWarfare(true)
	} else {
		ns.gang.setTerritoryWarfare(false)
	}
}

export async function ascend(ns : NS) : Promise<void> {
	const fileList =["brutessh.exe", "sqlinject.exe", "ftpcrack.exe", "relaysmtp.exe", "httpworm.exe"]
	await sleep(2e3)
	ns.purchaseTor()
	fileList.filter(program => !ns.fileExists(program, "home")).forEach(program => ns.purchaseProgram(program))
	// sendTerminalCommand("gangstart")
	sendTerminalCommand("run /TS/hwgw.js --tail ; run /TS/purchaseServers.js --tail ; run /TS/gang2.js --tail")
}

export function setGangTasks2(ns : NS, memberInfo: GangMemberInfo[]) : void {
	const memberArray = memberInfo.map(member => {
		// const memb : GangMemberInfoMulti = member
		return Object.assign({},member,{
			maxMult     : Math.max(member.str_asc_mult, member.def_asc_mult, member.dex_asc_mult, member.agi_asc_mult),
			maxCombat   : Math.max(member.str, member.def, member.dex, member.agi),
			totalCombat : member.str + member.def + member.dex + member.agi,
			baseStr     : member.str / (member.str_asc_mult * member.str_mult),
			baseDef     : member.def / (member.def_asc_mult * member.def_mult),
			baseDex     : member.dex / (member.dex_asc_mult * member.dex_mult),
			baseAgi     : member.agi / (member.agi_asc_mult * member.agi_mult),
			baseCombat  : member.str / (member.str_asc_mult * member.str_mult) +
						member.def / (member.def_asc_mult * member.def_mult) +
						member.dex / (member.dex_asc_mult * member.dex_mult) +
						member.agi / (member.agi_asc_mult * member.agi_mult)
		}) as GangMemberInfoMulti
		// memb.maxMult = Math.max(memb.str_asc_mult, memb.def_asc_mult, memb.dex_asc_mult, memb.agi_asc_mult)
		// memb.maxCombat = Math.max(memb.str, memb.def, memb.dex, memb.agi)
		// memb.totalCombat = memb.str + memb.def + memb.dex + memb.agi
		// memb.baseStr = (memb.str / (memb.str_asc_mult * memb.str_mult)) ?? 1
		// memb.baseDef = (memb.def / (memb.def_asc_mult * memb.def_mult)) ?? 1
		// memb.baseDex = (memb.dex / (memb.dex_asc_mult * memb.dex_mult)) ?? 1
		// memb.baseAgi = (memb.agi / (memb.agi_asc_mult * memb.agi_mult)) ?? 1
		// memb.baseCombat = memb.baseStr + memb.baseDef + memb.baseDex + memb.baseAgi
	})

	const memberArrayTaskReady = memberArray.filter(member => member.baseCombat >= 150)
	const memberArrayTraining  = memberArray.filter(member => member.baseCombat <  150)

	memberArrayTraining.forEach(member => ns.gang.setMemberTask(member.name, 'Train Combat'))
	contextualSetMemberTask(ns, memberArrayTaskReady)
}

export function contextualSetMemberTask(ns : NS, memberInfo : GangMemberInfoMulti[]) : void {
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

export function gangMoneyTask(memberInfo : GangMemberInfoMulti) : string {
	if (Math.random() < 0.2) {
		return 'Train Combat'
	} else if (memberInfo.totalCombat > 750) {
		return 'Human Trafficking'
	} else {
		return 'Mug People'
	}
}

export function gangRespectTask(ns : NS, memberInfo : GangMemberInfoMulti) : string {
	if ((ns.getFactionRep(ns.gang.getGangInformation().faction) > 2.5e6) || (memberInfo.totalCombat < 1000)) {
		return gangTerritoryTask(ns, memberInfo)
	} else {
		return 'Terrorism'
	}
}

export function gangTerritoryTask(ns : NS, memberInfo : GangMemberInfoMulti) : string {
	const gangInfo      = ns.gang.getGangInformation()
	if (gangGetTerritory(ns) < 1 && !gangInfo.territoryWarfareEngaged) {
		return 'Territory Warfare'
	} else {
		return gangMoneyTask(memberInfo)
	}
}

export function gangGetTerritory(ns : NS) : number {
	const gangInfo      = ns.gang.getGangInformation()
	const otherGangs    = Object.keys(ns.gang.getOtherGangInformation()).filter(gang => gang != gangInfo.faction)
	// @ts-expect-error curr is indexable string
	const territory  = 1 - otherGangs.reduce((prev,curr) => ns.gang.getOtherGangInformation()[curr]['territory'] + prev, 0)
	return territory
}