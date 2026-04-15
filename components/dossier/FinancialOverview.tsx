'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'

interface RegionalSettings {
  itp_percentage: number
  itp_progressive: Array<{ threshold: number | null; rate: number }> | null
  ajd_percentage: number
  iva_percentage: number
  notary_min: number
  notary_max: number
  notary_percentage: number
  registro_min: number
  registro_max: number
  registro_percentage: number
  lawyer_percentage: number
  lawyer_minimum: number
}

interface FinancialData {
  kosten_koper: {
    type: string
    itp: number
    iva: number
    ajd: number
    notaris: number
    registro: number
    advocaat: number
    totaal: number
  }
  renovatie: {
    woningtype: string
    renovatie_type: string
    binnenoppervlakte: number
    kosten_per_m2: number
    binnen_totaal: number
    terras_m2: number
    terras_per_m2: number
    terras_totaal: number
    tuin_m2: number
    tuin_per_m2: number
    tuin_totaal: number
    zwembad: boolean
    zwembad_m2: number
    zwembad_per_m2: number
    zwembad_totaal: number
    architect: number
    onvoorzien_pct: number
    onvoorzien_totaal: number
    totaal: number
  }
  hypotheek: {
    eigen_inbreng_pct: number
    hypotheekbedrag: number
    rente: number
    looptijd: number
    maandlast: number
  }
  totale_investering: number
}

interface Props {
  price: number
  regio: string
  oppervlakte: number
  type: string
  regions: Array<{ region: string } & RegionalSettings>
  renovationDefaults: { cosmetic: number; partial: number; full: number; luxury: number; contingency: number; architect: number; terrace: number; garden: number; pool: number }
  initialData?: FinancialData | null
  onSave: (data: FinancialData) => void
}

const fmt = (n: number) => `€ ${Math.round(n).toLocaleString('nl-NL')}`
const inp = 'w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#004B46] tabular-nums'

