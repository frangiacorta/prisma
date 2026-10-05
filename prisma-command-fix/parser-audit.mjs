import fs from 'node:fs';
import {newCreation,motionPreset} from '/workspace/prisma-studio/dist/creative-model.js';
import {interpretDescription,applyDescriptionPlan} from '/workspace/prisma-studio/dist/description.js';
const current=newCreation();motionPreset(current,'wave');current.motions.deform.curve='triangle';current.lights[0].orbit.enabled=true;current.lights[0].orbit.mode='wave';current.lights[0].orbit.curve='triangle';current.lights[1].pulse.enabled=true;current.lights[1].pulse.curve='triangle';
const phrases=['rendilo morbido nel movimento','movimento più morbido','rendi più morbida la rotazione','rendilo fluido','movimento più fluido','rendilo più lento','rallenta il movimento','movimento lento e rilassante','movimento meno brusco','movimento senza scatti','movimento più delicato','non rendere il movimento più morbido','non cambiare il movimento, rendi la materia più ruvida','rendi la texture più morbida','trasparenza 80%','radici nodose che entrano ed escono dalla sfera'];
const results=phrases.map(text=>{try{const plan=interpretDescription(text,current),result=applyDescriptionPlan(current,plan);return{text,plan,changed:result.changed,diff:Object.keys(current).filter(k=>JSON.stringify(current[k])!==JSON.stringify(result.state[k]))};}catch(error){return{text,error:error.message};}});
fs.writeFileSync('/workspace/prisma-command-fix/parser-audit.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
