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
  select{background:#06121c;border:1px solid #143a54;color:#fff;border-radius:9px;padding:8px 10px;font-size:13px}
  .btnG{background:var(--green);color:#fff;border:0;border-radius:9px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px}
  .btnG:hover{background:var(--green2)}
  .btn-ghost{background:none;border:1px solid #143a54;color:#aed8ee;border-radius:9px;padding:7px 12px;cursor:pointer;font-size:13px}
  .btn-ghost:hover{background:#0f2c40}
  #ltable tbody tr:hover{background:rgba(20,58,84,.35)}
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
  ["leads","🗂️ Leads Workspace"],
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

// ===================== Interactive engine (ported) =====================
const IM=DATA.industryMeta;
const clampS=(n)=>Math.max(0,Math.min(100,n));
const TBF={1:80,2:68,3:60,4:58,5:48,6:40};
function fitScore(ind,s){const m=IM[ind];let sc=TBF[m.tier]||40;sc+=(s.childFocused!=null?s.childFocused:m.childFocused)?8:-6;if(s.facilitySqFt){if(s.facilitySqFt>=40000)sc+=8;else if(s.facilitySqFt>=15000)sc+=4;else if(s.facilitySqFt<5000)sc-=6;}if(s.locationCount&&s.locationCount>1)sc+=Math.min(8,s.locationCount*2);if(s.hasExistingPlayArea)sc-=4;return Math.round(clampS(sc));}
function budgetScore(s){let sc=50;switch(s.annualBudgetBand){case"over_10m":sc=92;break;case"2m_10m":sc=80;break;case"500k_2m":sc=62;break;case"under_500k":sc=38;break;default:if(s.orgSize){if(s.orgSize>=200)sc=78;else if(s.orgSize>=50)sc=64;else if(s.orgSize>=15)sc=52;else sc=42;}}if(s.growthIndicators&&s.growthIndicators.length)sc+=Math.min(12,s.growthIndicators.length*5);return Math.round(clampS(sc));}
function trafficScore(ind,s){const m=IM[ind];let sc=(s.childFocused!=null?s.childFocused:m.childFocused)?60:35;if(s.weeklyFamilyTraffic){if(s.weeklyFamilyTraffic>=3000)sc=95;else if(s.weeklyFamilyTraffic>=1000)sc=82;else if(s.weeklyFamilyTraffic>=300)sc=68;else sc=50;}if(s.locationCount&&s.locationCount>1)sc+=5;return Math.round(clampS(sc));}
function dmScore(cts){const dm=cts.filter(c=>c.isDecisionMaker);if(dm.length===0)return cts.length===0?15:35;const per=dm.map(c=>{let v=c.confidence*0.5;if(c.email)v+=25;if(c.phone)v+=15;if(c.linkedin)v+=10;return clampS(v);});const avg=per.reduce((a,b)=>a+b,0)/per.length;return Math.round(clampS(avg+Math.min(10,(dm.length-1)*5)));}
function estVal(ind,s){const m=IM[ind];let mult=1;if(s.facilitySqFt){if(s.facilitySqFt>=40000)mult*=1.3;else if(s.facilitySqFt>=15000)mult*=1.1;else if(s.facilitySqFt<5000)mult*=0.8;}if(s.locationCount&&s.locationCount>1)mult*=1+Math.min(1,(s.locationCount-1)*0.15);const r=n=>Math.round(n*mult/1000)*1000;return{low:r(m.baseLow),high:r(m.baseHigh)};}
function revScore(ind,s){const h=estVal(ind,s).high;return Math.round(clampS(40+((h-50000)/650000)*58));}
function scoreOf(l){const pf=fitScore(l.industry,l.signals),bl=budgetScore(l.signals),ft=trafficScore(l.industry,l.signals),dm=dmScore(l.contacts),rp=revScore(l.industry,l.signals);return{playgroundFit:pf,budgetLikelihood:bl,familyTraffic:ft,decisionMakerAccess:dm,revenuePotential:rp,opportunity:Math.round(pf*0.3+bl*0.2+ft*0.2+dm*0.15+rp*0.15),tier:IM[l.industry].tier};}
function qualify(l){const s=l.signals;let sc=30;if(s.orgSize)sc+=s.orgSize>=100?12:s.orgSize>=30?8:4;if(s.facilitySqFt)sc+=s.facilitySqFt>=20000?12:s.facilitySqFt>=8000?7:3;if(s.locationCount&&s.locationCount>1)sc+=Math.min(10,s.locationCount*3);if(s.childFocused!=null?s.childFocused:IM[l.industry].childFocused)sc+=12;if(s.hasExistingPlayArea)sc+=6;sc+=budgetScore(s)*0.15;if(s.growthIndicators&&s.growthIndicators.length)sc+=Math.min(12,s.growthIndicators.length*4);sc=Math.round(clampS(sc));return{score:sc,category:sc>=75?"Hot":sc>=50?"Warm":"Cold"};}
function closeProb(sc){const tf={1:1,2:.9,3:.82,4:.8,5:.7,6:.62}[sc.tier]||.6;return Math.round(clampS((sc.opportunity*.6+sc.decisionMakerAccess*.4)*tf));}
const TBL={1:{orgSize:80,facilitySqFt:30000,annualBudgetBand:"2m_10m",weeklyFamilyTraffic:2000},2:{orgSize:25,facilitySqFt:7000,annualBudgetBand:"500k_2m",weeklyFamilyTraffic:500},3:{orgSize:45,facilitySqFt:25000,annualBudgetBand:"2m_10m",weeklyFamilyTraffic:1500},4:{orgSize:50,facilitySqFt:35000,annualBudgetBand:"2m_10m",weeklyFamilyTraffic:3000},5:{orgSize:120,facilitySqFt:20000,annualBudgetBand:"2m_10m",weeklyFamilyTraffic:800},6:{orgSize:40,facilitySqFt:15000,annualBudgetBand:"500k_2m",weeklyFamilyTraffic:700}};
function enrichSignals(l){const m=IM[l.industry];const b=TBL[m.tier]||TBL[6];const s=l.signals;const notes=[];const lo=l.name.toLowerCase();
 if(s.childFocused==null){s.childFocused=m.childFocused;notes.push("child-focused: "+(m.childFocused?"yes":"no"));}
 if(s.facilitySqFt==null){let q=b.facilitySqFt;if(/(flagship|regional|metro|greater|district|county|central)/.test(lo))q=Math.round(q*1.3);s.facilitySqFt=q;notes.push("facility ~"+q.toLocaleString()+" sqft");}
 if(s.orgSize==null){s.orgSize=b.orgSize;notes.push("org size ~"+b.orgSize);}
 if(s.annualBudgetBand==null){s.annualBudgetBand=b.annualBudgetBand;notes.push("budget "+b.annualBudgetBand);}
 if(s.weeklyFamilyTraffic==null){s.weeklyFamilyTraffic=b.weeklyFamilyTraffic;notes.push("traffic ~"+b.weeklyFamilyTraffic.toLocaleString());}
 if(s.locationCount==null&&/(multi-?campus|multi campus|locations|chain)/.test(lo)){s.locationCount=3;notes.push("multi-location x3");}
 return notes;}
function dom2(w){if(!w)return null;let d=w.toLowerCase().replace(/^https?:\\/\\//,"").replace(/^www\\./,"").split(/[\\/?#]/)[0];return d.indexOf(".")>=0?d:null;}
function guess(name,d){const c=name.replace(/^(dr\\.?|pastor|mr\\.?|ms\\.?|mrs\\.?|rev\\.?)\\s+/i,"").trim().split(/\\s+/);const f=(c[0]||"").toLowerCase().replace(/[^a-z]/g,"");const l=(c.length>1?c[c.length-1]:"").toLowerCase().replace(/[^a-z]/g,"");if(!f)return null;return l?f+"."+l+"@"+d:f+"@"+d;}
function findEmails(lead){const d=dom2(lead.website);if(!d)return 0;let n=0;lead.contacts.forEach(c=>{if(!c.email){const g=guess(c.name,d);if(g){c.email=g;c.confidence=Math.round((c.confidence+55)/2);n++;}}});if(lead.contacts.length===0){lead.contacts.push({id:"role_i",name:"General Inbox",role:"Other",email:"info@"+d,confidence:45,isDecisionMaker:false});lead.contacts.push({id:"role_o",name:"Office",role:"Other",email:"office@"+d,confidence:40,isDecisionMaker:false});n+=2;}return n;}
function firstName(full){return full.replace(/^(Dr\\.|Pastor|Mr\\.|Ms\\.|Mrs\\.|Rev\\.)\\s+/i,"").split(" ")[0];}
function emailFor(lead,type,sim){const dm=lead.contacts.find(c=>c.isDecisionMaker)||lead.contacts[0];const isRole=dm?/inbox|^office$|general/i.test(dm.name):false;const greet=(dm&&!isRole)?("Hi "+firstName(dm.name)+","):"Hello,";const lab=IM[lead.industry].label.split(" ").map(w=>/^[A-Z]{2,4}$/.test(w)?w:w.toLowerCase()).join(" ");const ref=sim||"comparable organizations across Canada and the U.S.";const city=lead.address.city;const cta="Would you be open to a quick 15-minute call next week?";
 if(type==="first_touch")return{subject:"A play space families at "+lead.name+" would love",body:greet+"\\n\\nI lead business development at Orca Coast Playgrounds — we design and install indoor playgrounds for "+lab+"s like "+lead.name+". We recently completed a project for "+ref+", and the response from families has been remarkable.\\n\\nGiven everything happening at "+lead.name+" in "+city+", I think there's a real opportunity to create a destination play experience.\\n\\n"+cta};
 if(type==="follow_up")return{subject:"Following up — indoor play at "+lead.name,body:greet+"\\n\\nCircling back on my note about an indoor playground for "+lead.name+". Organizations we work with typically see higher family visit frequency within the first season.\\n\\n"+cta};
 if(type==="case_study")return{subject:"Case study: "+(sim||"a project like yours"),body:greet+"\\n\\nThought "+(sim||"this")+" might resonate — a similar installation became a centrepiece for the families they serve. I'd love to share the full case study for "+lead.name+".\\n\\n"+cta};
 if(type==="final_check_in")return{subject:"Should I close the loop?",body:greet+"\\n\\nI haven't heard back, so I'll assume the timing isn't right for an indoor playground at "+lead.name+" just yet. I'll leave the door open — whenever families and facilities are on the agenda again, I'd be glad to help."};
 return{subject:"How play space drives family engagement",body:greet+"\\n\\nA quick insight: a well-designed indoor playground is one of the highest-ROI family amenities you can add — more dwell time, repeat visits, and word-of-mouth.\\n\\nGlad to be a resource whenever the timing is right."};}

// ===================== State =====================
const LS="orcaDemoState_v2";
let STATE={leads:JSON.parse(JSON.stringify(DATA.leads)),enroll:{},sel:null,report:{},starredOnly:false};
try{const sv=localStorage.getItem(LS);if(sv){const o=JSON.parse(sv);if(o.leads)STATE.leads=o.leads;if(o.enroll)STATE.enroll=o.enroll;}}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify({leads:STATE.leads,enroll:STATE.enroll}));}catch(e){}}
function leadById(id){return STATE.leads.find(l=>l.id===id);}
function resetDemo(){try{localStorage.removeItem(LS);}catch(e){}STATE.leads=JSON.parse(JSON.stringify(DATA.leads));STATE.enroll={};STATE.sel=null;STATE.report={};STATE.starredOnly=false;show("leads");}

// Contacts CSV export (in-browser download)
function csvEsc(v){const s=v==null?"":String(v);return /[",\\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function leadsCsv(leads){const H=["Organization","Contact","Role","Email","Phone","LinkedIn","Decision Maker","Industry","City","Region","Country","Website","Opportunity","Stage"];const rows=[H.join(",")];leads.forEach(l=>{const opp=scoreOf(l).opportunity;const ind=IM[l.industry].label;if(l.contacts.length===0){rows.push([l.name,"","","",l.phone||"","","",ind,l.address.city||"",l.address.region,l.address.country,l.website||"",opp,l.stage].map(csvEsc).join(","));}else{l.contacts.forEach(c=>{rows.push([l.name,c.name,c.role,c.email||"",c.phone||l.phone||"",c.linkedin||"",c.isDecisionMaker?"yes":"no",ind,l.address.city||"",l.address.region,l.address.country,l.website||"",opp,l.stage].map(csvEsc).join(","));});}});return rows.join("\\n");}
function downloadCsv(name,text){const blob=new Blob([text],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportAllContacts(){const ls=STATE.starredOnly?STATE.leads.filter(l=>l.starred):STATE.leads;downloadCsv(STATE.starredOnly?"orca-contacts-starred.csv":"orca-contacts.csv",leadsCsv(ls));}
function exportLeadContacts(id){const l=leadById(id);if(l)downloadCsv("orca-contacts-"+id+".csv",leadsCsv([l]));}
function toggleStar(id){const l=leadById(id);if(l)l.starred=!l.starred;save();show("leads");}
function toggleStarredFilter(){STATE.starredOnly=!STATE.starredOnly;show("leads");}
function starIcon(on){return '<span style="cursor:pointer;font-size:16px;color:'+(on?"#fbbf24":"#1c5375")+'">'+(on?"★":"☆")+'</span>';}

// Actions (global so inline handlers resolve)
function openLead(id){STATE.sel=id;show("leads");window.scrollTo(0,0);}
function backLeads(){STATE.sel=null;show("leads");}
function doEnrich(id){const l=leadById(id);const before=scoreOf(l).opportunity;const notes=enrichSignals(l);const em=findEmails(l);l.dataConfidence=Math.min(95,l.dataConfidence+12);l.enrichedAt=new Date().toISOString();STATE.report[id]={notes:notes,emails:em,before:before,after:scoreOf(l).opportunity};save();show("leads");}
function doPush(id,campId){const l=leadById(id);const camp=DATA.campaigns.find(c=>c.id===campId)||DATA.campaigns[3];const start=Date.now();const sim=(l.lookalikes&&l.lookalikes[0])?l.lookalikes[0].name:null;const toC=l.contacts.find(c=>c.isDecisionMaker&&c.email)||l.contacts.find(c=>c.email);const toEmail=toC?toC.email:null;const steps=camp.cadence.map(st=>{let em=null;if(st.channel==="email"&&st.emailType)em=emailFor(l,st.emailType,sim);return{day:st.day,channel:st.channel,label:st.label,dueAt:new Date(start+st.day*86400000).toISOString(),subject:em?em.subject:null,body:em?em.body:null,status:"pending",toEmail:st.channel==="email"?toEmail:null};});STATE.enroll[id]={campaignName:camp.name,status:"active",steps:steps,idx:0};if(l.stage==="New Lead")l.stage="Contacted";save();show("leads");}
function markStep(id){const e=STATE.enroll[id];if(!e)return;const st=e.steps[e.idx];if(st)st.status="sent";e.idx++;if(e.idx>=e.steps.length)e.status="completed";save();show("leads");}
function markReplied(id){const e=STATE.enroll[id];if(e&&e.status==="active")e.status="paused";const l=leadById(id);if(l.stage==="New Lead"||l.stage==="Contacted")l.stage="Responded";save();show("leads");}

// ===================== Workspace views =====================
function fmtD(iso){return new Date(iso).toLocaleDateString("en-CA",{month:"short",day:"numeric"});}
function fld(lbl,v){return '<div><div class="lbl">'+lbl+'</div><div class="v">'+(v!=null&&v!==""?v:'<span style="color:var(--muted)">—</span>')+'</div></div>';}

function view_leads(){
  if(STATE.sel)return leadDetail(STATE.sel);
  let rows=STATE.leads.map(l=>({l:l,sc:scoreOf(l),q:qualify(l)}));
  if(STATE.starredOnly)rows=rows.filter(o=>o.l.starred);
  rows.sort((a,b)=>b.sc.opportunity-a.sc.opportunity);
  const starredCount=STATE.leads.filter(l=>l.starred).length;
  setTimeout(()=>{const f=document.getElementById("lf");if(f)f.oninput=()=>{const q=f.value.toLowerCase();document.querySelectorAll("#ltable tbody tr").forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().indexOf(q)>=0?"":"none";});};},0);
  return '<div class="row"><h1>Leads Workspace</h1><div style="display:flex;gap:8px"><button class="btn-ghost" onclick="toggleStarredFilter()">'+(STATE.starredOnly?"Show all":("★ Starred only ("+starredCount+")"))+'</button><button class="btnG" onclick="exportAllContacts()">⬇ Export '+(STATE.starredOnly?"starred":"contacts")+' (CSV)</button><button class="btn-ghost" onclick="resetDemo()">Reset</button></div></div>'
    +'<p class="sub">Every lead at a glance — ★ star your priority leads, click a row to open it, then ✨ enrich and ▶ push to a sequence. Filter and export starred. Changes save in your browser.</p>'
    +'<div style="margin-bottom:12px"><input id="lf" type="search" placeholder="Filter '+rows.length+' leads by name, city, category…"></div>'
    +'<div class="tablewrap"><table id="ltable"><thead><tr><th></th><th>Organization</th><th>Tier</th><th>Location</th><th>Opp</th><th>Category</th><th>Stage</th><th>Contacts</th><th>Sequence</th></tr></thead><tbody>'
    +rows.map(o=>{const l=o.l,sc=o.sc,q=o.q;const e=STATE.enroll[l.id];const we=l.contacts.filter(c=>c.email).length;
      return '<tr style="cursor:pointer" onclick="openLead(\\''+l.id+'\\')"><td style="text-align:center" onclick="event.stopPropagation();toggleStar(\\''+l.id+'\\')">'+starIcon(l.starred)+'</td><td><b>'+esc(l.name)+'</b><div class="tag">'+esc(IM[l.industry].label)+'</div></td><td>T'+sc.tier+'</td><td class="muted">'+esc(l.address.city)+', '+esc(l.address.region)+'</td><td style="color:'+col(sc.opportunity)+';font-weight:700">'+sc.opportunity+'</td><td><span class="pill '+badge(q.category)+'">'+q.category+'</span></td><td class="muted">'+esc(l.stage)+'</td><td class="muted">'+we+'/'+l.contacts.length+' ✉</td><td class="muted">'+(e?(esc(e.campaignName.split(" ")[0])+" "+e.steps.filter(s=>s.status==="sent").length+"/"+e.steps.length):"—")+'</td></tr>';
    }).join("")+'</tbody></table></div>'
    +(rows.length===0?'<div class="note">No starred leads yet — click a ☆ to star your priority leads.</div>':"");
}

function seqHtml(id,e){const icon={email:"✉️",phone:"📞",linkedin:"in",sms:"💬"};let h='<div class="card" style="margin-top:14px"><div class="row"><b>'+esc(e.campaignName)+' &nbsp;<span class="pill b-warm">'+e.status+'</span></b>'+(e.status==="active"?'<button class="btn-ghost" onclick="markReplied(\\''+id+'\\')">↩︎ Log reply → Responded</button>':'')+'</div><ol style="list-style:none;padding:0;margin:10px 0 0">';
 h+=e.steps.map((s,i)=>{const cur=i===e.idx&&e.status==="active";return '<li style="border:1px solid '+(cur?"var(--green)":"#143a54")+';border-radius:9px;padding:10px;margin:6px 0;background:rgba(6,18,28,.4)"><div class="row"><span><span class="muted">Day '+s.day+'</span> '+(icon[s.channel]||"")+' '+esc(s.label)+' <span class="tag">· '+(s.status==="pending"?("due "+fmtD(s.dueAt)):s.status)+'</span></span>'+(cur?'<button class="btnG" onclick="markStep(\\''+id+'\\')">Mark sent</button>':'')+'</div>'+(s.subject?'<details style="margin-top:6px"><summary class="tag">'+(s.toEmail?("To "+esc(s.toEmail)+" — "):"")+'Subject: '+esc(s.subject)+'</summary><pre style="white-space:pre-wrap;font-family:inherit;color:var(--ink);margin:6px 0 0">'+esc(s.body)+'</pre></details>':'')+'</li>';}).join("");
 return h+'</ol></div>';}

function leadDetail(id){
  const l=leadById(id);if(!l)return '<div class="card">Not found</div>';
  const sc=scoreOf(l),q=qualify(l),ev=estVal(l.industry,l.signals),cp=closeProb(sc),rep=STATE.report[id],e=STATE.enroll[id];
  let h='<button class="btn-ghost" onclick="backLeads()">← All leads</button>';
  h+='<div class="row" style="margin-top:12px"><div><h1 style="margin:0"><span onclick="toggleStar(\\''+id+'\\')">'+starIcon(l.starred)+'</span> '+esc(l.name)+'</h1><div class="tag">'+esc(IM[l.industry].label)+' · '+esc(l.address.city)+', '+esc(l.address.region)+' · Tier '+sc.tier+' · '+esc(l.stage)+'</div><div style="margin-top:4px;font-size:12px"><a target="_blank" href="'+maps({name:l.name,city:l.address.city,region:l.address.region,country:l.address.country,lat:l.address.lat,lng:l.address.lng})+'" style="color:var(--muted)">📍 Map</a>'+(l.website?(' &nbsp; <a target="_blank" href="'+esc(nurl(l.website))+'" style="color:var(--muted)">🔗 Website</a>'):"")+'</div></div>'+ring(sc.opportunity)+'</div>';
  h+='<div class="card" style="margin-top:14px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btnG" onclick="doEnrich(\\''+id+'\\')">✨ Enrich data</button>';
  if(!e){h+='<select id="campSel">'+DATA.campaigns.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("")+'</select><button class="btnG" onclick="doPush(\\''+id+'\\',document.getElementById(\\'campSel\\').value)">▶ Push to sequence</button>';}
  else{h+='<span class="tag">In sequence: '+esc(e.campaignName)+'</span>';}
  h+='</div>';
  if(rep){h+='<div class="note" style="margin-top:10px;color:var(--good)">Enriched: +'+rep.emails+' email(s) · Opportunity '+rep.before+' → '+rep.after+(rep.notes.length?(' · '+esc(rep.notes.join(" · "))):"")+'</div>';}
  h+='</div>';
  h+='<div class="card" style="margin-top:14px"><b>Opportunity Scores</b><div class="bars" style="margin-top:10px">'+bar("Playground Fit",sc.playgroundFit)+bar("Budget Likelihood",sc.budgetLikelihood)+bar("Family Traffic",sc.familyTraffic)+bar("Decision-Maker Access",sc.decisionMakerAccess)+bar("Revenue Potential",sc.revenuePotential)+bar("Lead Qualification",q.score)+'</div><div class="kv" style="margin-top:12px"><div><div class="lbl">Est. Value (ind.)</div><div class="v">'+money(ev.low)+'–'+money(ev.high)+'</div></div><div><div class="lbl">Close Prob.</div><div class="v" style="color:'+col(cp)+'">'+cp+'%</div></div><div><div class="lbl">Confidence</div><div class="v">'+l.dataConfidence+'</div></div></div></div>';
  if(e)h+=seqHtml(id,e);
  h+='<div class="card" style="margin-top:14px"><b>Firmographics</b><div class="kv" style="margin-top:10px">'+fld("Org Size",l.signals.orgSize?("~"+l.signals.orgSize):null)+fld("Facility",l.signals.facilitySqFt?("~"+l.signals.facilitySqFt.toLocaleString()+" sqft"):null)+fld("Locations",l.signals.locationCount||null)+fld("Child-Focused",l.signals.childFocused==null?null:(l.signals.childFocused?"Yes":"No"))+fld("Budget",l.signals.annualBudgetBand||null)+fld("Traffic",l.signals.weeklyFamilyTraffic?("~"+l.signals.weeklyFamilyTraffic.toLocaleString()):null)+'</div></div>';
  h+='<div class="card" style="margin-top:14px"><div class="row"><b>Contacts</b><button class="btn-ghost" onclick="exportLeadContacts(\\''+id+'\\')">⬇ CSV</button></div>'+(l.contacts.length?l.contacts.map(c=>'<div style="margin-top:8px"><b>'+esc(c.name)+'</b> <span class="tag">'+esc(c.role)+(c.isDecisionMaker?" · decision maker":"")+'</span>'+(c.email?('<div class="tag">'+esc(c.email)+'</div>'):"")+(c.phone?('<div class="tag">'+esc(c.phone)+'</div>'):"")+'</div>').join(""):'<div class="note">No contacts yet — click ✨ Enrich to add role inboxes (info@/office@).</div>')+'</div>';
  if(l.lookalikes&&l.lookalikes.length)h+='<div class="card" style="margin-top:14px"><b>Similar Orca Coast Projects</b>'+l.lookalikes.map(m=>'<div style="margin-top:6px"><span class="hl">'+m.similarity+'%</span> '+esc(m.name)+'<div class="tag">'+esc(m.reasons.join(" · "))+'</div></div>').join("")+'</div>';
  return h;
}

const VIEWS={leads:view_leads,who:view_who,source:view_source,territory:view_territory,pipeline:view_pipeline,campaigns:view_campaigns,market:view_market,heatmap:view_heatmap,analytics:view_analytics,portfolio:view_portfolio};
function show(id){document.getElementById("view").innerHTML=VIEWS[id]();document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.id===id));window.scrollTo(0,0);}
const nav=document.getElementById("nav");
TABS.forEach(([id,label])=>{const b=document.createElement("button");b.textContent=label;b.dataset.id=id;b.onclick=()=>show(id);nav.appendChild(b);});
show("leads");
</script>
</body>
</html>`;

fs.writeFileSync(path.join(process.cwd(), "demo.html"), html);
console.log("wrote demo.html", (html.length / 1024).toFixed(0) + "kb");
