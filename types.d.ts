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