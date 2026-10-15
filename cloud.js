'use strict';
/* =========================================================
   Invoice Free del Obrero — accounts & cloud sync (MIT)
   Two ways to keep your data if you lose your phone:
   1) Email + password  (easy; data protected by your account)
   2) 12-word phrase    (max privacy; data is encrypted on the
      phone before upload — nobody, not even the app owner,
      can read it. Lose the phrase = lose the data.)
   Job photos stay on the device and are not uploaded.
   ========================================================= */
(function(){
const CFG=window.OBRERO_CONFIG||{};
const ENABLED=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase&&window.supabase.createClient);
let sb=null;
if(ENABLED){try{sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}catch(e){console.warn(e)}}
const AKEY='obrero-account-v1';

Object.assign(L.en,{
account:'Account & backup',accountSub:'Keep your data if you lose your phone',noAccount:'Not signed in. Data is only on this phone.',
createAccount:'Create account',haveAccount:'I have an account',signIn:'Sign in',signOut:'Sign out',
withEmail:'With email',withEmailSub:'Easy. Recover with your email if you forget the password.',
withPhrase:'With a 12-word phrase',withPhraseSub:'Max privacy. No email. Your data is encrypted on this phone. Lose the phrase = lose the data.',
emailLbl:'Email',passwordLbl:'Password (8+ characters)',forgot:'Forgot password?',sendReset:'Send reset email',
checkEmail:'Check your email to confirm your account, then sign in.',resetSent:'Reset email sent. Open the link on this phone.',
newPassword:'New password',savePassword:'Save new password',passwordSaved:'Password updated',
yourPhrase:'Your 12-word phrase',phraseWarn:'Write these 12 words on paper, in order, and keep them safe. They are the only key to your account. Anyone with them can see your invoices. We cannot recover them.',
notWallet:'This phrase is only for Invoice Free del Obrero. NEVER type your crypto wallet seed phrase here.',
wroteIt:'I wrote the 12 words on paper',next:'Next',confirmWords:'Confirm your phrase',typeWord:n=>`Word #${n}`,
wrongWords:'Those words don’t match. Check your paper.',enterPhrase:'Type your 12 words, separated by spaces',
badPhrase:'That phrase isn’t valid. Check spelling and order.',noVault:'No account found with that phrase.',
replaceLocal:'This phone already has data. Replace it with the data from your account?',replaceYes:'Yes, replace',
mode_email:'Signed in with email',mode_seed:'Signed in with 12-word phrase',lastSync:'Last sync',syncNow:'Sync now',
syncing:'Syncing…',synced:'Saved to cloud',syncFail:'Could not sync. Will retry when online.',never:'never',
signOutKeep:'Sign out (keep data on this phone)',signOutWipe:'Sign out and erase this phone',wipeConfirm:'Erase all invoices on this phone? They stay in your account.',
photosLocal:'Job photos stay on this phone and are not uploaded.',protectBanner:'Protect your invoices: create a free account so you don’t lose them if you lose your phone.',
cloudOff:'Cloud accounts are not set up yet in this copy of the app.',wordlistFail:'Need internet to create or enter your phrase.',
emailPrivacy:'Your data is stored on the server and protected by your account.',seedPrivacy:'Your data is encrypted on this phone before upload. Nobody else can read it.',
signedIn:'Signed in',created:'Account created'
});
Object.assign(L.es,{
account:'Cuenta y respaldo',accountSub:'Para no perder tus datos si pierdes el teléfono',noAccount:'Sin cuenta. Tus datos están solo en este teléfono.',
createAccount:'Crear cuenta',haveAccount:'Ya tengo cuenta',signIn:'Entrar',signOut:'Cerrar sesión',
withEmail:'Con email',withEmailSub:'Fácil. Si olvidas la contraseña, la recuperas con tu correo.',
withPhrase:'Con frase de 12 palabras',withPhraseSub:'Máxima privacidad. Sin correo. Tus datos se cifran en este teléfono. Si pierdes la frase, pierdes los datos.',
emailLbl:'Correo',passwordLbl:'Contraseña (8 o más caracteres)',forgot:'¿Olvidaste tu contraseña?',sendReset:'Enviar correo para cambiarla',
checkEmail:'Revisa tu correo para confirmar tu cuenta y luego entra.',resetSent:'Te enviamos un correo. Abre el link en este teléfono.',
newPassword:'Contraseña nueva',savePassword:'Guardar contraseña nueva',passwordSaved:'Contraseña actualizada',
yourPhrase:'Tu frase de 12 palabras',phraseWarn:'Escribe estas 12 palabras en papel, en orden, y guárdalas bien. Son la única llave de tu cuenta. Quien las tenga puede ver tus facturas. Nadie las puede recuperar.',
notWallet:'Esta frase es solo para Invoice Free del Obrero. NUNCA escribas aquí la frase de tu wallet de crypto.',
wroteIt:'Ya escribí las 12 palabras en papel',next:'Siguiente',confirmWords:'Confirma tu frase',typeWord:n=>`Palabra #${n}`,
wrongWords:'Esas palabras no coinciden. Revisa tu papel.',enterPhrase:'Escribe tus 12 palabras, separadas por espacios',
badPhrase:'Esa frase no es válida. Revisa cómo se escriben y el orden.',noVault:'No hay cuenta con esa frase.',
replaceLocal:'Este teléfono ya tiene datos. ¿Reemplazarlos con los de tu cuenta?',replaceYes:'Sí, reemplazar',
mode_email:'Sesión con email',mode_seed:'Sesión con frase de 12 palabras',lastSync:'Última sincronización',syncNow:'Sincronizar ahora',
syncing:'Sincronizando…',synced:'Guardado en la nube',syncFail:'No se pudo sincronizar. Se reintentará con internet.',never:'nunca',
signOutKeep:'Cerrar sesión (dejar datos en este teléfono)',signOutWipe:'Cerrar sesión y borrar este teléfono',wipeConfirm:'¿Borrar todas las facturas de este teléfono? Siguen guardadas en tu cuenta.',
photosLocal:'Las fotos del trabajo se quedan en este teléfono y no se suben.',protectBanner:'Protege tus facturas: crea una cuenta gratis para no perderlas si pierdes el teléfono.',
cloudOff:'Las cuentas en la nube todavía no están configuradas en esta copia de la app.',wordlistFail:'Necesitas internet para crear o escribir tu frase.',
emailPrivacy:'Tus datos se guardan en el servidor, protegidos por tu cuenta.',seedPrivacy:'Tus datos se cifran en este teléfono antes de subirse. Nadie más los puede leer.',
signedIn:'Sesión iniciada',created:'Cuenta creada'
});

/* ---------- small crypto helpers ---------- */
const te=new TextEncoder(),td=new TextDecoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
function b64(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function unb64(s){const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
const sha256=async d=>new Uint8Array(await crypto.subtle.digest('SHA-256',d));
async function aesKey(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt'])}
async function encryptStr(keyB64,str){const k=await aesKey(unb64(keyB64));const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,te.encode(str));return 'v1.'+b64(iv)+'.'+b64(ct)}
async function decryptStr(keyB64,s){const [v,iv,ct]=s.split('.');if(v!=='v1')throw new Error('format');const k=await aesKey(unb64(keyB64));return td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},k,unb64(ct)))}

