import { NextResponse } from "next/server";
import { getSiteByTraceKey } from "@/lib/studio/modules";
import { getDb } from "@/lib/storage/database";

type TagRule = {
  id: string; name: string; tag_type: string; trigger_type: string; trigger_value: string;
};

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const key = params.get("k") || params.get("key") || "";
  if (!key) {
    return new NextResponse("// missing key", {
      status: 400,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const site = getSiteByTraceKey(key);
  if (!site) {
    return new NextResponse("// invalid key", {
      status: 403,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  // Active tag-manager rules are baked into the script (cached 5 min).
  let rules: TagRule[] = [];
  try {
    rules = getDb()
      .prepare(
        `SELECT id, name, tag_type, trigger_type, trigger_value
         FROM trace_tag_rules WHERE site_id = ? AND status = 'active'`,
      )
      .all(site.siteId) as TagRule[];
  } catch { /* table may not exist yet */ }

  const collectUrl = `${new URL(req.url).origin}/api/studio/trace/collect`;

  const js = `(function(){
  var k=${JSON.stringify(key)};
  var RULES=${JSON.stringify(rules)};
  var URL=${JSON.stringify(collectUrl)};
  var sid="";
  try{sid=localStorage.getItem("ayeba_trace")||"";}catch(e){}
  if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem("ayeba_trace",sid);}catch(e){}}
  var start=Date.now(),maxScroll=0,sentScroll={};
  function send(p){
    p.k=k;p.sessionId=sid;p.path=location.pathname+location.search;
    p.referrer=document.referrer||"";p.title=document.title||"";
    p.screenResolution=screen.width+"x"+screen.height;
    p.language=navigator.language||"";p.timezone="";
    try{p.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
    var body=JSON.stringify(p);
    if(navigator.sendBeacon){navigator.sendBeacon(URL,new Blob([body],{type:"application/json"}));}
    else{fetch(URL,{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:true,credentials:"omit"}).catch(function(){});}
  }
  function matchTrigger(rule){
    var t=rule.trigger_type,v=rule.trigger_value||"";
    if(t==="all_pages")return true;
    if(t==="path_contains")return location.pathname.indexOf(v)>-1;
    return false;
  }
  function scrollPct(){
    var h=document.documentElement;
    var max=h.scrollHeight-h.clientHeight;
    return max<=0?100:Math.min(100,Math.round((window.scrollY/max)*100));
  }
  // --- Pageview ---
  send({eventType:"pageview"});
  // --- Scroll depth (always tracked; tag rules can target thresholds) ---
  var hasScrollRule=RULES.some(function(r){return r.tag_type==="scroll"||r.trigger_type==="scroll_depth";});
  window.addEventListener("scroll",function(){
    var p=scrollPct();if(p>maxScroll)maxScroll=p;
    [25,50,75,100].forEach(function(th){
      if(maxScroll>=th&&!sentScroll[th]){sentScroll[th]=1;
        RULES.forEach(function(r){
          if((r.tag_type==="scroll"||r.trigger_type==="scroll_depth")&&matchTrigger(r)){
            var want=parseInt(r.trigger_value)||0;
            if(!want||th>=want)send({eventType:"scroll",scrollDepth:th,data:{tag:r.name}});
          }
        });
        if(!hasScrollRule)send({eventType:"scroll",scrollDepth:th});
      }
    });
  },{passive:true});
  // --- Click tags (CSS selector triggers) ---
  var clickRules=RULES.filter(function(r){return r.trigger_type==="click_element"&&r.trigger_value;});
  if(clickRules.length){document.addEventListener("click",function(e){
    var el=e.target;
    clickRules.forEach(function(r){
      try{if(el.closest&&el.closest(r.trigger_value))send({eventType:"click",data:{tag:r.name,selector:r.trigger_value}});}catch(x){}
    });
  },true);}
  // --- Custom event API: ayebaTrack("signup",{plan:"pro"}) ---
  var eventRules=RULES.filter(function(r){return r.trigger_type==="event_name";});
  window.ayebaTrack=function(name,data){
    var fired=eventRules.filter(function(r){return r.trigger_value===name;});
    var type=fired.length?fired[0].tag_type:"event";
    send({eventType:type==="event"?"event":type,data:Object.assign({name:name},data||{})});
  };
  // --- Engagement ping on exit ---
  function bye(){
    send({eventType:"engagement",durationMs:Date.now()-start,scrollDepth:maxScroll});
  }
  if("onpagehide" in window){window.addEventListener("pagehide",bye);}
  else{window.addEventListener("beforeunload",bye);}
  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="hidden")bye();
  });
})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
