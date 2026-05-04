const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-34.5852&longitude=-70.9964&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto'

export default async function handler(_request: Request): Promise<Response> {
  try {
    const upstreamResponse = await fetch(OPEN_METEO_URL, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!upstreamResponse.ok) {
      return Response.json(
        { error: 'No se pudo consultar Open-Meteo.' },
        {
          status: upstreamResponse.status,
          headers: {
            'Cache-Control': 's-maxage=900, stale-while-revalidate=1800',
          },
        },
      )
    }

    const data = await upstreamResponse.json()
    return Response.json(data, {
      headers: {
        'Cache-Control': 's-maxage=900, stale-while-revalidate=1800',
      },
    })
  } catch {
    return Response.json(
      { error: 'El proxy meteorológico no pudo responder.' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}