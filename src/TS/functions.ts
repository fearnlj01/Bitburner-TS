import { GangMemberAscension, GangMemberInfo, GangOtherInfo, GangOtherInfoObject, NS, Player, Server, SleeveSkills, SleeveTask } from '@ns'
import { threadRatios, hgwTimes, psInfo, threadCountTarget, GangMember } from '@types'

export const CONSTANTS = {
	hackSecInc : 0.002,
	get growSecInc() : number { return this.hackSecInc * 2 },
	weakenSecDec : 0.05,
	scripts : {
        hack      : '/TS/hack.js',
        grow      : '/TS/grow.js',
        weaken    : '/TS/weaken.js',
		share     : '/TS/share.js',
		maxGrow   : '/TS/maxGrow.js',
	},
	targetHackPercent : 0.15,
	xpServer : 'joesguns',
	gang : {
		maxAscRatio      : 1.60,
		minAscRatio      : 1.04,
		percentMoney     : 0.50,
		percentRespect   : 0.30,
		get percentTerritory() : number { return 1.0 - this.percentMoney - this.percentRespect }
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
	type executeable = (host: string) => void
	const programs : [string, executeable][] = [
		["brutessh.exe",  ns.brutessh ],
		["sqlinject.exe", ns.sqlinject],
		["ftpcrack.exe",  ns.ftpcrack ],
		["relaysmtp.exe", ns.relaysmtp],
		["httpworm.exe",  ns.httpworm ],
	]
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const availablePrograms = programs.filter(([file, exe]) => ns.fileExists(file as string))

	hosts.filter(host => ns.getServer(host).numOpenPortsRequired <= availablePrograms.length).forEach(host => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		availablePrograms.forEach(([file, exe]) => exe(host))
		ns.nuke(host)
	})

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

	const h0 = Math.max(1,Math.floor(hackThreadsFromMax(ns, player, targetServer, hackPercent)))
    const w0 = Math.min(Math.max(1,Math.ceil(((CONSTANTS.hackSecInc * h0) / CONSTANTS.weakenSecDec) / coreBonus)), 2000)
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

	const batchDelays = {
		hack0   : cycleDur - hackDur   - 3 * delayPeriod,
		weaken0 : cycleDur - weakenDur - 2 * delayPeriod,
		grow0   : cycleDur - growDur   - 1 * delayPeriod,
		weaken1 : cycleDur - weakenDur - 0 * delayPeriod
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
			ns.exec(CONSTANTS.scripts.hack, host, ratios.hack0, optimalServer, timing.hack0 + performance.now())
            ns.exec(CONSTANTS.scripts.weaken, host, ratios.weaken0, optimalServer, timing.weaken0 + performance.now())
            ns.exec(CONSTANTS.scripts.grow, host, ratios.grow0, optimalServer, timing.grow0 + performance.now())
            ns.exec(CONSTANTS.scripts.weaken, host, ratios.weaken1, optimalServer, timing.weaken1 + performance.now())
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
		
		} finally { /* eslint-disable no-unsafe-finally */ return true }
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
	for (let i = 4; i <= Math.log2(ns.getPurchasedServerMaxRam()); ++i) {
		if (!(i % 2) || (i == Math.log2(ns.getPurchasedServerMaxRam()))) {
			serverCosts.push([(2 ** i), ns.getPurchasedServerCost(2 ** i) * ns.getPurchasedServerLimit()])
		}
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

			const maxGrowThreads = Math.ceil(ns.growthAnalyze(host, (target.moneyAvailable > 0) ? target.moneyMax / target.moneyAvailable : target.moneyMax / (target.moneyAvailable+1), currServInfo.cpuCores))
			const maxWeakenThreads = Math.min(Math.ceil((((maxGrowThreads * CONSTANTS.growSecInc) + (target.hackDifficulty - target.minDifficulty)) / CONSTANTS.weakenSecDec) * (1 - (0.0625 * (currServInfo.cpuCores - 1)))),2000)
				
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
	// return crypto.randomUUID()
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
	// const equipment = ns.gang.getEquipmentNames().filter(equipment => ns.gang.getEquipmentType(equipment) != 'Rootkit')
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

/**
 * Actions to take following an ascension
 * @param ns 
 */
export async function ascend(ns : NS) : Promise<void> {
	const fileList =["brutessh.exe", "sqlinject.exe", "ftpcrack.exe", "relaysmtp.exe", "httpworm.exe"]
	await sleep(2e3)
	ns.purchaseTor()
	fileList.filter(program => !ns.fileExists(program, "home")).forEach(program => ns.purchaseProgram(program))
	sendTerminalCommand("run /TS/xp.js ; run /TS/purchaseServers.js ; run /TS/gang.js")
}

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

//TODO export function getHackingAugments(ns : NS, faction : string) : string[] {

export class CodingContract {
	constructor(private ns : NS, public host : string, public file : string) { }

	get type() : string  { return this.ns.codingcontract.getContractType(this.file, this.host) }
	get data() : unknown { return this.ns.codingcontract.getData(this.file, this.host)         }
	
	attempt(answer : (number | string[] | string)) : string { return this.ns.codingcontract.attempt(answer as (number | string[]), this.file, this.host, {returnReward : true}) as string }
}

export function getContracts(ns : NS) : CodingContract[] {
	const serverFiles = getVisibleHosts(ns).map(host => { return {'host' : host, 'files' : ns.ls(host, 'cct')} })
	const contracts = serverFiles.filter(relativeFiles => relativeFiles.files.length > 0)

	return contracts.map(contract => contract.files.map(file => new CodingContract(ns, contract.host, file))).flat()
}

// export function getContracts(ns : NS) : CodingContractData[] {
// 	const serverFiles = getVisibleHosts(ns).map(host => { return {'host' : host, 'files' : ns.ls(host, 'cct')} })
// 	const contracts = serverFiles.filter(relativeFiles => relativeFiles.files.length > 0)

// 	return contracts.map(contract => {return contract.files.map(file => {return {
// 		'host' : contract.host,
// 		'file' : file,
// 		'type' : ns.codingcontract.getContractType(file,contract.host),
// 		'data' : ns.codingcontract.getData(file,contract.host),
// 		attempt: (answer : (number | string[])) => ns.codingcontract.attempt(answer, file, contract.host, {returnReward : true})
// 	}})}).flat()
// }

export function solveContracts(ns : NS) : void {
	const contracts = getContracts(ns)
	contracts.forEach(contract => {
		switch (contract.type) {
			case ('Spiralize Matrix') : {
				spiralizeMatrix(ns, contract)
				break
			}
			case ('Total Ways to Sum') : {
				stolenTotalWaysToSum(ns, contract)
				break
			}
			case ('Find Largest Prime Factor') : {
				stolenFindLargestPrimeFactor(ns, contract)
				break
			}
			case ('Subarray with Maximum Sum') : {
				stolenSubarrayMaxSum(ns, contract)
				break
			}
			case ('Array Jumping Game') : {
				stolenArrayJumping(ns, contract)
				break
			}
			case ('Merge Overlapping Intervals') : {
				stolenMergeOverlapping(ns, contract)
				break
			}
			case ('Generate IP Addresses') : {
				stolenGenerateIPAddresses(ns, contract)
				break
			}
			case ('Algorithmic Stock Trader I') : {
				stolenAlgorithmicStockTraderI(ns, contract)
				break
			}
			case ('Algorithmic Stock Trader II') : {
				stolenAlgorithmicStockTraderII(ns, contract)
				break
			}
			case ('Algorithmic Stock Trader III') : {
				stolenAlgorithmicStockTraderIII(ns, contract)
				break
			}
			case ('Algorithmic Stock Trader IV') : {
				stolenAlgorithmicStockTraderIV(ns, contract)
				break
			}
			case ('Minimum Path Sum in a Triangle') : {
				stolenMinPathSumTriangle(ns, contract)
				break
			}
			case ('Unique Paths in a Grid I') : {
				stolenUniquePathGridI(ns, contract)
				break
			}
			case ('Unique Paths in a Grid II') : {
				stolenUniquePathGridII(ns, contract)
				break
			}
			case ('Sanitize Parentheses in Expression') : {
				stolenParenthesesSanitization(ns, contract)
				break
			}
			case ('Find All Valid Math Expressions') : {
				stolenFindValidMaths(ns, contract)
				break
			}
			default : {
				console.log(contract)
				break
			}
		}
	})
}

function convert2DArrayToString(arr: unknown[][]): string {
	const components: string[] = [];
	arr.forEach(e => {
		let s = e.toString();
		s = ["[", s, "]"].join("");
		components.push(s);
	});
	return components.join(",").replace(/\s/g, "");
}

function spiralizeMatrix(ns : NS, contract : CodingContract) : void {
	/** Example input
		[
			[41,44, 5,44,50,13,37,23,26,36,23,46,30,39]
			[44,25,22,23,48,46, 9, 3,20, 2, 8,21,22,29]
			[38, 5,11,38,50, 2, 1,18,20,27,10, 9,37,16]
			[18,33,23,27,10, 1, 5,23,37,14, 3,48, 7, 8]
			[45, 1,45,31, 6,46,44,16,40,40,37,46,35,11]
			[37,18,16,28, 3,39,30,35,23,48,30,13,41, 9]
		]
	*/
	let inputArray = contract.data as unknown[][]
	const result : number[][] = []

	do {
		result.push(inputArray.shift() as number[])
		result.push(inputArray.map(arrayRow => arrayRow.pop() as number))
		if (inputArray.every(array => array.length == 0)) break
		inputArray.reverse()
		inputArray = inputArray.map(arrayRow => arrayRow.reverse())
	} while (inputArray.length > 0)

	// ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${ns.codingcontract.attempt(result.flat().map(n => n.toString(10)), contract.file, contract.host, {returnReward : true})}`)
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(result.flat().map(n => n.toString(10)))}`)
}

function stolenTotalWaysToSum(ns : NS, contract : CodingContract) : void {
	const ways : number[] = [1]
	ways.length = (contract.data as number) + 1
	ways.fill(0,1)
	for (let i = 1; i < (contract.data as number); ++i) {
		for (let j = i; j <= (contract.data as number); ++j) {
			ways[j] += ways[j - i]
		}
	}
	// ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${ns.codingcontract.attempt(integerPartition(input),contract.file,contract.host,{returnReward : true})}`)
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(ways[contract.data as number])}`)
}

function stolenFindLargestPrimeFactor(ns : NS, contract : CodingContract) : void {
	let factor = 2
	let n = contract.data as number
	while (n > (factor - 1) * (factor - 1)) {
		while (n % factor === 0) {
			n = Math.round(n / factor)
		}
		++factor
	}
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt((n === 1 ? factor - 1 : n))}`)
}

