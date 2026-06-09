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
  ["who","🎯 Who to Contact"],["source","🧲 Source Leads"],
  ["territory","🗺️ Territory Manager"],
  ["pipeline","📊 CRM Pipeline"],["campaigns","✉️ Campaigns"],
  ["market","📈 Market Expansion"],["heatmap","🔥 Heat Map"],
  ["analytics","📉 Analytics"],["portfolio","🐋 Portfolio"]
];

// --- In-browser lead classifier (ported from src/lib/classify.ts) ----------
const RULES=[
  ["ymca",["ymca"]],["ywca",["ywca"]],
  ["multi_campus_church",["multi-campus","multi campus"]],
  ["large_church",["church","baptist","fellowship","ministry","parish","chapel","tabernacle","worship","christian center","christian centre","cathedral"]],
  ["montessori",["montessori"]],["preschool",["preschool","pre-school","pre school"]],
  ["early_learning",["early learning","early childhood"]],
  ["daycare",["daycare","day care","child care","childcare","nursery","kindergarten"]],
  ["private_school",["academy","private school","school"]],
  ["childrens_museum",["children's museum","childrens museum","kids museum"]],
  ["science_center",["science centre","science center","discovery science"]],
  ["aviation_museum",["aviation","air museum","space center","space centre"]],
  ["aquarium",["aquarium","sea life","marine"]],
  ["discovery_center",["discovery centre","discovery center"]],
  ["museum",["museum","zoo","heritage"]],["cultural_center",["cultural centre","cultural center"]],
  ["trampoline_park",["trampoline","jump","bounce"]],
  ["play_cafe",["play cafe","play café","cafe & play"]],
  ["birthday_party_center",["party place","party centre","party center"]],
  ["indoor_playground_operator",["indoor playground","playland","play centre","play center","playground","play place","soft play","play zone","playzone"]],
  ["family_entertainment_center",["family entertainment","family fun","fun center","fun centre","fec","entertainment center","entertainment centre","arcade"]],
  ["childrens_activity_center",["activity centre","activity center","kids club","day camp"]],
  ["waterpark",["waterpark","water park","waterslide","water slide"]],
  ["rv_resort",["rv resort","rv park","campground","jellystone"]],
  ["resort",["resort","casino","lodge"]],["hotel",["hotel","inn","suites"]],
  ["sports_complex",["sports complex","sportzone","sports arena","sportsplex","dek hockey","soccer centre","soccer center"]],
  ["athletic_facility",["fitness","gym","gymnastics","athletic","health club","country club","dance academy"]],
  ["municipal_recreation",["aquatic centre","aquatic center","leisure centre","leisure center"]],
  ["parks_recreation",["parks & recreation","parks and recreation","park district","parks dept","parks department"]],
  ["recreation_center",["recreation center","recreation centre","rec center","rec centre","leisure"]],
  ["community_center",["community center","community centre","community & cultural","spark center","spark centre"]],
  ["pediatric_clinic",["pediatric","paediatric","children's clinic","kids dental"]],
  ["childrens_hospital",["children's hospital","childrens hospital"]],
  ["indigenous_community_center",["first nation","indigenous","metis","nation of","band office","friendship centre"]],
  ["library",["library"]],
  ["shopping_center",["mall","shopping centre","shopping center","town centre","outlet"]],
  ["airport_family_zone",["airport","terminal"]],
  ["military_family_resource",["military family","mfrc","cfb"]],
  ["apartment_developer",["apartments","apartment","residences","lofts"]],
  ["mixed_use_development",["mixed-use","mixed use"]],
  ["nonprofit_family_org",["non-profit","nonprofit","foundation","society","boys & girls"]],
];
const CA=["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const US=["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
function classify(name,hint){const hay=(name+" "+(hint||"")).toLowerCase();for(const[ind,terms]of RULES){if(terms.some(t=>hay.includes(t)))return{industry:ind,confidence:80};}return{industry:"nonprofit_family_org",confidence:35};}
function findRegion(line){const toks=(line.toUpperCase().match(/\\b[A-Z]{2}\\b/g))||[];for(const t of toks){if(CA.includes(t))return{region:t,country:"CA"};if(US.includes(t))return{region:t,country:"US"};}return null;}
function splitLine(l){if(l.includes("\\t"))return l.split("\\t");if(l.includes("|"))return l.split("|");if(l.includes(","))return l.split(",");if(l.includes(" - "))return l.split(" - ");return[l];}
const money=n=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
const band=n=>n<75000?"Under $75K":n<150000?"$75K–$150K":n<300000?"$150K–$300K":n<500000?"$300K–$500K":"$500K+";
const maps=o=>(o.lat!=null&&o.lng!=null)?("https://www.google.com/maps/search/?api=1&query="+o.lat+","+o.lng):("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([o.name,o.city,o.region,o.country].filter(Boolean).join(", ")));
const nurl=u=>u?(/^https?:\\/\\//i.test(u)?u:"https://"+u.replace(/^\\/+/,"")):"";
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
    +'<div class="tag" style="margin-top:2px">'+esc(r.industry)+' · '+esc(r.city)+', '+esc(r.region)+' · Tier '+r.scores.tier+'</div>'
    +'<div style="margin-top:4px;font-size:12px"><a href="'+maps({name:r.name,city:r.city,region:r.region,country:r.country})+'" target="_blank" style="color:var(--muted)">📍 Map</a>'+(r.website?' &nbsp; <a href="'+esc(nurl(r.website))+'" target="_blank" style="color:var(--muted)">🔗 Website</a>':'')+'</div></div>'+ring(r.scores.opportunity)+'</div>'
    +'<ul class="reasons">'+r.reasons.slice(0,4).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'
    +'<div class="bars">'+bar("Playground Fit",r.scores.playgroundFit)+bar("Budget Likelihood",r.scores.budgetLikelihood)+bar("Family Traffic",r.scores.familyTraffic)+bar("Decision-Maker Access",r.scores.decisionMakerAccess)+bar("Revenue Potential",r.scores.revenuePotential)+bar("Lead Qualification",r.leadScore)+'</div>'
    +'<div class="kv"><div><div class="lbl">Est. Value (indicative)</div><div class="v" title="Every playground is custom-scoped.">'+money(r.estimatedValue.low)+'–'+money(r.estimatedValue.high)+'</div></div>'
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
      return '<div class="card" style="margin-bottom:12px"><div class="row"><div><span class="muted" style="font-weight:700">#'+(i+1)+'</span> <b>'+esc(r.name)+'</b> <span class="tag">'+esc(r.industry)+' · '+esc(r.city)+', '+esc(r.region)+'</span>'+'<div class="tag"><a href="'+maps({name:r.name,city:r.city,region:r.region,country:r.country})+'" target="_blank">📍 Map</a>'+(r.website?' &nbsp; <a href="'+esc(nurl(r.website))+'" target="_blank">🔗 '+esc(r.website.replace(/^https?:\\/\\//,""))+'</a>':"")+'</div></div>'
      +'<div style="text-align:right"><div class="lbl muted">Opportunity</div><div style="color:'+col(r.scores.opportunity)+';font-weight:700">'+r.scores.opportunity+' · '+r.closeProbability+'% close</div></div></div>'
      +'<div class="kv" style="grid-template-columns:repeat(3,1fr)"><div><div class="lbl">Contact</div><div class="v">'+(dm?esc(dm.name):"—")+'</div><div class="tag">'+(dm?esc(dm.email||""):"")+' '+(dm?esc(dm.phone||r.phone||""):"")+'</div></div>'
      +'<div><div class="lbl">Est. Project Size (ind.)</div><div class="v">'+money(r.estimatedValue.low)+'–'+money(r.estimatedValue.high)+'</div></div>'
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
  let out='<h1>Outreach Campaigns & Sequences</h1><p class="sub">Vertical templates with the automated cadence (Day 1 → 30). In the app you find contact emails, then move any account into a sequence — emails are pre-generated and scheduled.</p>'
    +'<div class="grid g2">'+DATA.campaigns.map(c=>'<div class="card"><div class="row"><b>'+esc(c.name)+'</b><span class="pill b-cold">'+esc(c.vertical)+'</span></div>'
      +'<div style="margin-top:6px">'+c.focusPoints.map(f=>'<span class="chip">'+esc(f)+'</span>').join("")+'</div>'
      +'<div class="lbl muted" style="margin-top:14px;font-size:11px;text-transform:uppercase">Automated Cadence</div>'
      +'<div style="margin-top:8px">'+c.cadence.map(s=>'<div style="display:flex;gap:10px;align-items:center;margin:6px 0"><span class="chip" style="width:60px;justify-content:center">Day '+s.day+'</span><span>'+(icon[s.channel]||"")+' '+esc(s.label)+'</span></div>').join("")+'</div></div>').join("")+'</div>';

  const sq=DATA.sampleSequence;
  if(sq){
    const fmt=iso=>new Date(iso).toLocaleDateString("en-CA",{month:"short",day:"numeric"});
    out+='<h2 class="section-title" style="margin:22px 0 10px">Sample sequence enrollment — '+esc(sq.leadName)+'</h2>'
      +'<div class="note">This is what "move into a sequence" produces: each step scheduled, with the email written and ready. Marking step 1 sent advances the account to Contacted — and with Gmail connected, each email lands in your Gmail Drafts for review (or sends automatically).</div>'
      +'<div class="card"><div class="row"><b>'+esc(sq.campaignName)+'</b><span class="pill b-warm">active</span></div><ol style="list-style:none;padding:0;margin:12px 0 0">'
      +sq.steps.map((s,i)=>'<li style="border:1px solid '+(i===0?"var(--green)":"#143a54")+';border-radius:9px;padding:10px;margin:6px 0;background:rgba(6,18,28,.4)"><div style="display:flex;justify-content:space-between"><span><span class="muted">Day '+s.day+'</span> &nbsp;'+(icon[s.channel]||"")+' '+esc(s.label)+'</span><span class="tag">'+(i===0?'<span class="hl">due '+fmt(s.dueAt)+'</span>':'due '+fmt(s.dueAt))+'</span></div>'
        +(s.subject?'<details style="margin-top:6px"><summary class="tag">Subject: '+esc(s.subject)+'</summary><pre style="white-space:pre-wrap;font-family:inherit;color:var(--ink);margin:6px 0 0">'+esc(s.body)+'</pre></details>':'')+'</li>').join("")
      +'</ol></div>';
  }
  return out;
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
  return '<h1>Real Orca Coast Portfolio</h1><p class="sub">'+rows.length+' real completed projects (CA + US) — the reference set powering lookalike matching. Names, locations & websites are real. Value bands are indicative only: every playground is custom-scoped, so no fixed price is implied.</p>'
    +'<div style="margin-bottom:14px"><input id="psearch" type="search" placeholder="Filter by name, city, category…"></div>'
    +'<div class="tablewrap"><table id="ptable"><thead><tr><th>Organization</th><th>Category</th><th>Location</th><th>Value Band (ind.)</th><th>Vet</th></tr></thead><tbody>'
    +rows.map(p=>'<tr><td><b>'+esc(p.name.split(/[:–]/)[0])+'</b></td><td class="muted">'+esc(p.industry)+'</td><td class="muted">'+esc([p.city,p.region].filter(Boolean).join(", "))+' '+p.country+'</td><td class="muted">'+band(p.value)+'</td><td><a href="'+maps({name:p.name.split(/[:–]/)[0],city:p.city,region:p.region,country:p.country})+'" target="_blank">📍 Map</a>'+(p.website?' · <a href="'+esc(nurl(p.website))+'" target="_blank">🔗 Site</a>':"")+'</td></tr>').join("")
    +'</tbody></table></div>';
}

function view_source(){
  setTimeout(()=>{
    const btn=document.getElementById("clsBtn");if(!btn)return;
    btn.onclick=()=>{
      const txt=document.getElementById("clsIn").value;
      const def=(document.getElementById("clsRegion").value||"").toUpperCase();
      const lines=txt.split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean);
      const tax=DATA.taxonomy;const out=[];
      for(const line of lines){
        const parts=splitLine(line).map(s=>s.trim());const name=parts[0];if(!name||/^name$/i.test(name))continue;
        let reg=null,ctry=null;const fr=findRegion(line);
        if(parts[2]&&(CA.includes(parts[2].toUpperCase())||US.includes(parts[2].toUpperCase()))){reg=parts[2].toUpperCase();ctry=CA.includes(reg)?"CA":"US";}
        else if(fr){reg=fr.region;ctry=fr.country;}
        else if(def){reg=def;ctry=CA.includes(def)?"CA":(US.includes(def)?"US":null);}
        const c=classify(name,parts[2]);const meta=tax[c.industry]||{label:c.industry,tier:6};
        out.push({name,industry:meta.label,tier:meta.tier,region:reg,warn:reg?"":"no region"});
      }
      out.sort((a,b)=>a.tier-b.tier);
      const tierColor=t=>t<=1?"var(--good)":t<=2?"var(--cold)":t<=4?"var(--warm)":"var(--muted)";
      document.getElementById("clsOut").innerHTML=out.length?
        '<div class="note">'+out.length+' organizations classified & tiered (sorted best-fit first). In the full app these are deduped, scored, and one click adds them to the CRM.</div><div class="tablewrap"><table><thead><tr><th>Organization</th><th>Classified As</th><th>Tier</th><th>Region</th></tr></thead><tbody>'
        +out.map(r=>'<tr><td><b>'+esc(r.name)+'</b></td><td class="muted">'+esc(r.industry)+'</td><td style="color:'+tierColor(r.tier)+';font-weight:700">Tier '+r.tier+'</td><td class="muted">'+(r.region||'<span style="color:var(--warm)">set region</span>')+'</td></tr>').join("")
        +'</tbody></table></div>':'<div class="note">Nothing parsed — paste at least one organization.</div>';
    };
  },0);
  const sample="YMCA of Greater Vancouver, Vancouver, BC\\nWoodlands Family Church, Plano, TX\\nLittle Sprouts Daycare, Calgary, AB\\nRiverbend Trampoline Park, Boise, ID\\nOkanagan Regional Library, Kelowna, BC\\nComanche Nation Community Center, Lawton, OK";
  return '<h1>Source the Right Clients</h1><p class="sub">The #1 job: keep the funnel full. Paste a list from any directory, spreadsheet, or search — every line is auto-classified into the 6-tier prospect taxonomy and ranked best-fit first. (This tab runs the real classifier live, in your browser.)</p>'
    +'<div class="grid g3" style="margin-bottom:16px">'
    +'<div class="card"><b>📋 Import a list</b><div class="note" style="margin-top:6px">Paste directory exports / spreadsheets / search results → classified, scored, deduped, added to CRM. <i>Try it below.</i></div></div>'
    +'<div class="card"><b>✨ Enrich</b><div class="note" style="margin-top:6px">One click fills firmographics (size, facility, locations, budget, traffic), finds contact emails + role inboxes, and pulls people/socials (signal inference offline; Hunter/Apollo/Clearbit + website scraping live). Re-scores instantly — e.g. a bare imported YMCA jumped Opportunity 63 → 78.</div></div>'
    +'<div class="card"><b>📧 Sequence &amp; track</b><div class="note" style="margin-top:6px">Move a contact into a Gmail-connected sequence, then track everything: activity timeline, auto-logged stage changes, and reply tracking that pauses the cadence and moves the lead to Responded.</div></div></div>'
    +'<div class="card"><b>Live import classifier</b>'
    +'<div class="note" style="margin:6px 0 10px">Format: <code>Name, City, REGION</code> (region optional if a default is set).</div>'
    +'<textarea id="clsIn" rows="6" style="width:100%;background:#06121c;border:1px solid #143a54;color:#fff;border-radius:9px;padding:10px;font-family:ui-monospace,monospace;font-size:12px">'+sample+'</textarea>'
    +'<div style="display:flex;gap:10px;align-items:center;margin-top:10px"><input id="clsRegion" placeholder="Default region (e.g. BC)" style="width:200px;background:#06121c;border:1px solid #143a54;color:#fff;border-radius:9px;padding:8px 10px"><button id="clsBtn" style="background:var(--green);color:#fff;border:0;border-radius:9px;padding:9px 16px;font-weight:600;cursor:pointer">Classify & tier</button></div>'
    +'<div id="clsOut" style="margin-top:14px"></div></div>';
}

const VIEWS={who:view_who,source:view_source,territory:view_territory,pipeline:view_pipeline,campaigns:view_campaigns,market:view_market,heatmap:view_heatmap,analytics:view_analytics,portfolio:view_portfolio};
function show(id){document.getElementById("view").innerHTML=VIEWS[id]();document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.id===id));window.scrollTo(0,0);}
const nav=document.getElementById("nav");
TABS.forEach(([id,label])=>{const b=document.createElement("button");b.textContent=label;b.dataset.id=id;b.onclick=()=>show(id);nav.appendChild(b);});
show("who");
</script>
</body>
</html>`;

fs.writeFileSync(path.join(process.cwd(), "demo.html"), html);
console.log("wrote demo.html", (html.length / 1024).toFixed(0) + "kb");
