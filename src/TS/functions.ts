import { GangMemberAscension, GangMemberInfo, NS, Player, Server } from '@ns'
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
	targetHackPercent : 0.01,
	xpServer : 'joesguns',
	gang : {
		maxAscRatio      : 1.6,
		minAscRatio      : 1.1,
		percentMoney     : 0.5,
		percentRespect   : 0.3,
		percentTerritory : 0.2,
	},
}

/**
 * Basic sleep function
 * @param ms - Number of ms to sleep for
 * @returns A void promise
 */
export function sleep(ms : number) : Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Recursive scanner
 * @param ns 
 * @param host - host to scan
 * @param seen - set of located hosts
 * @param path - path to host
 * @returns An array containing each host and the path to get to it from the initial server
 */
export function recursiveScan(ns : NS, host : string, seen : Set<string>, path : string[]) : [string, string[]][] {
	seen.add(host)

	const connectedHosts : string[] = ns.scan(host)
	const newHosts : [string, string[]][] = connectedHosts.filter((host) => !seen.has(host)).map((host) => [host, path])

	const result : [string, string[]][] = newHosts.concat(newHosts.map(([host, path]) => recursiveScan(ns, host, seen, [...path, host])).flat())
	
	return result
}

/**
 * Gets all visible hosts and the paths to get to them starting from 'home'
 * @param ns 
 * @returns An array of array of hosts and the path to get to it
 */
export function getVisibleHostsWithPaths(ns : NS) : [string, string[]][] {
	return recursiveScan(ns, "home", new Set(), [])
}

/**
 * Gets a list of all visible hosts from 'home'
 * @param ns 
 * @returns Array of all visible hostnames
 */
export function getVisibleHosts(ns : NS) : string[] {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return getVisibleHostsWithPaths(ns).map(([host, _path]) => host)
}

/**
 * Gets root if neccersary
 * @param ns 
 * @param hosts List of hosts to attempt to get root access on
 * @returns A list of servers with root access
 */
export function getRoot(ns : NS, hosts : string[]) : string[] {
	for (const host of hosts) {
		for (const program of [ns.brutessh, ns.sqlinject, ns.ftpcrack, ns.relaysmtp, ns.httpworm, ns.nuke]) {
			try { program(host) } catch (e) { /** Do nothing */ }
		}
	}
	return hosts.filter((host) => !ns.getServer(host).hasAdminRights)
}

/**
 * Get a list of all rooted hosts.
 * Roots hosts where possible.
 * @param ns 
 * @returns A list of all rooted hosts
 */
export function getRootedHosts(ns : NS) : string[] {
	const visibleHosts = getVisibleHosts(ns)
	
	getRoot(ns, visibleHosts.filter((host) => !ns.getServer(host).hasAdminRights))
	return visibleHosts.filter((host) => ns.getServer(host).hasAdminRights)
}

/**
 * Gets list of servers which can be hacked. Obtains root where needed and works on all servers visible.
 * @param ns 
 * @returns List of hostnames which can be hacked
 */
export function getHackableHosts(ns : NS) : string[] {
	const hackingLevel = ns.getHackingLevel()
	const rootedHosts = getRootedHosts(ns)
	const hackableHosts = rootedHosts.filter((host) => ns.getServer(host).requiredHackingSkill <= hackingLevel)

	return [...hackableHosts.filter(server => server.startsWith('pserv-')), ...hackableHosts.filter(server => !server.startsWith('pserv-'))]
}

/**
 * Finds the Nth most optimal host
 * @param ns 
 * @param n The Nth most optimal host, starting from 0
 * @returns hostname of the most efficent host to target once primed
 */
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

/**
 * Finds the most optimal host to hack once primed
 * @param ns 
 * @returns hostname of most optimal host
 */
export function findOptimalHost(ns : NS) : string {
	return findNthProfitable(ns, 0)
}

/**
 * Get number of threads required to hack a server from max cash down to a set percent.
 * @param ns 
 * @param player - Player object for use in formulas
 * @param server - Unmodified server object for use in formulas
 * @param hackPercent - Decimal percentage to hack the server by (e.g. 0.5 for 50%)
 * @returns Number of threads required to hack a server by hackPercent% from max cash
 */
export function hackThreadsFromMax(ns : NS, player : Player, server : Server, hackPercent : number) : number{
	server.moneyAvailable = server.moneyMax

	const threadCount = hackPercent / ns.formulas.hacking.hackPercent(server,player)
	return threadCount
}