/* ---------- 12-word phrase (BIP39 English list, 128-bit + checksum) ---------- */
let WL=null;
async function wordlist(){
  if(WL)return WL;
  for(const u of ['bip39-english.json','https://cdn.jsdelivr.net/npm/bip39@3.1.0/src/wordlists/english.json']){
    try{const r=await fetch(u);if(r.ok){const j=await r.json();if(Array.isArray(j)&&j.length===2048){WL=j;return WL}}}catch(e){}
  }
  throw new Error(t('wordlistFail'));
}
const bitsOf=u8=>[...u8].map(b=>b.toString(2).padStart(8,'0')).join('');
async function newPhrase(){
  const wl=await wordlist();const ent=crypto.getRandomValues(new Uint8Array(16));
  const bits=bitsOf(ent)+bitsOf(await sha256(ent)).slice(0,4);
  return Array.from({length:12},(_,i)=>wl[parseInt(bits.slice(i*11,i*11+11),2)]);
}
function normPhrase(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g,' ').trim().split(/\s+/).filter(Boolean)}
async function validPhrase(words){
  if(words.length!==12)return false;const wl=await wordlist();
  const idx=words.map(w=>wl.indexOf(w));if(idx.some(i=>i<0))return false;
  const bits=idx.map(i=>i.toString(2).padStart(11,'0')).join('');
  const ent=new Uint8Array(16);for(let i=0;i<16;i++)ent[i]=parseInt(bits.slice(i*8,i*8+8),2);
  return bitsOf(await sha256(ent)).slice(0,4)===bits.slice(128);
}
async function deriveFromPhrase(words){
  const base=await crypto.subtle.importKey('raw',te.encode(words.join(' ')),'PBKDF2',false,['deriveBits']);
  const m=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:te.encode('invoice-free-del-obrero/vault/v1'),iterations:210000,hash:'SHA-256'},base,512));
  return {vaultId:hex(await sha256(m.slice(0,16))),secret:hex(m.slice(16,32)),key:b64(m.slice(32,64))};
}

