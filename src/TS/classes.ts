import { NS, Division, EmployeeJobs } from '@ns'
import { sleep } from '/TS/functions';

export class CorporationInformation {

	/** Corporation name */
	name: string;
	/** Current funds */
	funds: number;
	/** Current revenue this cycle */
	revenue: number;
	/** Current expenses this cycle */
	expenses: number;
	/** Current profit this cycle */
	profit: number;
	/** Is corp public? */
	public: boolean;
	/** Total shares issued */
	totalShares: number;
	/** Shares owned by player */
	numShares: number;
	/** Period of time in ms till shares can be next sold */
	shareSaleCooldown: number;
	/** Shares issued */
	issuedShares: number;
	/** Share price */
	sharePrice: number;
	/** State of the corporation. Possible states are START, PURCHASE, PRODUCTION, SALE, EXPORT. */
	state: string;
	/** Array of divisions */
	divisions: DivisionInfo[];

	constructor(ns : NS) { 
		const c = ns.corporation.getCorporation()

		this.name = c.name
		this.funds = c.funds
		this.revenue = c.revenue
		this.expenses = c.expenses
		this.profit = c.revenue = c.expenses
		this.public = c.public
		this.totalShares = c.totalShares
		this.numShares = c.totalShares
		this.shareSaleCooldown = c.shareSaleCooldown
		this.issuedShares = c.issuedShares
		this.sharePrice = c.sharePrice
		this.state = c.state
		this.divisions = c.divisions.map(division => {
			return new DivisionInfo(ns, division)
		})
	}
}

export class DivisionInfo {

	/** Name of the division */
	name : string;
	/** Type of division, like Agriculture */
	type : string;
	/** Awareness of the division */
	awareness : number;
	/** Popularity of the division */
	popularity : number;
	/** Production multiplier */
	prodMult : number;
	/** Amount of research in that division */
	research : number;
	/** Revenue last cycle */
	lastCycleRevenue : number;
	/** Expenses last cycle */
	lastCycleExpenses : number;
	/** Profit last cycle */
	lastCycleProfit : number;
	/** Revenue this cycle */
	thisCycleRevenue : number;
	/** Expenses this cycle */
	thisCycleExpenses : number;
	/** Profit this cycle */
	thisCycleProfit : number;
	/** All research bought */
	upgrades : number[];
	/** Information on offices */
	offices : OfficeInfo[];
	/** Products developed by this division */
	products : string[];

	constructor(ns : NS, division : Division) {
		const d = division
		this.name = d.name
		this.type = d.type
		this.awareness = d.awareness
		this.popularity = d.popularity
		this.prodMult = d.prodMult
		this.research = d.research
		this.lastCycleRevenue = d.lastCycleRevenue
		this.lastCycleExpenses = d.lastCycleExpenses
		this.lastCycleProfit = d.lastCycleRevenue - d.lastCycleExpenses
		this.thisCycleRevenue = d.thisCycleRevenue
		this.thisCycleExpenses = d.thisCycleExpenses
		this.thisCycleProfit = d.thisCycleRevenue - d.thisCycleExpenses
		this.upgrades = d.upgrades
		this.offices = d.cities.map(city => {
			return new OfficeInfo(ns, d.name, city)
		})
		this.products = d.products
	}
}

export class OfficeInfo {
	/** Name of the city the office is located within */
	name: string;
	/** Maximum number of employee */
	size: number;
	/** Minimum amount of energy of the employees */
	minEne: number;
	/** Maximum amount of energy of the employees */
	maxEne: number;
	/** Minimum happiness of the employees */
	minHap: number;
	/** Maximum happiness of the employees */
	maxHap: number;
	/** Maximum morale of the employees */
	maxMor: number;
	/** Name of all the employees */
	employees: string[];
	/** Not positions of employees - value is something else???*/
	employeeProd: EmployeeJobs;
	/** Employee positions */
	employeePositions: EmployeeInfo[];
	/** Hires employees when called if there is space in the office */
	hireEmployees : () => Promise<boolean>;
	/** Resets all employees to be evenly distributed */
	setJobs : () => Promise<void>;

	constructor(ns : NS, divisionName : string, city : string) {
		const o = ns.corporation.getOffice(divisionName, city)
		ns.corporation.setAutoJobAssignment
		this.size = o.size
		this.minEne = o.minEne
		this.maxEne = o.maxEne
		this.minHap = o.minHap
		this.maxHap = o.maxHap
		this.maxMor = o.maxMor
		this.employees = o.employees
		this.employeeProd = o.employeeProd
		this.name = o.loc
		this.employeePositions = o.employees.map(name => {
			return new EmployeeInfo(ns, divisionName, city, name)
		})
		this.hireEmployees = async () => {
			if (o.employees.length === o.size) { 
				await sleep(50)
				return false
			} else {
				while (o.employees.length < o.size) {
					if (typeof ns.corporation.hireEmployee(divisionName, city) === 'undefined') break
					await sleep(0)
				} 
				return true
			}
		}
		this.setJobs = async () => {
			for (const job of ['Training','Operations','Engineer','Business','Management','Research & Development']) {
				await ns.corporation.setAutoJobAssignment(divisionName,city,job,
					(job === 'Training') ? o.size : Math.floor(o.size / 5)
				)
			}
		}
	}
}

export class EmployeeInfo {
	/** Name of the employee */
	name: string;
	/** Morale */
	mor: number;
	/** Happiness */
	hap: number;
	/** Energy */
	ene: number;
	int: number;
	cha: number;
	exp: number;
	cre: number;
	eff: number;
	/** Salary */
	sal: number;
	/** Current job */
	job: string;

	constructor(ns : NS, division : string, city : string, name : string) {
		const e = ns.corporation.getEmployee(division, city, name)
		this.name = e.name
		this.mor = e.mor
		this.hap = e.hap
		this.ene = e.ene
		this.int = e.int
		this.cha = e.cha
		this.exp = e.exp
		this.cre = e.cre
		this.eff = e.eff
		this.sal = e.sal
		this.job = e.pos
	}
}

export class CodingContract {
	constructor(private ns : NS, public host : string, public file : string) { }

	get type() : string  { return this.ns.codingcontract.getContractType(this.file, this.host) }
	get data() : unknown { return this.ns.codingcontract.getData(this.file, this.host)         }
	
	attempt(answer : (number | string[])) : string { return this.ns.codingcontract.attempt(answer, this.file, this.host, {returnReward : true})}
}