function stolenSubarrayMaxSum(ns : NS, contract : CodingContract) : void {
	const nums = (contract.data as number[]).slice()
	for (let i = 1; i < nums.length; ++i) {
		nums[i] = Math.max(nums[i], nums[i] + nums[i - 1])
	}
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(Math.max(...nums))}`)
}

function stolenArrayJumping(ns : NS, contract : CodingContract) : void {
	const n = (contract.data as number[]).length
	let i = 0
	for (let reach = 0; i < n && i <= reach; ++i) {
		reach = Math.max(i + (contract.data as number[])[i], reach)
	}
	const solution = (i === n) ? 1 : 0
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(solution)}`)
}

function stolenMergeOverlapping(ns : NS, contract : CodingContract) : void {
	const intervals = (contract.data as number[][]).slice()
	intervals.sort((a : number[], b : number[]) => a[0] - b[0])

	const result : number[][] = []
	let start = intervals[0][0]
	let end = intervals[0][1]
	for (const i of intervals) {
		if (i[0] <= end) {
			end = Math.max(end, i[1])
		} else {
			result.push([start, end])
			start = i[0]
			end = i[1]
		}
	}
	result.push([start, end])

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(convert2DArrayToString(result))}`)
}

function stolenGenerateIPAddresses(ns : NS, contract : CodingContract) : void {
	const ret : string[] = []
	const data = contract.data as string

	for (let a = 1; a <= 3; ++a) {
		for (let b = 1; b <= 3; ++b) {
			for (let c = 1; c <= 3; ++c) {
				for (let d = 1; d <= 3; ++d) {
					if (a + b + c + d === data.length) {
						const A : number = parseInt(data.substring(0, a), 10);
						const B : number = parseInt(data.substring(a, a + b), 10);
						const C : number = parseInt(data.substring(a + b, a + b + c), 10);
						const D : number = parseInt(data.substring(a + b + c, a + b + c + d), 10);
						if (A <= 255 && B <= 255 && C <= 255 && D <= 255) {
							const ip : string = [A.toString(), ".", B.toString(), ".", C.toString(), ".", D.toString()].join("");
							if (ip.length === data.length + 3) {
								ret.push(ip);
							}
						}
					}
				}
			}
		}
	}

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(ret)}`)
}

