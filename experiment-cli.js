/** Local-only experiment preparation and scoring. Do not place reference keys in public web assets. */
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareExperiment,scoreExperiment} from './src/experiment-engine.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
function usage(){console.error('Usage:\n node experiment-cli.js prepare private-design.json public-cases.json private-key.json\n node experiment-cli.js score private-key.json participant-answers.json results.json');process.exitCode=2}
const [command,a,b,c]=process.argv.slice(2);
try {
 if(!a||!b||!c){usage()}
 else if(command==='prepare'){
  const out=prepareExperiment(read(a));
  writeFileSync(b,JSON.stringify(out.public_cases,null,2));
  writeFileSync(c,JSON.stringify(out.private_answer_key,null,2),{mode:0o600});
  console.log('Prepared '+out.private_answer_key.length+' paired cases. KEEP '+c+' PRIVATE.');
 } else if(command==='score'){
  const result=scoreExperiment(read(a),read(b));
  writeFileSync(c,JSON.stringify(result,null,2));console.log(JSON.stringify(result.totals));
 } else usage();
} catch(e){console.error(e.message);process.exitCode=1}