"use client";
import { useState } from "react";
import { Check, Play, RotateCcw, X } from "lucide-react";
export function BugDemo() {
  const [fixed, setFixed] = useState(false);
  return <div className={"bug-demo " + (fixed ? "demo-fixed" : "")}>
    <div className="demo-bar"><span>One bug. Two sides of the request.</span><span>Example</span></div>
    <div className="demo-files">
      <div><p>client / apiClient.js</p><pre><code><span className="syntax-purple">fetch</span>(<span className="syntax-green">&quot;/api/dashboard&quot;</span>, {"{"}{"\n"}  headers: {"{"}{"\n"}<span className="demo-change" key={String(fixed)}>{fixed ? '    Authorization: "Bearer …"' : '    "x-auth-token": token'}</span>{"\n"}  {"}"}{"\n"}{"}"});</code></pre></div>
      <div><p>server / middleware / auth.js</p><pre><code><span className="syntax-purple">const</span> token = req.headers{"\n"}  .authorization?.<span className="syntax-purple">split</span>(<span className="syntax-green">&quot; &quot;</span>)[1];{"\n\n"}<span className="syntax-purple">if</span> (!token) {"{"}{"\n"}  <span className="syntax-purple">return</span> res.status(<span className="syntax-red">401</span>);{"\n"}{"}"}</code></pre></div>
    </div>
    <div className="demo-result" aria-live="polite">{fixed ? <Check/> : <X/>}<span>{fixed ? "The headers agree. The request gets through." : "Valid token. Wrong header. Request rejected."}</span></div>
    <button className="demo-control" onClick={() => setFixed(!fixed)}>{fixed ? <RotateCcw/> : <Play/>}{fixed ? "Replay the example" : "See the fix"}</button>
    <p className="demo-caption">Illustrated example. In the lab, tests execute your code in a real sandbox.</p>
  </div>;
}
