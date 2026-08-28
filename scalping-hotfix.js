/* Tyga Financials — scalping quality hotfix.
 * Removes the old RSI-divergence condition because its prior comparison
 * treated lower RSI + lower price as bullish divergence. True bullish divergence
 * requires price lower-low with RSI higher-low; bearish is the inverse.
 * Until the core engine is replaced, this wrapper prevents the incorrect RSI
 * vote from creating or strengthening signals.
 */
(() => {
  'use strict';
  let installed=false;
  function install(){
    const api=window.TygaScalper;
    if(installed||!api?.strategies)return false;
    const original=api.strategies;
    api.strategies=function(c,o={}){
      const out=original(c,o);
      return out.map(s=>{
        if(!s.reasons?.includes('RSI_DIVERGENCE'))return s;
        const reasons=s.reasons.filter(x=>x!=='RSI_DIVERGENCE');
        return reasons.length?{...s,reasons,score:Math.min(s.score,reasons.length/5)}:null;
      }).filter(Boolean);
    };
    api.quality={rsiDivergence:'disabled-until-corrected',lookahead:'closed-candle-only',entry:'next-candle-open'};
    installed=true;return true;
  }
  const timer=setInterval(()=>{if(install())clearInterval(timer)},100);setTimeout(()=>clearInterval(timer),30000);
})();
