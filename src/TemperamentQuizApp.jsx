import React, { useMemo, useState, useEffect } from "react";

/** CONFIG — preencha com os seus valores */
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyvwPRKFwEZpIE_WmqBilSzOo9E379TzKYWEJC0Wn2V3W7zSuMFuh3Ap0yWPKfEGlM/exec", // termina com /exec
  ADMIN_TOKEN: "123456!!!!!!",                  // o mesmo das Script Properties
  QUIZ_ID: "temperamentos-v1",
};

const PROFILES = [
  { key: "sanguineo", label: "Sanguíneo" },
  { key: "colerico", label: "Colérico" },
  { key: "melancolico", label: "Melancólico" },
  { key: "fleumatico", label: "Fleumático" },
];

const QUESTIONS = [
  { id: 1,  text: "Gosto de socializar e converso bastante.",               profile: "sanguineo" },
  { id: 2,  text: "Animo o grupo e gosto de contar histórias.",             profile: "sanguineo" },
  { id: 3,  text: "Sou espontâneo(a) e me adapto rápido.",                  profile: "sanguineo" },
  { id: 4,  text: "Prefiro ambientes animados e cheios de gente.",         profile: "sanguineo" },

  { id: 5,  text: "Gosto de liderar e decidir com rapidez.",                profile: "colerico" },
  { id: 6,  text: "Sou competitivo(a) e focado(a) em resultados.",          profile: "colerico" },
  { id: 7,  text: "Enfrento conflitos de forma direta.",                    profile: "colerico" },
  { id: 8,  text: "Assumo responsabilidade em projetos.",                   profile: "colerico" },

  { id: 9,  text: "Sou detalhista e busco precisão.",                       profile: "melancolico" },
  { id: 10, text: "Planejo antes de agir e avalio riscos.",                 profile: "melancolico" },
  { id: 11, text: "Busco profundidade e qualidade nas tarefas.",            profile: "melancolico" },
  { id: 12, text: "Penso bem antes de opinar.",                             profile: "melancolico" },

  { id: 13, text: "Sou calmo(a) e mantenho a estabilidade do grupo.",       profile: "fleumatico" },
  { id: 14, text: "Evito conflitos e concilio pontos de vista.",            profile: "fleumatico" },
  { id: 15, text: "Tenho rotina estável e sou constante nas tarefas.",      profile: "fleumatico" },
  { id: 16, text: "Ouço com atenção e tenho paciência com os outros.",      profile: "fleumatico" },
];

const ANSWERS = [
  { key: 2, label: "Concordo" },
  { key: 1, label: "Neutro"   },
  { key: 0, label: "Discordo" },
];

function classNames(...xs){ return xs.filter(Boolean).join(" "); }
function getInitialAnswers(){ return Object.fromEntries(QUESTIONS.map(q => [q.id, 1])); }

function computeScores(state){
  const scores = { sanguineo:0, colerico:0, melancolico:0, fleumatico:0 };
  for (const q of QUESTIONS) scores[q.profile] += state[q.id] ?? 1;
  const entries = Object.entries(scores);
  const top = entries.reduce((a,b)=> (b[1]>a[1]? b:a));
  const total = entries.reduce((s,[,v])=> s+v, 0) || 1;
  const perc  = Object.fromEntries(entries.map(([k,v]) => [k, Math.round((v/total)*100)]));
  return { scores, topKey: top[0], perc };
}

/** >>> ALTERAÇÃO AQUI: usar text/plain para evitar preflight/CORS no Apps Script */
async function postJSON(url, body){
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Apps Script às vezes retorna só "ok" (não-JSON); proteger o parse:
  try { return await res.json(); } catch { return { ok:true }; }
}

async function getJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function prettyProfile(k){ return PROFILES.find(p=>p.key===k)?.label ?? k; }