/**
 * Get the number of threads required to batch a server by a given decimal percentage
 * @param ns 
 * @param host - host server running the function, used for core bonus calculations
 * @param targetHost - target server to be hacked, used for all calculations
 * @param hackPercent - decimal percentage to hack by (e.g. 50%)
 * @returns an object containing the number of threads required for a HWGW action
 */
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

/**
 * Gets the start time delays for a HWGW cycle
 * @param ns 
 * @param targetHost - Server that is being targeted by the HWGW cycle
 * @param delayPeriod - time in ms between each action ending
 * @returns An object containing the delays required from the start time to execute a HWGW cycle in
 */
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

/**
 * Execute a HWGW cycle
 * @param ns 
 * @param host - Server to run the HWGW cycle on
 * @param optimalServer - Server targeted by the HWGW cycle
 * @param delayPeriod - Amount of time between each action ending
 * @returns A promised boolean, True if a HWGW cycle executes, false otherwise
 */
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
			ns.exec(CONSTANTS.scripts.hack  , host, ratios.hack0  , optimalServer, timing.hack0)
            ns.exec(CONSTANTS.scripts.weaken, host, ratios.weaken0, optimalServer, timing.weaken0)
            ns.exec(CONSTANTS.scripts.grow  , host, ratios.grow0  , optimalServer, timing.grow0)
            ns.exec(CONSTANTS.scripts.weaken, host, ratios.weaken1, optimalServer, timing.weaken1)
			
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

/**
 * Sends a command to the terminal in game
 * @param command - String to send to the terminal
 */
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

/**
 * Updates the remote scripts on a given host
 * @param ns 
 * @param host - Hostname to update scripts on
 * @returns A boolean promise, true if file succesfully transferred
 */
export async function updateRemoteScripts(ns : NS, host : string) : Promise<boolean> {
	return await ns.scp(Object.values(CONSTANTS.scripts), host)
}

/**
 * Deletes any currently purchased servers
 * @param ns 
 * @param purchasedServers - Array of hostnames of purchased servers
 */
export async function deletePurchasedServers(ns : NS, purchasedServers : string[]) : Promise<void> {
	for (const server of purchasedServers) {
		ns.killall(server)
		// await sleep(1e3)
		ns.deleteServer(server)
	}
}

/**
 * Get an array of how much each server will cost for all possible purchases.
 * @param ns 
 * @returns An array of arrays containing a ram value and the respective cost
 */
export function getServerCostArray(ns : NS) : number[][] {
	const serverCosts = []
	for (let i = 3; i <= Math.log2(ns.getPurchasedServerMaxRam()); ++i) {
		serverCosts.push([(2 ** i), ns.getPurchasedServerCost(2 ** i) * ns.getPurchasedServerLimit()])
	}
	return serverCosts
}

/**
 * Get the max amount of RAM currently purchasable
 * @param ns 
 * @returns An array containing the max amount of ram purchasable and it's respective cost
 */
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

/**
 * Safely buy 25 servers of given RAM value
 * @param ns 
 * @param ram - Amount of RAM to purchase a server of
 * @param sleepTime - Amount of time to sleep between attempts at purchasing a server
 */
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

/**
 * Get the running info of all scripts on all hosts
 * @param ns 
 * @returns An array of running processes, identified by the host running each process
 */
export function getRunningInfo(ns : NS) : psInfo[] {
	const serverList = ["home", ...getHackableHosts(ns)]
	const psInfo : psInfo[] = [];
	for (const server of serverList) {
		for (const process of ns.ps(server).filter((a) => Object.values(a).length != 0)) {
			psInfo.push(Object.assign({},process,{ 'host' : server }))
		}
	}
	return psInfo
}

/**
 * Get the total number of threads attacking a given target
 * @param ns 
 * @param target - Server to return results for
 * @returns An object containing the total amount of h/g/w threads currently targeting the given server
 */
export function getTargetTotalThreads(ns : NS, target : string) : threadCountTarget {
	const processList = getRunningInfo(ns)
	const result : threadCountTarget = {
		hack: 0,
		grow: 0,
		weaken: 0
	}
	for (const process of processList) {
		if (process.args[0] == target) {
			if (process.filename == CONSTANTS.scripts.hack) {
				result.hack += process.threads
			} else if (process.filename == CONSTANTS.scripts.grow) {
				result.grow += process.threads
			} else if (process.filename == CONSTANTS.scripts.weaken) {
				result.weaken += process.threads
			}
		}
	}
	return result
}