function stolenAlgorithmicStockTraderI(ns : NS, contract : CodingContract) : void {
	const data = contract.data as number[]
	let maxCur = 0
	let maxSoFar = 0
	for (let i = 1; i < data.length; ++i) {
		maxCur = Math.max(0, (maxCur += data[i] - data[i-1]))
		maxSoFar = Math.max(maxCur, maxSoFar)
	}
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(maxSoFar)}`)
}

function stolenAlgorithmicStockTraderII(ns : NS, contract : CodingContract) : void {
	let profit = 0
	for (let i = 1; i < (contract.data as number[]).length; ++i) {
		profit += Math.max((contract.data as number[])[i] - (contract.data as number[])[i - 1],0)
	}
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(profit)}`)
}

function stolenAlgorithmicStockTraderIII(ns : NS, contract : CodingContract) : void {
	let hold1 = Number.MIN_SAFE_INTEGER
	let hold2 = Number.MIN_SAFE_INTEGER
	let release1 = 0
	let release2 = 0

	for (const price of (contract.data as number[])) {
		release2 = Math.max(release2, hold2 + price)
		hold2    = Math.max(hold2, release1 - price)
		release1 = Math.max(release1, hold1 + price)
		hold1    = Math.max(hold1, price * -1)
	}

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(release2)}`)
}

function stolenAlgorithmicStockTraderIV(ns : NS, contract : CodingContract) : void {
	function solver() : number {
		const data = contract.data as [number, number[]]
		const k : number = data[0]
		const prices : number[] = data[1]

		const len = prices.length
		if (len < 2) {
			return 0
		}

		if (k > len / 2) {
			let res = 0
			for (let i = 1; i < len; ++i) {
				res += Math.max(prices[i] - prices[i - 1],0)
			}
			return res
		}

		const hold : number[] = []
		const rele : number[] = []
		let cur : number
		hold.length = k + 1
		rele.length = k + 1
		for (let i = 0; i <= k; ++i) {
			hold[i] = Number.MIN_SAFE_INTEGER;
			rele[i] = 0;
		}

		for (let i = 0; i < len; ++i) {
			cur = prices[i]
			for (let j = k; j > 0; --j) {
				rele[j] = Math.max(rele[j], hold[j] + cur)
				hold[j] = Math.max(hold[j], rele[j -1] - cur)
			}
		}

		return rele[k]
	}
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(solver())}`)
}

