// Invoice Free del Obrero: "seal" Edge Function.
// Writes a 32-byte fingerprint (SHA-256 of an invoice or receipt) on the BSV blockchain, paid by the fund key.
// The output is: OP_FALSE OP_RETURN "obrero" <hash>. No customer data ever goes on chain.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   SEAL_WIF  private key of the fund, in WIF format. Never put it in the app or on GitHub.
//   SEAL_NET  "test" for testnet (start here) or "main" for the real network.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { PrivateKey, Transaction, P2PKH, LockingScript, OP, SatoshisPerKilobyte, Utils } from 'npm:@bsv/sdk@4.1.2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const NET = (Deno.env.get('SEAL_NET') || 'test') === 'main' ? 'main' : 'test'
const WOC = `https://api.whatsonchain.com/v1/bsv/${NET}/`
const DAILY_LIMIT_PER_IP = 100
const FEE_RATE = 100 // satoshis per kilobyte; a seal is about 250 bytes, so about 25 satoshis
const MIN_INPUT = 200 // never spend outputs smaller than this

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Optional: if WhatsOnChain gives you an API key, add it as the secret WOC_KEY.
const WOC_KEY = Deno.env.get('WOC_KEY') || ''
const WOC_HEADERS: Record<string, string> = WOC_KEY ? { Authorization: WOC_KEY, 'woc-api-key': WOC_KEY } : {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// The free explorer allows only a few requests per second. On 429 (too many requests) wait and try again.
async function wocFetch(url: string, init?: RequestInit) {
  let r: Response | null = null
  for (let i = 0; i < 4; i++) {
    r = await fetch(url, init)
    if (r.status !== 429) return r
    await sleep(1200 * (i + 1))
  }
  return r!
}

async function woc(path: string) {
  const r = await wocFetch(WOC + path, { headers: WOC_HEADERS })
  if (!r.ok) throw new Error(`whatsonchain ${r.status} ${path}`)
  const t = await r.text()
  try { return JSON.parse(t) } catch { return t }
}

// Finds a spendable output of the fund address. Tries the current and the older explorer endpoints.
// Notes from the last lookup, so the app can show why the fund was not found.
let lookupNotes: string[] = []
async function findUtxo(address: string) {
  let list: any[] = []
  lookupNotes = []
  for (const p of [`address/${address}/confirmed/unspent`, `address/${address}/unconfirmed/unspent`, `address/${address}/unspent`]) {
    const short = p.split('/').slice(2).join('/')
    try {
      const j = await woc(p)
      const arr = Array.isArray(j) ? j : Array.isArray(j?.result) ? j.result : []
      lookupNotes.push(`${short}: ok ${arr.length}`)
      list = list.concat(arr)
      if (arr.length) break // found coins: no need to ask the other endpoints
    } catch (e) { lookupNotes.push(`${short}: ${String(e).replace(/^Error: /, '').replace(/ address\/.*/, '')}`) }
  }
  const best = list
    .map((x) => ({ tx_hash: x?.tx_hash || x?.txid || x?.hash, tx_pos: x?.tx_pos ?? x?.vout ?? x?.outputIndex, value: Number(x?.value ?? x?.satoshis) }))
    .filter((x) => x.tx_hash && Number.isFinite(x.value) && x.value >= MIN_INPUT)
    .sort((a, b) => b.value - a.value)[0]
  if (!best) return null
  const hex = await woc(`tx/${best.tx_hash}/hex`)
  if (typeof hex !== 'string') return null
  return { tx: Transaction.fromHex(hex.trim()), vout: Number(best.tx_pos) }
}

async function buildSeal(src: { tx: Transaction; vout: number }, key: PrivateKey, hash: string) {
  const tag = Utils.toArray('obrero', 'utf8')
  const data = new LockingScript([
    { op: OP.OP_FALSE }, { op: OP.OP_RETURN },
    { op: tag.length, data: tag },
    { op: 32, data: Utils.toArray(hash, 'hex') },
  ])
  const tx = new Transaction()
  tx.addInput({ sourceTransaction: src.tx, sourceOutputIndex: src.vout, unlockingScriptTemplate: new P2PKH().unlock(key) })
  tx.addOutput({ lockingScript: data, satoshis: 0 })
  tx.addOutput({ lockingScript: new P2PKH().lock(key.toAddress(NET === 'test' ? 'testnet' : undefined)), change: true })
  await tx.fee(new SatoshisPerKilobyte(FEE_RATE))
  await tx.sign()
  return tx
}

async function broadcast(hex: string) {
  const r = await wocFetch(WOC + 'tx/raw', { method: 'POST', headers: { ...WOC_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ txhex: hex }) })
  const t = await r.text()
  if (!r.ok) throw new Error(`broadcast ${r.status} ${t.slice(0, 200)}`)
  return t
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const hash = String(body?.hash || '').toLowerCase()
  const kind = body?.kind === 'rcpt' ? 'rcpt' : 'inv'
  if (!/^[0-9a-f]{64}$/.test(hash)) return json({ error: 'bad hash' }, 400)
  const wif = Deno.env.get('SEAL_WIF')
  if (!wif) return json({ error: 'not configured' }, 503)

  // Supabase provides the service key automatically. If your project does not, add a secret named SEAL_DB_KEY with your secret key.
  const dbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SEAL_DB_KEY') || ''
  if (!dbKey) return json({ error: 'missing database key: add the secret SEAL_DB_KEY' }, 503)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, dbKey, { auth: { persistSession: false } })

  // Same fingerprint already sealed: return it, pay nothing.
  const { data: prev } = await db.from('seals').select('txid,net').eq('hash', hash).maybeSingle()
  if (prev) return json({ txid: prev.txid, net: prev.net, existing: true })

  // Daily limit per network address, so nobody can drain the fund.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await db.from('seals').select('hash', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since)
  if ((count || 0) >= DAILY_LIMIT_PER_IP) return json({ error: 'daily limit reached' }, 429)

  const key = PrivateKey.fromWif(wif)
  const address = key.toAddress(NET === 'test' ? 'testnet' : undefined)

  // Spend the last seal's change if we have it; otherwise look up the fund address.
  let src: { tx: Transaction; vout: number } | null = null
  const { data: u } = await db.from('seal_utxo').select('rawtx,vout,net').eq('id', 1).maybeSingle()
  if (u?.rawtx && u.net === NET) {
    try {
      const t = Transaction.fromHex(u.rawtx)
      if ((t.outputs[u.vout]?.satoshis || 0) >= MIN_INPUT) src = { tx: t, vout: u.vout }
    } catch { /* fall back to lookup */ }
  }

  let lastErr = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!src) {
      try { src = await findUtxo(address) } catch (e) { lastErr = String(e) }
      if (!src) return json({ error: 'fund empty or explorer unavailable', address, net: NET, detail: (lastErr + ' ' + lookupNotes.join(' | ')).trim().slice(0, 300) }, 503)
    }
    try {
      const tx = await buildSeal(src, key, hash)
      await broadcast(tx.toHex())
      const txid = tx.id('hex') as string
      await db.from('seal_utxo').upsert({ id: 1, rawtx: tx.toHex(), vout: 1, net: NET, updated_at: new Date().toISOString() })
      await db.from('seals').insert({ hash, txid, net: NET, kind, ip })
      return json({ txid, net: NET })
    } catch (e) {
      lastErr = String(e)
      src = null // the stored output may be spent or invalid: look up the fund address on the next try
      await db.from('seal_utxo').delete().eq('id', 1)
    }
  }
  return json({ error: 'could not seal', detail: lastErr.slice(0, 300) }, 502)
})