/* ---------- account state ---------- */
let ACC=null;
function loadAcc(){try{ACC=JSON.parse(localStorage.getItem(AKEY)||'null')}catch(e){ACC=null}}
function saveAcc(){try{ACC?localStorage.setItem(AKEY,JSON.stringify(ACC)):localStorage.removeItem(AKEY)}catch(e){}}
let syncState='idle';
const SYNC_KEYS=['profile','clients','jobs','docs','saved','wallet'];
function snapshot(){const data={};SYNC_KEYS.forEach(k=>data[k]=S[k]);return JSON.stringify({v:1,savedAt:(S.meta&&S.meta.savedAt)||Date.now(),data})}
function hasLocalData(){return Object.keys(S.docs).length+Object.keys(S.clients).length>0}
function applyRemote(obj){
  window.cloudApplying=true;
  SYNC_KEYS.forEach(k=>{if(obj.data[k])S[k]=obj.data[k]});
  S.profile.started=true;S.meta={...(S.meta||{}),savedAt:obj.savedAt};
  lang=S.profile.lang||lang;
  try{localStorage.setItem(LKEY,JSON.stringify(S))}catch(e){}
  window.cloudApplying=false;
  showWelcome=false;render();const top=stack[stack.length-1];if(top&&top.live)redrawSheet();
}

/* ---------- server calls ---------- */
async function remoteGet(){
  if(!ACC)return null;
  if(ACC.mode==='seed'){
    const {data,error}=await sb.rpc('vault_get',{p_id:ACC.vaultId,p_secret:ACC.secret});
    if(error)throw error;if(!data||!data.length)return null;
    return JSON.parse(await decryptStr(ACC.key,data[0].data));
  }
  const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('session');
  const {data,error}=await sb.from('user_data').select('data').eq('user_id',user.id).maybeSingle();
  if(error)throw error;return data?JSON.parse(data.data):null;
}
async function remotePut(){
  if(!ACC)return;const payload=snapshot();
  if(ACC.mode==='seed'){
    const {error}=await sb.rpc('vault_put',{p_id:ACC.vaultId,p_secret:ACC.secret,p_data:await encryptStr(ACC.key,payload)});
    if(error)throw error;
  }else{
    const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('session');
    const {error}=await sb.from('user_data').upsert({user_id:user.id,data:payload,updated_at:new Date().toISOString()});
    if(error)throw error;
  }
  ACC.lastSync=Date.now();saveAcc();
}
let pushT=null;
async function pushNow(showToast){
  if(!ENABLED||!ACC)return;clearTimeout(pushT);syncState='syncing';refreshAcct();
  try{await remotePut();syncState='ok';if(showToast)toast(t('synced'))}catch(e){console.warn(e);syncState='fail';if(showToast)toast(t('syncFail'))}
  refreshAcct();
}
window.cloudSchedule=function(){if(!ENABLED||!ACC||window.cloudApplying)return;clearTimeout(pushT);pushT=setTimeout(()=>pushNow(false),4000)};
async function pullAndMerge(){
  if(!ENABLED||!ACC)return;
  try{const r=await remoteGet();if(!r){await pushNow(false);return}
    const localAt=(S.meta&&S.meta.savedAt)||0;
    if(r.savedAt>localAt)applyRemote(r);else if(localAt>r.savedAt)await pushNow(false);
    ACC.lastSync=Date.now();saveAcc();syncState='ok';
  }catch(e){console.warn(e);syncState='fail'}
  refreshAcct();
}
window.addEventListener('online',()=>{if(ACC)pushNow(false)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&ACC&&pushT){pushNow(false)}});

