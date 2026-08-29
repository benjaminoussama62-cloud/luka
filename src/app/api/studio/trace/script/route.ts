import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("k") || "";
  if (!key) {
    return new NextResponse("// missing key", {
      status: 400,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const js = `(function(){
  var k=${JSON.stringify(key)};
  var sid=localStorage.getItem("ayeba_trace")||("");
  if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("ayeba_trace",sid);}
  var payload=JSON.stringify({k:k,path:location.pathname+location.search,referrer:document.referrer||"",sessionId:sid});
  var url="https://ayeba.app/api/studio/trace/collect";
  if(navigator.sendBeacon){navigator.sendBeacon(url,new Blob([payload],{type:"application/json"}));}
  else{fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:payload,keepalive:true,credentials:"omit"}).catch(function(){});}
})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
