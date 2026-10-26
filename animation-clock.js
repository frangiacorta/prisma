// The timeline measures the video; the motion clock can keep its original cadence.
export function motionPeriod(s){return s.keepMotionSpeed!==false&&s.motionPeriod>0?s.motionPeriod:Math.max(.001,s.duration||12);}
export function animationPhase(s,phase){return phase*Math.max(.001,s.duration||12)/motionPeriod(s);}
export function setDuration(s,value){
 const previous=s.duration||12;
 if(s.keepMotionSpeed!==false&&!(s.motionPeriod>0))s.motionPeriod=previous;
 s.duration=value;
 return previous/value;
}
export function clockStatus(s){
 const period=motionPeriod(s),repeats=s.duration/period,closed=s.perfectLoop!==false&&Math.abs(repeats-Math.round(repeats))<1e-6;
 const seconds=(period/(s.speed||1)).toFixed(2);
 return (s.keepMotionSpeed!==false?`Cadenza conservata: ciclo base di ${seconds} s. `:'Il movimento si adatta alla durata. ')+(closed?'La durata contiene cicli completi.':'La fine del video può interrompere il movimento: per chiuderlo usa un multiplo del ciclo base.');
}
