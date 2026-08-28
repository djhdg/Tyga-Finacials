import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../scalping-strategies.js',import.meta.url),'utf8');
const context={window:{},console}; vm.createContext(context); vm.runInContext(source,context,{filename:'scalping-strategies.js'});
const api=context.window.TygaScalper;
if(!api?.backtest||!api?.strategies) throw new Error('TygaScalper API missing');
const candles=[]; let p=100;
for(let i=0;i<220;i++){const drift=i%17===0?2:(i%5===0?-0.6:0.2);const open=p,close=p+drift,high=Math.max(open,close)+0.35,low=Math.min(open,close)-0.35;candles.push({epoch:i,open,high,low,close,volume:1000});p=close;}
const signals=api.strategies(candles,{minConfirm:1});
const result=api.backtest(candles,{minConfirm:1,maxBars:8});
for(const t of result.trades){if(!(t.entryIndex>0&&t.entryIndex<candles.length))throw new Error('Invalid entry index');if(t.exitIndex<t.entryIndex)throw new Error('Exit precedes entry');}
if(!Number.isFinite(result.netR))throw new Error('Non-finite net R');
for(const s of signals)if(s.i+1>=candles.length)throw new Error('Signal cannot enter beyond dataset');
console.log(`PASS: ${signals.length} signals, ${result.total} completed trades, netR=${result.netR.toFixed(2)}`);
