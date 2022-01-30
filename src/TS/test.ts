import { Division, NS, Warehouse } from '@ns'
import { sleep } from '/TS/functions'

export async function main(ns : NS) : Promise<void> {
	ns.clearLog()
	ns.tail()
	
	while (true) {
		for (const division of ns.corporation.getCorporation().divisions) {
			for (const city of division.cities) {
				const corp = () => ns.corporation.getCorporation()
				const office    = () => ns.corporation.getOffice(division.name, city)
				// const warehouse = () => ns.corporation.getWarehouse(division.name,city)

				// Get employees and set jobs
				while (office().size > office().employees.length) {
					ns.corporation.hireEmployee(division.name,city)
				}
				for (const job of ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development']) {
					const employ = office().employeeProd
					console.log(office());
					
					if ((employ.Unassigned > 0) || (employ.Training > 0)) {
						await ns.corporation.setAutoJobAssignment(division.name,city,job,Math.floor(office().employees.length / 5))
					}
				}

				// Upgrade & manage warehouse
				while (ns.corporation.getUpgradeWarehouseCost(division.name, city) < (corp().revenue / division.cities.length)) {
					ns.corporation.upgradeWarehouse(division.name, city)
				}
				
			}
		}
		await sleep(10e3)
	}

	//stolen code - https://discordapp.com/channels/415207508303544321/923445881389338634/932919348069273611
	/* async function setWarehouse(ns : NS, warehouse : Warehouse, division : Division, city : string) {
		const divisionName = division.name
		const S = warehouse.size * 0.75

		const materials = ['Hardware','Robots','AI Cores','Real Estate']
		const size   = [0.06, 0.5, 0.1, 0.005]
		const factor = [0.15, 0.2, 0.15, 0.15]

		const x = getOptimalSolution(S, size, factor);
		const targetMaterials = {'Hardware' : x[0], 'Robots' : x[1], 'AI Cores' : x[2], 'Real Estate' : x[3]}
		const currentMaterials = {}
		materials.forEach(mat => Object.assign(currentMaterials,{ mat : ns.corporation.getMaterial(divisionName,city,mat)}))

		for (const material of materials) {
			const curr = currentMaterials[material as keyof typeof currentMaterials]
			const tgt  = targetMaterials[material as keyof typeof targetMaterials]
			if (curr < tgt) { ns.corporation.buyMaterial(divisionName,city,material,tgt - curr) }
		}

		await sleep(50)

		function getStorageUsed(size : number[], x : number[]) {
			return x[0]*size[0] + x[1]*size[1] + x[2]*size[2] + x[3]*size[3];
		}
		
		function cityMult(f : number[], x : number[]) {
			return (0.002*x[0]+1)**f[0] * (0.002*x[1]+1)**f[1] * (0.002*x[2]+1)**f[2] * (0.002*x[3]+1)**f[3];
		}
		
		function getOptimalSolution(S : number, size : number[], factor : number[]) {
			const candidateSolutions = getCandidateSolutions(S,size,factor);
			const scores = candidateSolutions.map(x => cityMult(factor,x));
			const maxScore = Math.max(...scores);
			const maxIdx = scores.findIndex(s=> s==maxScore);
			return candidateSolutions[maxIdx];
		}
		
		function getCandidateSolutions(S : number, size : number[], factor : number[]){
			const solutions = [];
			let x0,x1,x2,x3,tmp;
			solutions.push([0,0,0,0]);
			solutions.push([S/size[0],0,0,0]);
			solutions.push([0,S/size[1],0,0]);
			solutions.push([0,0,S/size[2],0]);
			solutions.push([0,0,0,S/size[3]]);
			
			x2 = (0.002*S*factor[2] + size[3]*factor[2] - size[2]*factor[3])/(size[2]*0.002*(factor[2] + factor[3]));
			x3 = (S - x2*size[2])/size[3];
			solutions.push([0,0,x2,x3]);
			
			x1 = (0.002*S*factor[1] + size[3]*factor[1] - size[1]*factor[3])/(size[1]*0.002*(factor[1] + factor[3]));
			x3 = (S - x1*size[1])/size[3];
			solutions.push([0,x1,0,x3]);
			
			x1 = (0.002*S*factor[1] + size[2]*factor[1] - size[1]*factor[2])/(size[1]*0.002*(factor[1] + factor[2]));
			x2 = (S - x1*size[1])/size[2];
			solutions.push([0,x1,x2,0]);
		
			x0 = (0.002*S*factor[0] + size[3]*factor[0] - size[0]*factor[3])/(size[0]*0.002*(factor[0] + factor[3]));
			x3 = (S - x0*size[0])/size[3];
			solutions.push([x0,0,0,x3]);
		
			x0 = (0.002*S*factor[0] + size[2]*factor[0] - size[0]*factor[2])/(size[0]*0.002*(factor[0] + factor[2]));
			x2 = (S - x0*size[0])/size[2];
			solutions.push([x0,0,x2,0]);
		
			x0 = (0.002*S*factor[0] + size[1]*factor[0] - size[0]*factor[1])/(size[0]*0.002*(factor[0] + factor[1]));
			x1 = (S - x0*size[0])/size[1];
			solutions.push([x0,x1,0,0]);
			
			tmp = size[3]*0.002*(factor[0]+factor[1]+factor[2])/(S*0.002 + size[0] + size[1] + size[2]) - factor[3]*0.002;
			x0 = factor[0]*size[3]/(size[0]*(factor[3]*0.002 + tmp)) - 0.002;
			x1 = factor[1]*size[3]/(size[1]*(factor[3]*0.002 + tmp)) - 0.002;
			x2 = factor[2]*size[3]/(size[2]*(factor[3]*0.002 + tmp)) - 0.002;
			solutions.push([x0,x1,x2,0]);
			
			tmp = size[2]*0.002*(factor[0]+factor[1]+factor[3])/(S*0.002 + size[0] + size[1] + size[3]) - factor[2]*0.002;
			x0 = factor[0]*size[2]/(size[0]*(factor[2]*0.002 + tmp)) - 0.002;
			x1 = factor[1]*size[2]/(size[1]*(factor[2]*0.002 + tmp)) - 0.002;
			x3 = factor[3]*size[2]/(size[3]*(factor[2]*0.002 + tmp)) - 0.002;
			solutions.push([x0,x1,0,x3]);
		
			tmp = size[1]*0.002*(factor[0]+factor[3]+factor[2])/(S*0.002 + size[0] + size[3] + size[2]) - factor[1]*0.002;
			x0 = factor[0]*size[1]/(size[0]*(factor[1]*0.002 + tmp)) - 0.002;
			x2 = factor[2]*size[1]/(size[2]*(factor[1]*0.002 + tmp)) - 0.002;
			x3 = factor[3]*size[1]/(size[3]*(factor[1]*0.002 + tmp)) - 0.002;
			solutions.push([x0,0,x2,x3]);
		
			tmp = size[0]*0.002*(factor[1]+factor[3]+factor[2])/(S*0.002 + size[1] + size[3] + size[2]) - factor[0]*0.002;
			x1 = factor[1]*size[0]/(size[1]*(factor[0]*0.002 + tmp)) - 0.002;
			x2 = factor[2]*size[0]/(size[2]*(factor[0]*0.002 + tmp)) - 0.002;
			x3 = factor[3]*size[0]/(size[3]*(factor[0]*0.002 + tmp)) - 0.002;
			solutions.push([0,x1,x2,x3]);
			
			x0 = ((S*0.002 + size[1] + size[2] + size[3])*factor[0]/size[0] - factor[1] - factor[2] - factor[3])/(0.002*(factor[0]+factor[1]+factor[2]+factor[3]));
			x1 = ((0.002*x0+1)*factor[1]*size[0]/(factor[0]*size[1]) - 1)/0.002;
			x2 = ((0.002*x0+1)*factor[2]*size[0]/(factor[0]*size[2]) - 1)/0.002;
			x3 = ((0.002*x0+1)*factor[3]*size[0]/(factor[0]*size[3]) - 1)/0.002;
			solutions.push([x0,x1,x2,x3]);

			return solutions.filter(x => x[0]>=0 && x[1]>=0 && x[2]>=0 && x[3]>=0 && getStorageUsed(size,x) < S + 1e-6);
		}
	} */
}