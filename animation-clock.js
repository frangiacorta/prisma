// The timeline measures the video; the motion clock can keep its original cadence.
export function motionPeriod(s){return s.keepMotionSpeed!==false&&s.motionPeriod>0?s.motionPeriod:Math.max(.001,s.duration||12);}
export function animationPhase(s,phase){return phase*Math.max(.001,s.duration||12)/motionPeriod(s);}
export function setDuration(s,value){
 const previous=s.duration||12;
 if(s.keepMotionSpeed!==false&&!(s.motionPeriod>0))s.motionPeriod=previous;
 s.duration=value;
 return previous/value;
}
export function loopStatus(s){
 const period=motionPeriod(s),turns=(s.duration||12)/period;
 const free=s.dynAmount>0;
 const fractional=s.perfectLoop===false||Math.abs(turns-Math.round(turns))>1e-6;
 const temporal=s.finishEnabled!==false&&s.finishFeedback&&s.finishFeedbackMix>0&&(s.finishFeedbackMemory>0||s.finishFeedbackLumen>0);
 return {period,turns,free,fractional,temporal,closed:!free&&!fractional&&!temporal};
}
export function exportLoop(s,method='seam'){
 const status=loopStatus(s),turns=Math.max(1,Math.round(status.turns));
 const state={...s};
 if(method==='natural'){state.duration=status.period*turns;state.perfectLoop=true;}
 if(method==='fit'){state.keepMotionSpeed=true;state.motionPeriod=state.duration/turns;state.perfectLoop=true;}
 const result=loopStatus(state);
 return {state,seconds:state.duration/state.speed,repeat:result.closed,smooth:method==='seam'&&!result.closed,status:result};
}
export function loopSeamAmount(index,total,fps){
 const span=Math.min(Math.max(2,Math.round(fps*.42)),Math.floor(total/3));
 if(span<2||index<total-span)return 0;
 const t=(index-(total-span))/(span-1);
 return t*t*(3-2*t);
}
export function clockStatus(s){
 const {period,closed,free,fractional,temporal}=loopStatus(s);
 const seconds=(period/(s.speed||1)).toFixed(2);
 const cadence=s.keepMotionSpeed!==false?`Ciclo base di ${seconds} s. `:'Il movimento si adatta alla durata. ';
 const issues=[free?'Dinamica libera':null,fractional?'cicli frazionari':null,temporal?'persistenza dei fotogrammi':null].filter(Boolean);
 return cadence+(closed?'Ciclo completo.':issues.join(' · ')+'. Puoi raccordare il video durante l’esportazione.');
}
