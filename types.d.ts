import { GangMemberInfo, NS } from "/../NetscriptDefinitions";

export interface threadRatios {
	hack0   : number,
	weaken0 : number,
	grow0   : number,
	weaken1 : number
}

export interface hgwTimes {
	hack0   : number,
	weaken0 : number,
	grow0   : number,
	weaken1 : number
}

export interface psInfo {
	host     : string,
	filename : string,
	threads  : number,
	args     : string[],
	pid      : number
}

export interface threadCountTarget {
	hack   : number,
	grow   : number,
	weaken : number
}

export interface ServerData {
	servers : string[],
	txts    : string[],
	scripts : string[],
	flags   : string[],
}

export interface GangMember extends GangMemberInfo {
	maxMult: number;
	maxCombat: number;
	totalCombat: number;
	baseStr: number;
	baseDef: number;
	baseDex: number;
	baseAgi: number;
	baseCombat: number;
}

export interface NS2 extends NS { heart: { break() : number} }

export interface CodingContractData {
	host: string;
	file: string;
	type: string;
	data: unknown;
	attempt(answer : (number | string | string[])): string | boolean
}