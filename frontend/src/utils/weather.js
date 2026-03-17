// ─── Field extractor — handles OWM, AEMET, custom EC2 shapes ─────────────────
export function extractWeather(raw = {}) {
  if (!raw || typeof raw !== 'object') return {}
  const toN = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n }

  const temp     = toN(raw.temperature ?? raw.temp ?? raw.main?.temp
                    ?? raw.current?.temperature ?? raw.tmax ?? raw.temperatura
                    ?? raw.t ?? raw.T)
  const tempMin  = toN(raw.tmin ?? raw.temp_min ?? raw.main?.temp_min ?? raw.tMin)
  const humidity = toN(raw.humidity ?? raw.main?.humidity ?? raw.current?.humidity
                    ?? raw.humedadRelativa ?? raw.hr)
  const windSpeed= toN(raw.wind_speed ?? raw.wind?.speed ?? raw.current?.wind_speed
                    ?? raw.vientoVelocidad ?? raw.racha ?? raw.velocidadViento)
  const uvIndex  = toN(raw.uv_index ?? raw.uvi ?? raw.uvIndex)
  const pressure = toN(raw.pressure ?? raw.main?.pressure ?? raw.presion)

  // Description — try multiple field names, then map AEMET codes
  const rawDescVal =
    raw.description ?? raw.weather?.[0]?.description
    ?? raw.current?.weather_description ?? raw.estadoCielo
    ?? raw.descripcion ?? raw.estado

  const desc = mapDesc(rawDescVal)

  return { temp, tempMin, humidity, windSpeed, uvIndex, pressure, desc }
}

// AEMET estadoCielo code → Spanish label
const AEMET_CODES = {
  '11': 'Despejado',           '11n': 'Despejado',
  '12': 'Poco nublado',        '12n': 'Poco nublado',
  '13': 'Intervalos nubosos',  '13n': 'Intervalos nubosos',
  '14': 'Nuboso',              '14n': 'Nuboso',
  '15': 'Muy nuboso',          '15n': 'Muy nuboso',
  '16': 'Cubierto',            '16n': 'Cubierto',
  '17': 'Nubes altas',
  '23': 'Intervalos nubosos con lluvia',
  '24': 'Nuboso con lluvia',   '25': 'Muy nuboso con lluvia',
  '26': 'Cubierto con lluvia',
  '33': 'Intervalos con chubascos', '34': 'Nuboso con chubascos',
  '35': 'Muy nuboso con chubascos', '36': 'Cubierto con chubascos',
  '43': 'Chubascos débiles',   '44': 'Chubascos moderados', '45': 'Chubascos fuertes',
  '51': 'Tormenta',            '52': 'Tormenta con lluvia',
  '53': 'Tormenta de nieve',   '54': 'Tormenta con granizo',
  '61': 'Nieve débil',         '62': 'Nieve moderada',      '63': 'Nieve fuerte',
  '71': 'Niebla',              '72': 'Bruma',               '73': 'Calima',
  '74': 'Chubasco de nieve',
}

function mapDesc(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  return AEMET_CODES[s] ?? s
}

// ─── Condition detection — handles English + Spanish + AEMET codes ────────────
export function getCondition(desc = '') {
  const d = String(desc).toLowerCase().trim()
  // AEMET numeric codes
  if (/^[56][0-9]n?$/.test(d) || d.includes('nieve') || d.includes('neva') || d.includes('snow'))  return 'snowy'
  if (/^[34][0-9]n?$/.test(d) || d.includes('lluv') || d.includes('chub')
    || d.includes('rain') || d.includes('drizzle') || d.includes('shower'))   return 'rainy'
  if (/^5[1-4]n?$/.test(d) || d.includes('tormenta') || d.includes('thunder')
    || d.includes('storm'))                                                    return 'stormy'
  if (d.includes('niebla') || d.includes('bruma') || d.includes('calima')
    || d.includes('fog')   || d.includes('mist')  || d.includes('haze'))      return 'foggy'
  if (d.includes('cubierto') || d.includes('muy nuboso') || d.includes('overcast')) return 'overcast'
  if (d.includes('nuboso')   || d.includes('nube')   || d.includes('cloud')
    || d.includes('nublado') || d.includes('intervalos'))                      return 'cloudy'
  if (/^1[1-5]n?$/.test(d)  || d.includes('despejado') || d.includes('clear')
    || d.includes('sunny')   || d.includes('sol'))                             return 'clear'
  return 'clear'
}

export const COND_EMOJI = {
  clear: '☀️', cloudy: '⛅', overcast: '☁️',
  rainy: '🌧️', stormy: '⛈️', snowy: '❄️', foggy: '🌫️',
}

export const COND_LABEL_ES = {
  clear: 'Cielo despejado', cloudy: 'Parcialmente nublado', overcast: 'Nublado',
  rainy: 'Lluvia', stormy: 'Tormenta eléctrica', snowy: 'Nieve', foggy: 'Niebla',
}

export const HERO_GRADIENT = {
  clear:    'from-amber-500/25 via-orange-600/10 to-slate-950/0',
  cloudy:   'from-slate-500/20 via-blue-900/10 to-slate-950/0',
  overcast: 'from-slate-600/30 via-slate-700/15 to-slate-950/0',
  rainy:    'from-blue-700/25 via-indigo-900/15 to-slate-950/0',
  stormy:   'from-violet-900/35 via-slate-900/20 to-slate-950/0',
  snowy:    'from-sky-300/20 via-blue-900/10 to-slate-950/0',
  foggy:    'from-gray-500/20 via-slate-700/10 to-slate-950/0',
}

export const GLOW_COLOR = {
  clear:    'rgba(251,191,36,0.55)',
  cloudy:   'rgba(148,163,184,0.40)',
  overcast: 'rgba(100,116,139,0.40)',
  rainy:    'rgba(96,165,250,0.50)',
  stormy:   'rgba(167,139,250,0.55)',
  snowy:    'rgba(186,230,253,0.50)',
  foggy:    'rgba(148,163,184,0.35)',
}

// ─── Suggestion block parser ──────────────────────────────────────────────────
export function extractSuggestions(text = '') {
  if (!text) return { suggestions: [], cleanText: text }
  const match = text.match(/<SUGGESTIONS>([\s\S]*?)<\/SUGGESTIONS>/i)
  if (!match) return { suggestions: [], cleanText: text }
  try {
    const suggestions = JSON.parse(match[1].trim())
    const cleanText   = text.replace(match[0], '').trim()
    return { suggestions: Array.isArray(suggestions) ? suggestions : [], cleanText }
  } catch {
    return { suggestions: [], cleanText: text.replace(match[0], '').trim() }
  }
}