/* ---------- UI ---------- */
let view='menu',phrase=[],confirmIdx=[],pending=null,busy=false;
function refreshAcct(){const top=stack[stack.length-1];if(top&&top.acct)redrawSheet();if(tab==='more'||tab==='home')render()}
function field(id,label,type,val,extra){return `<div class="field"><label for="${id}">${label}</label><input class="in" id="${id}" type="${type}" value="${esc(val||'')}" ${extra||''}></div>`}
function accountSheet(start){view=start||'menu';return{live:false,acct:true,render(){
  const title=t('account');let body='';
  if(!ENABLED){body=`<p class="note">${t('cloudOff')}</p>`}
  else if(ACC&&view==='menu'){
    const ls=ACC.lastSync?new Date(ACC.lastSync).toLocaleString(lang==='es'?'es-MX':'en-US',{dateStyle:'medium',timeStyle:'short'}):t('never');
    body=`<div class="hero"><div class="no" style="font-size:24px">${t('mode_'+ACC.mode)}</div>${ACC.email?`<div class="due">${esc(ACC.email)}</div>`:''}</div>
    <p class="small">${ACC.mode==='seed'?t('seedPrivacy'):t('emailPrivacy')} ${t('photosLocal')}</p>
    <div class="kv"><span>${t('lastSync')}</span><span>${syncState==='syncing'?t('syncing'):esc(ls)}</span></div>
    ${syncState==='fail'?`<p class="small red">${t('syncFail')}</p>`:''}
    <div class="btns"><button class="btn primary wide" data-act="acSync">${t('syncNow')}</button>
    <button class="btn wide" data-act="acSignOut" data-v="keep">${t('signOutKeep')}</button>
    <div class="wide" id="wipeZone"><button class="btn bad" data-act="acAskWipe">${t('signOutWipe')}</button></div></div>`;
  }
  else if(view==='menu'||view==='create'||view==='login'){
    const login=view==='login';
    body=`<p class="small" style="margin-top:14px">${t('noAccount')}</p>
    <div class="seg" style="margin:14px 0"><button data-act="acView" data-v="create" aria-pressed="${!login}">${t('createAccount')}</button><button data-act="acView" data-v="login" aria-pressed="${login}">${t('haveAccount')}</button></div>
    <button class="item" style="width:100%;text-align:left;color:inherit" data-act="acView" data-v="${login?'emailLogin':'emailSignup'}"><b>${t('withEmail')}</b><br><span class="small">${t('withEmailSub')}</span></button>
    <button class="item" style="width:100%;text-align:left;color:inherit" data-act="${login?'acView':'acNewPhrase'}" data-v="seedLogin"><b>${t('withPhrase')}</b><br><span class="small">${t('withPhraseSub')}</span></button>`;
  }
  else if(view==='emailSignup'||view==='emailLogin'){
    const up=view==='emailSignup';
    body=`<div style="margin-top:14px"></div>${field('ac-email',t('emailLbl'),'email','','autocomplete="email" autocapitalize="off"')}${field('ac-pass',t('passwordLbl'),'password','',`autocomplete="${up?'new-password':'current-password'}" minlength="8"`)}
    <button class="btn primary" data-act="${up?'acEmailSignup':'acEmailLogin'}" ${busy?'disabled':''}>${up?t('createAccount'):t('signIn')}</button>
    ${up?`<p class="small">${t('emailPrivacy')} ${t('photosLocal')}</p>`:`<button class="linkbtn" data-act="acView" data-v="forgot">${t('forgot')}</button>`}`;
  }
  else if(view==='forgot'){
    body=`<div style="margin-top:14px"></div>${field('ac-email',t('emailLbl'),'email','','autocomplete="email" autocapitalize="off"')}<button class="btn primary" data-act="acSendReset">${t('sendReset')}</button>`;
  }
  else if(view==='recover'){
    body=`<div style="margin-top:14px"></div>${field('ac-newpass',t('newPassword'),'password','','autocomplete="new-password" minlength="8"')}<button class="btn primary" data-act="acSavePass">${t('savePassword')}</button>`;
  }
  else if(view==='seedShow'){
    body=`<div class="note" style="color:var(--bad);border-color:var(--bad)">${t('notWallet')}</div>
    <p>${t('phraseWarn')}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:14px 0">${phrase.map((w,i)=>`<div class="mono" style="font-size:15px"><span class="small">${i+1}.</span> <b>${esc(w)}</b></div>`).join('')}</div>
    <label class="check"><input type="checkbox" id="ac-wrote"> ${t('wroteIt')}</label>
    <button class="btn primary" data-act="acSeedNext">${t('next')}</button>`;
  }
  else if(view==='seedConfirm'){
    body=`<h3 style="margin:16px 0 8px">${t('confirmWords')}</h3>${confirmIdx.map(i=>field('ac-w'+i,t('typeWord',i+1),'text','','autocapitalize="off" autocomplete="off" spellcheck="false"')).join('')}
    <button class="btn primary" data-act="acSeedConfirm" ${busy?'disabled':''}>${t('createAccount')}</button>`;
  }
  else if(view==='seedLogin'){
    body=`<div class="note" style="color:var(--bad);border-color:var(--bad)">${t('notWallet')}</div>
    <div class="field"><label for="ac-phrase">${t('enterPhrase')}</label><textarea class="in mono" id="ac-phrase" style="min-height:120px" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea></div>
    <button class="btn primary" data-act="acSeedLogin" ${busy?'disabled':''}>${t('signIn')}</button>`;
  }
  else if(view==='replace'){
    body=`<p style="margin-top:16px">${t('replaceLocal')}</p><div class="btns"><button class="btn" data-act="acSignOut">${t('cancel')}</button><button class="btn primary" data-act="acReplace">${t('replaceYes')}</button></div>`;
  }
  return sheetHead(title,{close:true})+`<div class="wrap sheet-b">${body}</div>`;
}}}