/**
 * Primes a server ready to be batch hacked or grow farmed for xp.
 * @param ns 
 * @param host - Target server to be primed
 * @returns A void promise
 */
export async function primeServer(ns : NS, host : string) : Promise<void> {
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

/**
 * Generates a GUID
 * @returns A GUID
 */
export function uuidv4() : string {
	// @ts-expect-error placeholderDescription
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
	// return randomUUID()
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
	const ascensionPeek : GangMemberAscension = ns.gang.getAscensionResult(member.name) ?? { str : 1, def : 1, dex : 1, agi : 1 } as GangMemberAscension
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
	const equipment = ns.gang.getEquipmentNames().filter((equipment) => ns.gang.getEquipmentType(equipment) != 'Rootkit')
	return equipment.filter((item) => !(member.upgrades.includes(item)))
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

	if (gangGetTerritory(ns) < 1 && !gangInfo.territoryWarfareEngaged) {
		const minWarfareChance = Object.keys(ns.gang.getOtherGangInformation()).filter((gangName) => (gangName != gangInfo.faction))
			.reduce((prev, gangName) => Math.min(prev,ns.gang.getChanceToWinClash(gangName)),1)
		if (minWarfareChance > 0.9) ns.gang.setTerritoryWarfare(true)
	} else {
		ns.gang.setTerritoryWarfare(false)
	}
}

/**
 * Actions to take following an ascension
 * @param ns 
 */
export async function ascend(ns : NS) : Promise<void> {
	const fileList =["brutessh.exe", "sqlinject.exe", "ftpcrack.exe", "relaysmtp.exe", "httpworm.exe"]
	await sleep(2e3)
	ns.purchaseTor()
	fileList.filter(program => !ns.fileExists(program, "home")).forEach(program => ns.purchaseProgram(program))
	sendTerminalCommand("run /TS/hwgw.js ; run /TS/purchaseServers.js ; run /TS/gang2.js --tail")
}

/**
 * Sets the tasks for the input gang members to what is most optimal
 * @param ns 
 * @param memberInfo - Array of gang member info objects of which will be iterated over
 */
export function setGangTasks2(ns : NS, memberInfo: GangMemberInfo[]) : void {
	const memberArray = memberInfo.map(member => {
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
	})

	const memberArrayTaskReady = memberArray.filter(member => member.baseCombat >= (150 * 4))
	const memberArrayTraining  = memberArray.filter(member => member.baseCombat <  (150 * 4))

	memberArrayTraining.forEach(member => ns.gang.setMemberTask(member.name, 'Train Combat'))
	contextualSetMemberTask(ns, memberArrayTaskReady)
}

/**
 * Sets the gang members tasks according to a set distribution of money/respect/territory
 * @param ns 
 * @param memberInfo - Array of Gang member info multi objects to assign tasks to
 */
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

/**
 * Gets the most optimal task to generate money for a gang member at any given time
 * @param memberInfo Individual Gang member info multi object
 * @returns A string value for which task should be performed
 */
export function gangMoneyTask(memberInfo : GangMemberInfoMulti) : string {
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
 * @param memberInfo Individual Gang member info multi object
 * @returns A string value for which task should be performed
 */
export function gangRespectTask(ns : NS, memberInfo : GangMemberInfoMulti) : string {
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
 * @param memberInfo Individual Gang member info multi object
 * @returns A string value for which task should be performed
 */
export function gangTerritoryTask(ns : NS, memberInfo : GangMemberInfoMulti) : string {
	const gangInfo      = ns.gang.getGangInformation()
	if (gangGetTerritory(ns) < 1 && !gangInfo.territoryWarfareEngaged) {
		return 'Territory Warfare'
	} else {
		return gangMoneyTask(memberInfo)
	}
}

/**
 * Get the amount of territory that the players gang has. Required as other factions can all be at zero prior to your gang being at one.
 * @param ns 
 * @returns Amount of territory the players gang has
 */
export function gangGetTerritory(ns : NS) : number {
	const gangInfo      = ns.gang.getGangInformation()
	const otherGangs    = Object.keys(ns.gang.getOtherGangInformation()).filter(gang => gang != gangInfo.faction)
	// @ts-expect-error curr is indexable string
	const territory  = 1 - otherGangs.reduce((prev,curr) => ns.gang.getOtherGangInformation()[curr]['territory'] + prev, 0)
	return territory
}