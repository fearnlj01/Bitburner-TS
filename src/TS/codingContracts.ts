import { NS } from '@ns'
import { CodingContract } from '/TS/classes'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isNumber, isNumberArray, isNumberOrNumberArray, getVisibleHosts } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.disableLog('ALL')
	ns.clearLog()
	ns.tail()

	solveContracts(ns)
}

export function getContracts(ns : NS) : CodingContract[] {
	const serverFiles = getVisibleHosts(ns).map(host => { return {'host' : host, 'files' : ns.ls(host, 'cct')} })
	const contracts = serverFiles.filter(relativeFiles => relativeFiles.files.length > 0)

	return contracts.flatMap(contract => contract.files.map(file => new CodingContract(ns, contract.host, file)))
}

export function solveContracts(ns : NS) : void {
	const contracts = getContracts(ns)

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
			`[
				[41,44, 5,44,50,13,37,23,26,36,23,46,30,39]
				[44,25,22,23,48,46, 9, 3,20, 2, 8,21,22,29]
				[38, 5,11,38,50, 2, 1,18,20,27,10, 9,37,16]
				[18,33,23,27,10, 1, 5,23,37,14, 3,48, 7, 8]
				[45, 1,45,31, 6,46,44,16,40,40,37,46,35,11]
				[37,18,16,28, 3,39,30,35,23,48,30,13,41, 9]
			]`

			Expected output
			`[
				 41,44, 5,44,50,13,37,23,26,36,23,46,30,39,
				 29,16, 8,11, 9,41,13,30,48,23,35,30,39, 3,
				 28,16,18,37,45,18,38,44,25,22,23,48,46, 9,
				  3,20, 2, 8,21,22,37, 7,35,46,37,40,40,16,
				 44,46, 6,31,45, 1,33, 5,11,38,50, 2, 1,18,
				 20,27,10, 9,48, 3,14,37,23, 5, 1,10,27,23
			]`
		*/
		let inputArray = contract.data as unknown[][]
		const result : number[] = []

		do {
			const row = inputArray.shift()
			if (isNumberArray(row)) result.push(...row)
			const column = inputArray.map(arrayRow => arrayRow.pop())
			if (isNumberArray(column)) result.push(...column)
			if (inputArray.every(array => array.length == 0)) break
			inputArray.reverse()
			inputArray = inputArray.map(arrayRow => arrayRow.reverse())
		} while (inputArray.length > 0)
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(result.flatMap(n => n.toString(10)))}`)
	}

	function stolenTotalWaysToSum(ns : NS, contract : CodingContract) : void {
		const data = contract.data as number
		const ways : number[] = [1]
		ways.length = data + 1
		ways.fill(0,1)
		for (let i = 1; i < data; ++i) {
			for (let j = i; j <= data; ++j) {
				ways[j] += ways[j - i]
			}
		}
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(ways[data])}`)
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
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt((n === 1 ? factor - 1 : n))}`)
	}
	
	function stolenSubarrayMaxSum(ns : NS, contract : CodingContract) : void {
		const nums = (contract.data as number[]).slice()
		for (let i = 1; i < nums.length; ++i) {
			nums[i] = Math.max(nums[i], nums[i] + nums[i - 1])
		}
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(Math.max(...nums))}`)
	}
	
	function stolenArrayJumping(ns : NS, contract : CodingContract) : void {
		const data = contract.data as number[]
		const n = data.length
		let i = 0
		for (let reach = 0; i < n && i <= reach; ++i) {
			reach = Math.max(i + data[i], reach)
		}
		const solution = (i === n) ? 1 : 0
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(solution)}`)
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt([convert2DArrayToString(result)])}`)
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(ret)}`)
	}
	
	function stolenAlgorithmicStockTraderI(ns : NS, contract : CodingContract) : void {
		const data = contract.data as number[]
		let maxCur = 0
		let maxSoFar = 0
		for (let i = 1; i < data.length; ++i) {
			maxCur = Math.max(0, (maxCur += data[i] - data[i-1]))
			maxSoFar = Math.max(maxCur, maxSoFar)
		}
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(maxSoFar)}`)
	}
	
	function stolenAlgorithmicStockTraderII(ns : NS, contract : CodingContract) : void {
		const data = contract.data as number[]
		let profit = 0
		for (let i = 1; i < data.length; ++i) {
			profit += Math.max(data[i] - data[i - 1],0)
		}
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(profit)}`)
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(release2)}`)
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
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(solver())}`)
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
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(dp[0])}`)
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(currRow[n - 1])}`)
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(answer)}`)
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(res)}`)
	}
	
	function stolenFindValidMaths(ns : NS, contract : CodingContract) : void {
		const data = contract.data as [string, number]
		const num = data[0]
		const target = data[1]
	
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
	
		ns.print(`Completed contract: ${contract.file} on ${contract.host} of type ${contract.type} for the reward:\n${contract.attempt(result)}`)
	}

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