function stolenMinPathSumTriangle(ns : NS, contract : CodingContract) : void {
	const data = contract.data as number[][]
	const n = data.length
	const dp = data[n - 1]
	for (let i = n - 2; i > -1; --i) {
		for (let j = 0; j < data[i].length; ++j) {
			dp[j] = Math.min(dp[j], dp[j+1]) + data[i][j]
		}
	}
	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(dp[0])}`)
}

function stolenUniquePathGridI(ns : NS, contract : CodingContract) : void {
	const data = contract.data as number[]
	const n = data[0]
	const m = data[1]
	const currRow : number[]= []
	currRow.length = n
	
	for (let i = 0; i< n; i++) {
		currRow[i] = 1
	}
	
	for (let row = 1; row < m; ++row) {
		for (let i = 1; i < n; ++i) {
			currRow[i] += currRow[i - 1]
		}
	}

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(currRow[n - 1])}`)
}

function stolenUniquePathGridII(ns : NS, contract : CodingContract) : void {
	const data = contract.data as number[][]
	const obstacleGrid : number[][] = []
	obstacleGrid.length = data.length

	for (let i = 0; i < obstacleGrid.length; ++i) {
		obstacleGrid[i] = data[i].slice()
	}

	for (let i = 0; i < obstacleGrid.length; ++i) {
		for (let j = 0; j < obstacleGrid[0].length; ++j) {
			if (obstacleGrid[i][j] == 1) {
				obstacleGrid[i][j] = 0
			} else if (i == 0 && j == 0) {
				obstacleGrid[0][0] = 1
			} else {
				obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0)
			}
		}
	}
	const answer = obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1]

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(answer)}`)
}

function stolenParenthesesSanitization(ns : NS, contract : CodingContract) : void {
	const data = contract.data as string
	let left = 0
	let right = 0
	const res : string[] = []

	for (let i = 0; i < data.length; ++i) {
		if (data[i] === "(") {
			++left
		} else if (data[i] === ")") {
			left > 0 ? --left : ++right
		}
	}

	function dfs(pair : number, index : number, left : number, right : number, s : string, solution : string, res : string[]) : void {
		if (s.length === index) {
			if (left === 0 && right === 0 && pair === 0) {
				for (let i = 0; i < res.length; ++i) {
					if (res[i] === solution) {
						return
					}
				}
				res.push(solution)
			}
			return
		}

		if (s[index] === "(") {
			if (left > 0) {
				dfs(pair, index + 1, left - 1, right, s, solution, res)
			}
			dfs(pair + 1, index + 1, left, right, s, solution + s[index], res)
		} else if (s[index] === ")") {
			if (right > 0) {
				dfs(pair, index + 1, left, right - 1, s, solution, res)
			}
			if (pair > 0) {
				dfs(pair - 1, index + 1, left, right, s, solution + s[index], res)
			}
		} else {
			dfs(pair, index + 1, left, right, s, solution + s[index], res)
		}
	}

	dfs(0, 0, left, right, data, "", res)

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(res)}`)
}