function useQuery(){
  const [q, setQ] = useState(()=> new URLSearchParams(window.location.search));
  useEffect(()=>{
    const onPop=()=> setQ(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return ()=> window.removeEventListener("popstate", onPop);
  },[]);
  return q;
}

export default function TemperamentQuizApp(){
  const q = useQuery();
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(q.get("turma") || "");
  const [answers, setAnswers] = useState(getInitialAnswers);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = q.get("admin") === CONFIG.ADMIN_TOKEN;

  const computed = useMemo(()=> computeScores(answers), [answers]);

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true); setError("");
    const payload = {
      quizId: CONFIG.QUIZ_ID,
      name: name?.trim() || null,
      classId: classId?.trim() || null,
      answers,
      scores: computed.scores,
      topProfile: computed.topKey,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    try{
      if(!CONFIG.API_URL) throw new Error("CONFIG.API_URL não definido");
      await postJSON(CONFIG.API_URL + "?action=submit", payload);
      setSubmitted(true);
      setResult(payload);
    }catch(err){
      setError(err.message || String(err));
    }finally{
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:"100vh", background:"#0a0a0a", color:"#f5f5f5"}}>
      <header style={{borderBottom:"1px solid #1f2937", position:"sticky", top:0, background:"#0a0a0a"}}>
        <div style={{maxWidth:960, margin:"0 auto", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h1 style={{fontSize:22, fontWeight:600}}>Questionário de Temperamentos</h1>
          <small style={{opacity:0.7}}>{CONFIG.API_URL ? "conectado à planilha" : "modo local"}</small>
        </div>
      </header>

      <main style={{maxWidth:960, margin:"0 auto", padding:"20px 16px"}}>
        {!submitted && (
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div style={{display:"grid", gap:8, marginBottom:12}}>
              <input
                value={name} onChange={e=>setName(e.target.value)}
                placeholder="Seu nome (opcional)"
                style={{padding:"10px 12px", border:"1px solid #374151", borderRadius:10, background:"#111", color:"#fff"}}
              />
              <input
                value={classId} onChange={e=>setClassId(e.target.value)}
                placeholder="Turma (ex.: 3A) — opcional"
                style={{padding:"10px 12px", border:"1px solid #374151", borderRadius:10, background:"#111", color:"#fff"}}
              />
            </div>

            {QUESTIONS.map((qItem, idx)=>(
              <div key={qItem.id} style={{border:"1px solid #1f2937", borderRadius:16, padding:14, marginBottom:10}}>
                <div style={{fontSize:18, marginBottom:8}}>{idx+1}. {qItem.text}</div>
                <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
                  {ANSWERS.map(opt=>(
                    <button type="button" key={opt.key}
                      onClick={()=> setAnswers(a=> ({...a, [qItem.id]: opt.key}))}
                      style={{
                        padding:"10px 12px", borderRadius:10, border:"1px solid #374151",
                        background: (answers[qItem.id]===opt.key? "#fff":"#0b0b0b"),
                        color: (answers[qItem.id]===opt.key? "#111":"#fff")
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {error && <div style={{color:"#f87171"}}>{error}</div>}

            <button disabled={loading}
              style={{padding:"12px 16px", borderRadius:14, background:"#fff", color:"#111", fontWeight:600}}>
              {loading? "Enviando..." : "Enviar respostas"}
            </button>
          </form>
        )}

        {submitted && result && (
          <div style={{marginTop:16, border:"1px solid #065f46", background:"#052e2b", borderRadius:16, padding:14}}>
            <div>Respostas enviadas com sucesso ✅</div>
            <div style={{opacity:0.85, marginTop:6}}>
              Perfil mais provável: <strong>{prettyProfile(result.topProfile)}</strong>
            </div>
          </div>
        )}

        {isAdmin && <AdminPanel />}
      </main>
    </div>
  );
}

function AdminPanel(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(()=>{
    (async ()=>{
      try{
        setErr("");
        const url = new URL(CONFIG.API_URL);
        url.searchParams.set("action","stats");
        url.searchParams.set("admin", CONFIG.ADMIN_TOKEN);
        // permite filtrar por turma na própria URL do site (?turma=3A)
        const turma = new URLSearchParams(window.location.search).get("turma");
        if (turma) url.searchParams.set("classId", turma);
        const res = await getJSON(url.toString());
        setRows(res.rows || []);
      }catch(e){
        setErr(e.message || String(e));
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  const summary = useMemo(()=>{
    const counts = { sanguineo:0, colerico:0, melancolico:0, fleumatico:0 };
    for(const r of rows){
      const k = r.topProfile || r.top; // compat
      if (k && counts[k] !== undefined) counts[k]++;
    }
    const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
    const perc = Object.fromEntries(Object.entries(counts).map(([k,v])=> [k, Math.round((v/total)*100)]));
    return { counts, total, perc };
  },[rows]);

  return (
    <div style={{marginTop:24, border:"1px solid #1f2937", borderRadius:16, padding:16}}>
      <h3 style={{marginBottom:10}}>Painel (Admin)</h3>
      {loading && <div>Carregando...</div>}
      {err && <div style={{color:"#f87171"}}>{err}</div>}
      {!loading && !err && (
        <>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12}}>
            {Object.keys(summary.perc).map(k=>(
              <div key={k} style={{border:"1px solid #374151", borderRadius:12, padding:10}}>
                <div style={{opacity:0.8, fontSize:12}}>{prettyProfile(k)}</div>
                <div style={{fontSize:20, fontWeight:700}}>{summary.perc[k]}%</div>
                <div style={{opacity:0.7, fontSize:12}}>{summary.counts[k]} resp.</div>
              </div>
            ))}
          </div>
          <details>
            <summary>Ver dados brutos</summary>
            <pre style={{whiteSpace:"pre-wrap", fontSize:12, background:"#0b0b0b", padding:10, borderRadius:8}}>
{JSON.stringify(rows, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
