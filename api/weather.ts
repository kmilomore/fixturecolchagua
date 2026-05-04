const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-34.5852&longitude=-70.9964&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto'

const CACHE_CONTROL = 's-maxage=900, stale-while-revalidate=1800'
const UPSTREAM_TIMEOUT_MS = 6000

export default async function handler(_request: unknown, response: {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  response.setHeader('Cache-Control', CACHE_CONTROL)

  try {
    const upstreamResponse = await fetch(OPEN_METEO_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    if (!upstreamResponse.ok) {
      response.status(upstreamResponse.status).json({ error: 'No se pudo consultar Open-Meteo.' })
      return
    }

    const data = await upstreamResponse.json()
    response.status(200).json(data)
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'La consulta a Open-Meteo excedió el tiempo de espera del servidor.'
      : 'El proxy meteorológico no pudo responder.'

    response.setHeader('Cache-Control', 'no-store')
    response.status(504).json({ error: message })
  } finally {
    clearTimeout(timeoutId)
  }
}