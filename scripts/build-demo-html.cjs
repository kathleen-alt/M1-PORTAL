// Builds a single self-contained demo.html with the real engine data inlined.
// Open it in any browser — no server, no build, no network.
const fs = require("fs");
const path = require("path");

const data = JSON.parse(fs.readFileSync("/tmp/demo-data.json", "utf8"));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Orca Coast Growth Engine — Demo</title>
<style>
  :root{
    --bg:#06121c; --bg2:#0a1f2e; --card:#0e2436; --line:#143a54;
    --ink:#d9edf8; --muted:#74bde0; --muted2:#3f9bcf;
    --green:#37b54a; --green2:#5bc85f; --greenD:#1f7a34; --blue:#2473a3;
    --hot:#fb7185; --warm:#f59e0b; --cold:#3f9bcf; --good:#34d399;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.45}
  a{color:var(--muted)}
  .wrap{display:flex;min-height:100vh}
  .side{width:240px;flex:0 0 240px;background:rgba(10,31,46,.8);border-right:1px solid #0f2c40;padding:18px 12px;position:sticky;top:0;height:100vh;overflow:auto}
  .brand{display:flex;align-items:center;gap:10px;padding:0 6px 18px}
  .brand b{font-size:14px}
  .brand .grn{color:var(--green2)}
  .brand small{display:block;color:var(--muted);font-size:9px;letter-spacing:.22em;text-transform:uppercase}
  .nav{display:flex;flex-direction:column;gap:4px}
  .nav button{display:flex;gap:10px;align-items:center;background:none;border:0;color:#aed8ee;padding:9px 12px;border-radius:9px;cursor:pointer;font-size:13px;text-align:left;width:100%}
  .nav button:hover{background:#0f2c40}
  .nav button.active{background:var(--greenD);color:#fff;font-weight:600}
  .main{flex:1;overflow:auto}
  .inner{max-width:1180px;margin:0 auto;padding:28px}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:var(--muted);max-width:760px;margin:0 0 22px}
  .grid{display:grid;gap:16px}
  .g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
  .card{background:rgba(10,31,46,.6);border:1px solid rgba(20,58,84,.6);border-radius:13px;padding:18px}
  .stat .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  .stat .val{font-size:24px;font-weight:700;color:#fff;margin-top:4px}
  .pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600}
  .b-hot{background:rgba(251,113,133,.2);color:#fda4b4;border:1px solid rgba(251,113,133,.4)}
  .b-warm{background:rgba(245,158,11,.2);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
  .b-cold{background:rgba(63,155,207,.2);color:#aed8ee;border:1px solid rgba(63,155,207,.4)}
  .chip{display:inline-flex;background:rgba(20,58,84,.6);border:1px solid #143a54;border-radius:999px;padding:3px 9px;font-size:11px;margin:3px 4px 0 0}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
  .reasons{margin:12px 0 0;padding:0;list-style:none}
  .reasons li{margin:3px 0;padding-left:14px;position:relative}
  .reasons li:before{content:"•";position:absolute;left:0;color:var(--green2)}
  .bars{display:grid;grid-template-columns:1fr 1fr;gap:6px 22px;margin-top:14px}
  .bar .t{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:3px}
  .bar .track{height:6px;background:#143a54;border-radius:999px;overflow:hidden}
  .bar .fill{height:100%;border-radius:999px}
  .ring{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;flex:0 0 60px}
  .ring .in{width:46px;height:46px;border-radius:50%;background:var(--bg2);display:grid;place-items:center;font-weight:700;color:#fff}
  .kv{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;border-top:1px solid #143a54;margin-top:14px;padding-top:12px}
  .kv .lbl{font-size:11px;text-transform:uppercase;color:var(--muted)}
  .kv .v{font-weight:600;color:#fff;margin-top:2px}
  details{margin-top:12px;border:1px solid #143a54;border-radius:9px;background:rgba(6,18,28,.5);padding:10px 12px}
  summary{cursor:pointer;color:#aed8ee;font-weight:500}
  details pre{white-space:pre-wrap;font-family:inherit;color:var(--ink);margin:8px 0 0}
  table{width:100%;border-collapse:collapse}
  th{font-size:11px;text-transform:uppercase;color:var(--muted);text-align:left;padding:10px;background:rgba(10,31,46,.8)}
  td{padding:10px;border-top:1px solid #143a54;vertical-align:top}
  .tablewrap{border:1px solid #143a54;border-radius:13px;overflow:hidden}
  input[type=search]{background:#06121c;border:1px solid #143a54;color:#fff;border-radius:9px;padding:9px 12px;width:280px}
  .cols{display:flex;gap:12px;overflow:auto;padding-bottom:8px}
  .col{flex:0 0 220px;background:rgba(10,31,46,.4);border:1px solid #143a54;border-radius:13px}
  .col h4{margin:0;padding:10px;border-bottom:1px solid #143a54;font-size:13px;display:flex;justify-content:space-between}
  .col .body{padding:8px;display:flex;flex-direction:column;gap:8px;min-height:40px}
  .pcard{background:rgba(20,58,84,.55);border:1px solid #1c5375;border-radius:9px;padding:9px}
  .pcard .nm{font-weight:600;color:#fff;font-size:13px}
  .muted{color:var(--muted)}
  .tag{font-size:10px;color:var(--muted)}
  .hl{color:var(--good);font-weight:700}
  .banner{background:rgba(20,58,84,.4);border:1px solid rgba(36,115,163,.5)}
  .hidden{display:none}
  .note{font-size:12px;color:var(--muted2);margin-bottom:16px}
</style>
</head>
<body>
<div class="wrap">
  <aside class="side">
    <div class="brand">
      <svg width="40" height="40" viewBox="0 0 100 100" aria-label="Orca Coast">
        <defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="#5bc85f"/><stop offset="100%" stop-color="#1f7a34"/></radialGradient></defs>
        <ellipse cx="50" cy="52" rx="46" ry="34" fill="url(#g)" stroke="#15692c" stroke-width="2"/>
        <path d="M22 64 C30 40 48 28 70 26 C60 34 58 42 60 50 C66 46 74 44 80 46 C70 52 64 60 58 70 C46 64 32 64 22 64 Z" fill="#0a1f2e"/>
        <circle cx="52" cy="42" r="3.4" fill="#fff"/>
        <path d="M30 60 C40 56 50 56 56 60 C48 62 38 62 30 60 Z" fill="#d9edf8" opacity=".85"/>
      </svg>
      <div><b><span>Orca</span> <span class="grn">Coast</span></b><small>Growth Engine</small></div>
    </div>
    <nav class="nav" id="nav"></nav>
  </aside>
  <main class="main"><div class="inner" id="view"></div></main>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const TABS = [
  ["who","🎯 Who to Contact"],["territory","🗺️ Territory Manager"],
  ["pipeline","📊 CRM Pipeline"],["campaigns","✉️ Campaigns"],
  ["market","📈 Market Expansion"],["heatmap","🔥 Heat Map"],
  ["analytics","📉 Analytics"],["portfolio","🐋 Portfolio"]
];
const money=n=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
const compact=n=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",notation:"compact",maximumFractionDigits:0}).format(n);
const col=s=>s>=80?"var(--good)":s>=60?"var(--cold)":s>=40?"var(--warm)":"var(--hot)";
const badge=c=>c==="Hot"?"b-hot":c==="Warm"?"b-warm":"b-cold";
const esc=s=>(s||"").replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));
function bar(label,score){return '<div class="bar"><div class="t"><span>'+label+'</span><span style="color:'+col(score)+'">'+score+'</span></div><div class="track"><div class="fill" style="width:'+score+'%;background:'+col(score)+'"></div></div></div>';}
function ring(s){return '<div class="ring" style="background:conic-gradient('+col(s)+' '+(s*3.6)+'deg,#143a54 0deg)"><div class="in">'+s+'</div></div>';}

function recCard(r,i){
  const dm=r.decisionMakers.map(c=>'<span class="chip" title="'+esc(c.email||"")+'">'+esc(c.name)+' — '+esc(c.role)+'</span>').join("");
  const look=r.lookalikes.map(m=>'<span class="chip" title="'+esc(m.reasons.join(" · "))+'">'+esc(m.name)+' ('+m.similarity+'%)</span>').join("");
  return '<div class="card">'
    +'<div class="row"><div><div style="display:flex;gap:8px;align-items:center"><span class="muted" style="font-weight:700">#'+(i+1)+'</span><b style="color:#fff">'+esc(r.name)+'</b><span class="pill '+badge(r.category)+'">'+r.category+'</span></div>'
    +'<div class="tag" style="margin-top:2px">'+esc(r.industry)+' · '+esc(r.city)+', '+esc(r.region)+' · Tier '+r.scores.tier+'</div></div>'+ring(r.scores.opportunity)+'</div>'
    +'<ul class="reasons">'+r.reasons.slice(0,4).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'
    +'<div class="bars">'+bar("Playground Fit",r.scores.playgroundFit)+bar("Budget Likelihood",r.scores.budgetLikelihood)+bar("Family Traffic",r.scores.familyTraffic)+bar("Decision-Maker Access",r.scores.decisionMakerAccess)+bar("Revenue Potential",r.scores.revenuePotential)+bar("Lead Qualification",r.leadScore)+'</div>'
    +'<div class="kv"><div><div class="lbl">Est. Value</div><div class="v">'+money(r.estimatedValue.low)+'–'+money(r.estimatedValue.high)+'</div></div>'
    +'<div><div class="lbl">Close Probability</div><div class="v" style="color:'+col(r.closeProbability)+'">'+r.closeProbability+'%</div></div>'
    +'<div><div class="lbl">Decision Makers</div><div class="v">'+r.decisionMakers.length+'</div></div></div>'
    +(dm?'<div style="margin-top:10px">'+dm+'</div>':"")
    +(look?'<div class="card" style="margin-top:12px;background:rgba(6,18,28,.45)"><div class="lbl muted" style="font-size:11px;text-transform:uppercase">Similar Orca Coast Projects</div><div>'+look+'</div></div>':"")
    +'<details><summary>AI first-touch email — '+esc(r.email.subject)+'</summary><pre>'+esc(r.email.body)+'\\n\\nCTA: '+esc(r.email.cta)+'</pre></details>'
    +'</div>';
}

function view_who(){
  const recs=DATA.recommendations;const a=DATA.analytics;const above=recs.filter(r=>r.scores.opportunity>=80).length;
  return '<h1>Who Should We Contact This Week?</h1><p class="sub">Real Orca Coast portfolio (206 projects). The engine ranks every account by Opportunity Score, matches it to similar past wins, and explains why.</p>'
    +'<div class="grid g4" style="margin-bottom:18px">'
    +stat("Recommended Accounts",recs.length)+stat("Scoring Above 80",above)+stat("Weighted Pipeline",money(a.revenuePipeline))+stat("Top Opportunity",recs[0]?recs[0].scores.opportunity:"—")+'</div>'
    +'<div class="grid g2">'+recs.map(recCard).join("")+'</div>';
}
function stat(l,v){return '<div class="card stat"><div class="lbl">'+l+'</div><div class="val">'+v+'</div></div>';}

function view_territory(){
  return '<h1>AI Territory Manager</h1><p class="sub">The weekly ranked list with contacts, estimated project size, the most similar past customer, and an AI-generated first-touch email per account.</p>'
    +DATA.recommendations.map((r,i)=>{const dm=r.decisionMakers[0];
      return '<div class="card" style="margin-bottom:12px"><div class="row"><div><span class="muted" style="font-weight:700">#'+(i+1)+'</span> <b>'+esc(r.name)+'</b> <span class="tag">'+esc(r.industry)+' · '+esc(r.city)+', '+esc(r.region)+'</span>'+(r.website?'<div class="tag"><a href="'+esc(r.website)+'" target="_blank">'+esc(r.website.replace(/^https?:\\/\\//,""))+'</a></div>':"")+'</div>'
      +'<div style="text-align:right"><div class="lbl muted">Opportunity</div><div style="color:'+col(r.scores.opportunity)+';font-weight:700">'+r.scores.opportunity+' · '+r.closeProbability+'% close</div></div></div>'
      +'<div class="kv" style="grid-template-columns:repeat(3,1fr)"><div><div class="lbl">Contact</div><div class="v">'+(dm?esc(dm.name):"—")+'</div><div class="tag">'+(dm?esc(dm.email||""):"")+' '+(dm?esc(dm.phone||r.phone||""):"")+'</div></div>'
      +'<div><div class="lbl">Est. Project Size</div><div class="v">'+money(r.estimatedValue.low)+'–'+money(r.estimatedValue.high)+'</div></div>'
      +'<div><div class="lbl">Similar Customer</div><div class="v">'+(r.lookalikes[0]?esc(r.lookalikes[0].name):"—")+'</div></div></div>'
      +'<details><summary>AI first-touch email — '+esc(r.email.subject)+'</summary><pre>'+esc(r.email.body)+'</pre></details></div>';
    }).join("");
}

function view_pipeline(){
  const stages=["New Lead","Contacted","Responded","Discovery Call","Proposal Sent","Negotiation","Closed Won","Closed Lost"];
  const byStage={};DATA.recommendations.forEach(r=>{(byStage[r.stage]=byStage[r.stage]||[]).push(r);});
  return '<h1>CRM Pipeline</h1><p class="sub">Accounts across the eight sales stages. Each column totals the potential value in flight. (Drag-and-drop is live in the full app.)</p>'
    +'<div class="cols">'+stages.map(s=>{const cs=byStage[s]||[];const tot=cs.reduce((x,r)=>x+r.estimatedValue.high,0);
      return '<div class="col"><h4>'+s+' <span class="pill b-cold">'+cs.length+'</span></h4><div class="tag" style="padding:0 10px 6px">'+compact(tot)+' potential</div><div class="body">'
        +cs.map(r=>'<div class="pcard"><div class="nm">'+esc(r.name)+'</div><div class="tag">'+esc(r.city)+', '+esc(r.region)+'</div><div style="display:flex;justify-content:space-between;margin-top:6px"><span class="tag">'+compact(r.estimatedValue.high)+'</span><span style="color:'+col(r.scores.opportunity)+';font-weight:700;font-size:12px">'+r.scores.opportunity+'</span></div></div>').join("")
        +'</div></div>';}).join("")+'</div>';
}

function view_campaigns(){
  const icon={email:"✉️",phone:"📞",linkedin:"in",sms:"💬"};
  return '<h1>Outreach Campaign Builder</h1><p class="sub">Vertical templates with the automated cadence (Day 1 → 30). The full app adds an interactive AI email studio.</p>'
    +'<div class="grid g2">'+DATA.campaigns.map(c=>'<div class="card"><div class="row"><b>'+esc(c.name)+'</b><span class="pill b-cold">'+esc(c.vertical)+'</span></div>'
      +'<div style="margin-top:6px">'+c.focusPoints.map(f=>'<span class="chip">'+esc(f)+'</span>').join("")+'</div>'
      +'<div class="lbl muted" style="margin-top:14px;font-size:11px;text-transform:uppercase">Automated Cadence</div>'
      +'<div style="margin-top:8px">'+c.cadence.map(s=>'<div style="display:flex;gap:10px;align-items:center;margin:6px 0"><span class="chip" style="width:60px;justify-content:center">Day '+s.day+'</span><span>'+(icon[s.channel]||"")+' '+esc(s.label)+'</span></div>').join("")+'</div></div>').join("")+'</div>';
}

function view_market(){
  const top=DATA.market.find(m=>m.penetration==="none"||m.penetration==="low");
  const ps={none:"b-hot",low:"b-warm",moderate:"b-cold",strong:"b-cold"};
  return '<h1>Market Expansion Finder</h1><p class="sub">Compares categories Orca Coast has WON against where open leads exist, surfacing under-penetrated verticals.</p>'
    +(top?'<div class="card banner" style="margin-bottom:16px"><div class="lbl muted">Top Recommendation</div><div style="font-size:17px;margin-top:6px">Orca Coast has '+(top.penetration==="none"?"no closed projects":"low penetration")+' in <b>'+esc(top.industry)+'</b>. Estimated market: <b>'+top.estimatedMarketSize+'+</b> organizations. Launch a <b>'+esc(top.industry)+' Outreach Campaign</b>.</div></div>':"")
    +'<div class="tablewrap"><table><thead><tr><th>Category</th><th>Tier</th><th>Penetration</th><th>Past Projects</th><th>Open Leads</th><th>Est. Market</th><th>Recommendation</th></tr></thead><tbody>'
    +DATA.market.map(m=>'<tr><td><b>'+esc(m.industry)+'</b></td><td>Tier '+m.tier+'</td><td><span class="pill '+ps[m.penetration]+'">'+m.penetration+'</span></td><td>'+m.pastProjects+'</td><td>'+m.openLeads+'</td><td>'+m.estimatedMarketSize+'+</td><td class="tag">'+esc(m.recommendation)+'</td></tr>').join("")
    +'</tbody></table></div>';
}

function view_heatmap(){
  const max=Math.max(...DATA.heatmap.map(c=>c.totalPotential),1);const cn={CA:"Canada",US:"United States"};
  return '<h1>Opportunity Heat Map</h1><p class="sub">Provinces/states ranked by expected revenue potential and concentration of high-opportunity organizations.</p>'
    +'<div class="grid g3">'+DATA.heatmap.map(c=>{const it=c.totalPotential/max;
      return '<div class="card" style="background:linear-gradient(135deg,rgba(55,181,74,'+(0.1+it*0.4)+'),rgba(10,31,46,.6))"><div class="row"><b style="font-size:17px">'+esc(c.region)+'</b><span class="tag">'+cn[c.country]+'</span></div>'
      +'<div class="kv" style="border:0;padding-top:10px"><div><div class="lbl">Potential</div><div class="v">'+compact(c.totalPotential)+'</div></div><div><div class="lbl">Leads</div><div class="v">'+c.leadCount+'</div></div><div><div class="lbl">Avg Opp</div><div class="v">'+c.avgOpportunity+'</div></div></div>'
      +'<div class="lbl" style="margin-top:8px">Hot (80+): <span class="hl">'+c.hotLeads+'</span></div></div>';}).join("")+'</div>';
}

function view_analytics(){
  const a=DATA.analytics;const max=Math.max(...a.pipelineByStage.map(s=>s.count),1);
  return '<h1>Analytics Dashboard</h1><p class="sub">Funnel, outreach performance, and revenue pipeline.</p>'
    +'<div class="grid g4" style="margin-bottom:18px">'+stat("Leads Generated",a.leadsGenerated)+stat("Emails Sent",a.emailsSent)+stat("Open Rate",a.openRate+"%")+stat("Reply Rate",a.replyRate+"%")+stat("Meetings Booked",a.meetingsBooked)+stat("Opportunities",a.opportunities)+stat("Revenue Pipeline",money(a.revenuePipeline))+stat("Closed Revenue",money(a.closedRevenue))+'</div>'
    +'<div class="card"><b>Pipeline by Stage</b><div style="margin-top:12px">'+a.pipelineByStage.map(s=>'<div style="display:flex;gap:12px;align-items:center;margin:6px 0"><div style="width:130px" class="muted">'+s.stage+'</div><div style="flex:1;height:24px;background:#143a54;border-radius:6px;overflow:hidden"><div style="height:100%;background:var(--green);border-radius:6px;width:'+Math.max((s.count/max)*100,s.count?8:0)+'%;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:12px;font-weight:600">'+(s.count||"")+'</div></div></div>').join("")+'</div></div>';
}

function view_portfolio(){
  const rows=DATA.portfolio;
  setTimeout(()=>{const inp=document.getElementById("psearch");if(inp)inp.oninput=()=>{const q=inp.value.toLowerCase();
    document.querySelectorAll("#ptable tbody tr").forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(q)?"":"none";});};},0);
  return '<h1>Real Orca Coast Portfolio</h1><p class="sub">'+rows.length+' real completed projects (CA + US) — the reference set powering lookalike matching. Names, locations & websites are real; contract values are derived modeling estimates pending CRM figures.</p>'
    +'<div style="margin-bottom:14px"><input id="psearch" type="search" placeholder="Filter by name, city, category…"></div>'
    +'<div class="tablewrap"><table id="ptable"><thead><tr><th>Organization</th><th>Category</th><th>Location</th><th>Est. Value</th><th>Year</th><th>Website</th></tr></thead><tbody>'
    +rows.map(p=>'<tr><td><b>'+esc(p.name.split(/[:–]/)[0])+'</b></td><td class="muted">'+esc(p.industry)+'</td><td class="muted">'+esc([p.city,p.region].filter(Boolean).join(", "))+' '+p.country+'</td><td>'+money(p.value)+'</td><td class="muted">'+p.year+'</td><td>'+(p.website?'<a href="https://'+esc(p.website.replace(/^https?:\\/\\//,""))+'" target="_blank">link</a>':"—")+'</td></tr>').join("")
    +'</tbody></table></div>';
}

const VIEWS={who:view_who,territory:view_territory,pipeline:view_pipeline,campaigns:view_campaigns,market:view_market,heatmap:view_heatmap,analytics:view_analytics,portfolio:view_portfolio};
function show(id){document.getElementById("view").innerHTML=VIEWS[id]();document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.id===id));window.scrollTo(0,0);}
const nav=document.getElementById("nav");
TABS.forEach(([id,label])=>{const b=document.createElement("button");b.textContent=label;b.dataset.id=id;b.onclick=()=>show(id);nav.appendChild(b);});
show("who");
</script>
</body>
</html>`;

fs.writeFileSync(path.join(process.cwd(), "demo.html"), html);
console.log("wrote demo.html", (html.length / 1024).toFixed(0) + "kb");