function stolenFindValidMaths(ns : NS, contract : CodingContract) : void {
	const data = contract.data as unknown[]
	const num = data[0] as string
	const target = data[1] as number

	function helper(res : string[], path : string, num : string, target : number, pos : number, evaluated : number, multed : number) : void {
		if (pos === num.length) {
			if (target === evaluated) {
				res.push(path);
			}
			return;
		}
  
		for (let i = pos; i < num.length; ++i) {
			if (i != pos && num[pos] == "0") {
				break;
			}
			const cur = parseInt(num.substring(pos, i + 1));
  
			if (pos === 0) {
				helper(res, path + cur, num, target, i + 1, cur, cur);
			} else {
				helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
				helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
				helper(res, path + "*" + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
			}
		}
	}

	const result: string[] = []
    helper(result, "", num, target, 0, 0, 0)

	ns.print(`Completed contract: ${contract.file} on ${contract.host} for the reward:\n${contract.attempt(result)}`)
}

export function sleeveThings(ns : NS) : void {
	const sleeveInfo : [number, SleeveSkills, SleeveTask][] = [];
	const qty = ns.sleeve.getNumSleeves()
	for (let i = 0; i < qty; ++i) {
		sleeveInfo.push([i, ns.sleeve.getSleeveStats(i), ns.sleeve.getTask(i)])
	}
	sleeveInfo.forEach(([num, skills, task]) => {
		if (skills.sync < 100) {
			if (task.task != 'Synchro') {
				ns.sleeve.setToSynchronize(num)
			}
		} else {
			if (task.task != "Commit Crime") {
				ns.sleeve.setToCommitCrime(num,"Homicide")
			}
		}
	})
}