export default function FinancialOverview({ price, regio, oppervlakte, type: propertyType, regions, renovationDefaults, initialData, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const region = regions.find(r => r.region.toLowerCase().includes(regio.toLowerCase()) || regio.toLowerCase().includes(r.region.toLowerCase()))

  // Kosten koper state
  const [kkType, setKkType] = useState<'bestaand' | 'nieuwbouw'>(initialData?.kosten_koper.type === 'nieuwbouw' ? 'nieuwbouw' : propertyType === 'nieuwbouw' ? 'nieuwbouw' : 'bestaand')

  // Renovatie state
  const renoTypeMap: Record<string, number> = { geen: 0, cosmetisch: renovationDefaults.cosmetic, gedeeltelijk: renovationDefaults.partial, volledig: renovationDefaults.full, luxe: renovationDefaults.luxury }
  const [woningtype, setWoningtype] = useState(initialData?.renovatie.woningtype || (propertyType.includes('villa') || propertyType.includes('woning') ? 'woning_villa' : propertyType.includes('penthouse') ? 'penthouse' : 'appartement'))
  const [renoType, setRenoType] = useState(initialData?.renovatie.renovatie_type || 'geen')
  const [costPerM2, setCostPerM2] = useState(initialData?.renovatie.kosten_per_m2 || 0)
  const [binnenM2, setBinnenM2] = useState(initialData?.renovatie.binnenoppervlakte || oppervlakte || 0)
  const [terrasM2, setTerrasM2] = useState(initialData?.renovatie.terras_m2 || 0)
  const [terrasCost, setTerrasCost] = useState(initialData?.renovatie.terras_per_m2 || renovationDefaults.terrace)
  const [tuinM2, setTuinM2] = useState(initialData?.renovatie.tuin_m2 || 0)
  const [tuinCost, setTuinCost] = useState(initialData?.renovatie.tuin_per_m2 || renovationDefaults.garden)
  const [hasPool, setHasPool] = useState(initialData?.renovatie.zwembad || false)
  const [poolM2, setPoolM2] = useState(initialData?.renovatie.zwembad_m2 || 24)
  const [poolCost, setPoolCost] = useState(initialData?.renovatie.zwembad_per_m2 || renovationDefaults.pool)
  const [architect, setArchitect] = useState(initialData?.renovatie.architect || renovationDefaults.architect)
  const [contingencyPct, setContingencyPct] = useState(initialData?.renovatie.onvoorzien_pct || renovationDefaults.contingency)

  // Hypotheek state
  const [downPct, setDownPct] = useState(initialData?.hypotheek.eigen_inbreng_pct || 30)
  const [rate, setRate] = useState(initialData?.hypotheek.rente || 3.5)
  const [years, setYears] = useState(initialData?.hypotheek.looptijd || 25)

  useEffect(() => {
    if (renoType !== 'geen') setCostPerM2(renoTypeMap[renoType] || 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renoType])

  // ─── Berekeningen ───────────────────────────────────────
  // Kosten koper
  const itp = region && kkType === 'bestaand' ? price * (region.itp_percentage / 100) : 0
  const iva = region && kkType === 'nieuwbouw' ? price * (region.iva_percentage / 100) : 0
  const ajd = region && kkType === 'nieuwbouw' ? price * (region.ajd_percentage / 100) : 0
  const notaris = region ? Math.min(Math.max(price * (region.notary_percentage / 100), region.notary_min), region.notary_max) : 0
  const registro = region ? Math.min(Math.max(price * (region.registro_percentage / 100), region.registro_min), region.registro_max) : 0
  const advocaat = region ? Math.max(price * (region.lawyer_percentage / 100), region.lawyer_minimum) : 0
  const kkTotal = (kkType === 'bestaand' ? itp : iva + ajd) + notaris + registro + advocaat

  // Renovatie
  const binnenTotal = renoType === 'geen' ? 0 : binnenM2 * costPerM2
  const terrasTotal = (woningtype === 'penthouse' || woningtype === 'woning_villa') ? terrasM2 * terrasCost : 0
  const tuinTotal = woningtype === 'woning_villa' ? tuinM2 * tuinCost : 0
  const poolTotal = woningtype === 'woning_villa' && hasPool ? poolM2 * poolCost : 0
  const renoSubtotal = binnenTotal + terrasTotal + tuinTotal + poolTotal
  const archFee = renoType === 'geen' ? 0 : architect
  const contingency = renoType === 'geen' ? 0 : Math.round(renoSubtotal * (contingencyPct / 100))
  const renoTotal = renoSubtotal + archFee + contingency

  // Hypotheek
  const downPayment = Math.round(price * (downPct / 100))
  const mortgage = price - downPayment
  const monthlyRate = rate / 100 / 12
  const totalMonths = years * 12
  let monthly = 0
  if (mortgage > 0 && monthlyRate > 0 && totalMonths > 0) {
    monthly = mortgage * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
  }

  // Totaal
  const totalInvestment = price + kkTotal + renoTotal

  // Auto-save
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      onSave({
        kosten_koper: { type: kkType, itp, iva, ajd, notaris, registro, advocaat, totaal: kkTotal },
        renovatie: {
          woningtype, renovatie_type: renoType, binnenoppervlakte: binnenM2, kosten_per_m2: costPerM2,
          binnen_totaal: binnenTotal, terras_m2: terrasM2, terras_per_m2: terrasCost, terras_totaal: terrasTotal,
          tuin_m2: tuinM2, tuin_per_m2: tuinCost, tuin_totaal: tuinTotal,
          zwembad: hasPool, zwembad_m2: poolM2, zwembad_per_m2: poolCost, zwembad_totaal: poolTotal,
          architect: archFee, onvoorzien_pct: contingencyPct, onvoorzien_totaal: contingency, totaal: renoTotal,
        },
        hypotheek: { eigen_inbreng_pct: downPct, hypotheekbedrag: mortgage, rente: rate, looptijd: years, maandlast: Math.round(monthly) },
        totale_investering: totalInvestment,
      })
    }, 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kkType, renoType, costPerM2, binnenM2, terrasM2, terrasCost, tuinM2, tuinCost, hasPool, poolM2, poolCost, architect, contingencyPct, downPct, rate, years, woningtype])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header — altijd zichtbaar */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          <span className="text-sm font-semibold text-slate-700">Financieel overzicht</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Totale investering: <strong className="text-[#004B46]">{fmt(totalInvestment)}</strong></span>
          {monthly > 0 && <span>Maandlast: <strong className="text-[#004B46]">{fmt(Math.round(monthly))}</strong></span>}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">

            {/* ─── KOSTEN KOPER ─── */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kosten koper</h4>
              <div className="mb-3">
                <select value={kkType} onChange={e => setKkType(e.target.value as 'bestaand' | 'nieuwbouw')} className={inp}>
                  <option value="bestaand">Bestaande bouw</option>
                  <option value="nieuwbouw">Nieuwbouw</option>
                </select>
              </div>
              <div className="space-y-1.5 text-sm">
                {kkType === 'bestaand' ? (
                  <CalcRow label={`ITP (${region?.itp_percentage ?? 10}%)`} value={itp} />
                ) : (
                  <>
                    <CalcRow label={`IVA (${region?.iva_percentage ?? 10}%)`} value={iva} />
                    <CalcRow label={`AJD (${region?.ajd_percentage ?? 1.5}%)`} value={ajd} />
                  </>
                )}
                <CalcRow label="Notaris" value={notaris} />
                <CalcRow label="Registro" value={registro} />
                <CalcRow label="Advocaat" value={advocaat} />
                <div className="border-t border-slate-200 pt-1.5">
                  <CalcRow label="Totaal" value={kkTotal} bold />
                </div>
              </div>
            </div>

            {/* ─── RENOVATIE ─── */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Renovatie</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select value={woningtype} onChange={e => setWoningtype(e.target.value)} className={inp}>
                  <option value="appartement">Appartement</option>
                  <option value="penthouse">Penthouse</option>
                  <option value="woning_villa">Woning / Villa</option>
                </select>
                <select value={renoType} onChange={e => setRenoType(e.target.value)} className={inp}>
                  <option value="geen">Geen</option>
                  <option value="cosmetisch">Cosmetisch</option>
                  <option value="gedeeltelijk">Gedeeltelijk</option>
                  <option value="volledig">Volledig</option>
                  <option value="luxe">Luxe</option>
                </select>
              </div>
              {renoType !== 'geen' && (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <input type="number" value={binnenM2} onChange={e => setBinnenM2(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                    <span className="text-xs text-slate-400">m² ×</span>
                    <input type="number" value={costPerM2} onChange={e => setCostPerM2(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                    <span className="text-xs text-slate-400">= {fmt(binnenTotal)}</span>
                  </div>

                  {(woningtype === 'penthouse' || woningtype === 'woning_villa') && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={terrasM2} onChange={e => setTerrasM2(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" placeholder="m²" />
                      <span className="text-[10px] text-slate-400">terras ×</span>
                      <input type="number" value={terrasCost} onChange={e => setTerrasCost(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                      <span className="text-xs text-slate-400">= {fmt(terrasTotal)}</span>
                    </div>
                  )}

                  {woningtype === 'woning_villa' && (
                    <>
                      <div className="flex items-center gap-2">
                        <input type="number" value={tuinM2} onChange={e => setTuinM2(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" placeholder="m²" />
                        <span className="text-[10px] text-slate-400">tuin ×</span>
                        <input type="number" value={tuinCost} onChange={e => setTuinCost(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                        <span className="text-xs text-slate-400">= {fmt(tuinTotal)}</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={hasPool} onChange={e => setHasPool(e.target.checked)} className="rounded border-slate-300" />
                        Zwembad renovatie
                      </label>
                      {hasPool && (
                        <div className="flex items-center gap-2">
                          <input type="number" value={poolM2} onChange={e => setPoolM2(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                          <span className="text-[10px] text-slate-400">m² ×</span>
                          <input type="number" value={poolCost} onChange={e => setPoolCost(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                          <span className="text-xs text-slate-400">= {fmt(poolTotal)}</span>
                        </div>
                      )}
                    </>
                  )}

                  <CalcRow label="Architect" value={archFee} />
                  <CalcRow label={`Onvoorzien (${contingencyPct}%)`} value={contingency} />
                  <div className="border-t border-slate-200 pt-1.5">
                    <CalcRow label="Totaal renovatie" value={renoTotal} bold />
                  </div>
                </div>
              )}
              {renoType === 'geen' && <p className="text-xs text-slate-400">Geen renovatie geselecteerd</p>}
            </div>

            {/* ─── HYPOTHEEK ─── */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Hypotheek</h4>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 w-20">Eigen inbreng</label>
                  <input type="number" value={downPct} onChange={e => setDownPct(Number(e.target.value))} min={0} max={100} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                  <span className="text-xs text-slate-400">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 w-20">Rente</label>
                  <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                  <span className="text-xs text-slate-400">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 w-20">Looptijd</label>
                  <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={5} max={30} className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs tabular-nums" />
                  <span className="text-xs text-slate-400">jaar</span>
                </div>
              </div>
              {/* Slider */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5"><span>2%</span><span>{rate}%</span><span>6%</span></div>
                <input type="range" min={2} max={6} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full accent-[#004B46]" />
              </div>
              <div className="space-y-1.5 text-sm">
                <CalcRow label={`Eigen inbreng (${downPct}%)`} value={downPayment} />
                <CalcRow label="Hypotheekbedrag" value={mortgage} />
                <div className="border-t border-slate-200 pt-1.5">
                  <CalcRow label="Maandlast" value={Math.round(monthly)} bold highlight />
                </div>
              </div>
            </div>
          </div>

          {/* Samenvatting */}
          <div className="mt-5 bg-[#004B46]/5 border border-[#004B46]/15 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-xs text-slate-500">Aankoopprijs</span><div className="font-semibold text-slate-800">{fmt(price)}</div></div>
              <div><span className="text-xs text-slate-500">Kosten koper</span><div className="font-semibold text-slate-800">{fmt(kkTotal)}</div></div>
              <div><span className="text-xs text-slate-500">Renovatie</span><div className="font-semibold text-slate-800">{fmt(renoTotal)}</div></div>
              <div><span className="text-xs text-[#004B46]">Totale investering</span><div className="font-bold text-lg text-[#004B46]">{fmt(totalInvestment)}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CalcRow({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold text-slate-700' : 'text-slate-500'}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${highlight ? 'text-[#004B46]' : 'text-slate-800'}`}>{fmt(value)}</span>
    </div>
  )
}