async function finishLogin(acc,isNew){
  ACC=acc;saveAcc();
  if(isNew){await pushNow(false);toast(t('created'));view='menu';redrawSheet();return}
  const r=await remoteGet();
  if(!r){if(acc.mode==='seed'){ACC=null;saveAcc();throw new Error(t('noVault'))}await pushNow(false);toast(t('signedIn'));view='menu';redrawSheet();return}
  if(hasLocalData()&&JSON.stringify(r.data.docs)!==JSON.stringify(S.docs)){pending=r;view='replace';redrawSheet();return}
  applyRemote(r);ACC.lastSync=Date.now();saveAcc();toast(t('signedIn'));view='menu';redrawSheet();
}
async function run(fn){if(busy)return;busy=true;const v0=view;try{await fn()}catch(e){toast(e.message||String(e))}busy=false;if(view!==v0)redrawSheet()}
const val=id=>{const el=document.getElementById(id);return el?el.value.trim():''};

Object.assign(A,{
  accountOpen:()=>showSheet(accountSheet()),
  welcomeLogin:()=>{S.profile.started=true;showWelcome=false;persist();render();showSheet(accountSheet('login'))},
  acView:e=>{view=e.dataset.v;redrawSheet()},
  acNewPhrase:()=>run(async()=>{phrase=await newPhrase();view='seedShow'}),
  acSeedNext:()=>{if(!document.getElementById('ac-wrote').checked){toast(t('wroteIt'));return}const s=new Set();while(s.size<3)s.add(Math.floor(Math.random()*12));confirmIdx=[...s].sort((a,b)=>a-b);view='seedConfirm';redrawSheet()},
  acSeedConfirm:()=>run(async()=>{
    if(!confirmIdx.every(i=>normPhrase(val('ac-w'+i))[0]===phrase[i]))throw new Error(t('wrongWords'));
    const d=await deriveFromPhrase(phrase);
    const {data}=await sb.rpc('vault_get',{p_id:d.vaultId,p_secret:d.secret});
    phrase=[];await finishLogin({mode:'seed',...d},!(data&&data.length));
  }),
  acSeedLogin:()=>run(async()=>{
    const words=normPhrase(val('ac-phrase'));
    if(!(await validPhrase(words)))throw new Error(t('badPhrase'));
    const d=await deriveFromPhrase(words);await finishLogin({mode:'seed',...d},false);
  }),
  acEmailSignup:()=>run(async()=>{
    const email=val('ac-email'),password=val('ac-pass');if(password.length<8)throw new Error(t('passwordLbl'));
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error)throw error;
    if(!data.session){toast(t('checkEmail'));view='emailLogin';return}
    await finishLogin({mode:'email',email},true);
  }),
  acEmailLogin:()=>run(async()=>{
    const email=val('ac-email'),password=val('ac-pass');
    const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
    await finishLogin({mode:'email',email},false);
  }),
  acSendReset:()=>run(async()=>{const {error}=await sb.auth.resetPasswordForEmail(val('ac-email'),{redirectTo:location.origin+location.pathname});if(error)throw error;toast(t('resetSent'));view='emailLogin'}),
  acSavePass:()=>run(async()=>{const p=val('ac-newpass');if(p.length<8)throw new Error(t('passwordLbl'));const {data,error}=await sb.auth.updateUser({password:p});if(error)throw error;toast(t('passwordSaved'));await finishLogin({mode:'email',email:data.user&&data.user.email},false)}),
  acReplace:()=>{if(pending){applyRemote(pending);pending=null;ACC.lastSync=Date.now();saveAcc();toast(t('signedIn'))}view='menu';redrawSheet()},
  acSync:()=>pushNow(true),
  acSignOut:async()=>{if(ACC&&ACC.mode==='email'){try{await sb.auth.signOut()}catch(e){}}ACC=null;saveAcc();view='menu';redrawSheet();render()},
  acAskWipe:()=>{document.getElementById('wipeZone').innerHTML=`<div class="confirm"><p style="margin:0 0 10px">${t('wipeConfirm')}</p><div class="btns" style="margin:0"><button class="btn" data-act="back0">${t('cancel')}</button><button class="btn bad" data-act="acWipe">${t('yesDel')}</button></div></div>`},
  acWipe:async()=>{await pushNow(false);if(ACC&&ACC.mode==='email'){try{await sb.auth.signOut()}catch(e){}}ACC=null;saveAcc();try{localStorage.removeItem(LKEY)}catch(e){}location.reload()}
});

/* hooks used by index.html */
window.cloudEnabled=()=>ENABLED;
window.cloudWelcomeButtons=()=>ENABLED?`<button class="btn outline" data-act="welcomeLogin">${t('haveAccount')}</button>`:'';
window.cloudHomeBanner=()=>ENABLED&&!ACC&&hasLocalData()?`<div class="banner" style="border-color:var(--accent)">${ic('user',2)}<div><p>${t('protectBanner')}</p><button class="textbtn" data-act="accountOpen">${t('createAccount')}</button></div></div>`:'';
window.cloudMoreRow=()=>ENABLED?`<button class="row" data-act="accountOpen"><div class="main"><div class="t1">${t('account')}</div><div class="t2">${ACC?t('mode_'+ACC.mode):t('accountSub')}</div></div>${ic('chev')}</button>`:'';

/* boot */
loadAcc();
if(ENABLED){
  sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY'){showWelcome=false;S.profile.started=true;render();showSheet(accountSheet('recover'))}});
  if(ACC)pullAndMerge();
  render();
}
})();
