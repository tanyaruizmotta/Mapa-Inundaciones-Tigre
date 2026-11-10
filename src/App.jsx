import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import { demoReports } from './data/demoReports.js'
import { neighborhoods } from './data/neighborhoods.js'
import { fetchDocumentedEpisodes } from './lib/floodEvents.js'
import { formatEventDate } from './utils/formatDate.js'

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
}

function splitValues(value) {
  return (value ?? '').split(';').map((item) => item.trim()).filter(Boolean)
}

function StatCard({ label, value, detail, icon, tone }) {
  return (
    <article className="stat-card documented-stat">
      <div className={`stat-icon ${tone}`} aria-hidden="true">{icon}</div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
      <span className="documented-mini">DOCUMENTADO</span>
    </article>
  )
}

function ConfidenceBadge({ value }) {
  const labels = { alta: 'Confianza documental alta', media: 'Confianza documental media', baja: 'Confianza documental baja', mixta: 'Confianza documental mixta' }
  return <span className={`confidence-badge confidence-${value ?? 'unknown'}`}>{labels[value] ?? 'Confianza documental no indicada'}</span>
}

function EpisodeCard({ episode }) {
  const sources = episode.source_mentions ?? []

  return (
    <article className="episode-card">
      <div className="episode-card-heading">
        <div>
          <p className="episode-id">{episode.id}</p>
          <h3>{episode.event_type || 'Episodio documentado'}</h3>
        </div>
        <ConfidenceBadge value={episode.documentary_confidence} />
      </div>

      <dl className="episode-facts">
        <div>
          <dt>Fecha</dt>
          <dd>{episode.event_date ? formatEventDate(episode.event_date) : 'Fecha exacta desconocida'}</dd>
          {episode.date_precision && <small>{episode.date_precision}</small>}
        </div>
        <div>
          <dt>Localidad(es)</dt>
          <dd>{splitValues(episode.localities).join(' · ') || 'No especificada'}</dd>
        </div>
        <div>
          <dt>Barrio(s) o sector(es)</dt>
          <dd>{splitValues(episode.neighborhoods).join(' · ') || 'No especificado'}</dd>
        </div>
        <div>
          <dt>Ubicación</dt>
          <dd>{episode.location_description || 'Sin descripción de ubicación'}</dd>
          {episode.location_precision && <small>Precisión: {episode.location_precision}</small>}
        </div>
      </dl>

      <p className="episode-evidence">{episode.evidence_summary}</p>

      {sources.length > 0 && (
        <details className="episode-sources">
          <summary>Fuentes y menciones ({sources.length})</summary>
          <ul>
            {sources.map((source) => (
              <li key={source.mention_id}>
                <span>{source.source_title || 'Fuente'}{source.mention_id ? ` · ${source.mention_id}` : ''}</span>
                {source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer">Abrir fuente ↗</a>}
                {source.evidence && <small>{source.evidence}</small>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}

function App() {
  const [episodes, setEpisodes] = useState([])
  const [episodesLoading, setEpisodesLoading] = useState(true)
  const [episodesError, setEpisodesError] = useState('')
  const [selectedLocality, setSelectedLocality] = useState('Todas las localidades')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Todos los barrios y sectores')
  const [reports, setReports] = useState(demoReports)
  const [reportMessage, setReportMessage] = useState('')
  const [routeMessage, setRouteMessage] = useState('')
  const [route, setRoute] = useState({ origin: '', destination: '' })
  const [report, setReport] = useState({ street: '', place: 'Rincón de Milberg', type: 'Calle anegada', level: 'No lo sé', description: '' })

  useEffect(() => {
    let ignore = false

    fetchDocumentedEpisodes().then((result) => {
      if (ignore) return
      setEpisodes(result.episodes)
      setEpisodesError(result.error?.message ?? '')
      setEpisodesLoading(false)
    })

    return () => { ignore = true }
  }, [])

  const localities = useMemo(() => [...new Set(episodes.flatMap((item) => splitValues(item.localities)))].sort((a, b) => a.localeCompare(b, 'es')), [episodes])
  const allNeighborhoods = useMemo(() => [...new Set(episodes.flatMap((item) => splitValues(item.neighborhoods)))].sort((a, b) => a.localeCompare(b, 'es')), [episodes])
  const filteredEpisodes = useMemo(() => episodes.filter((episode) => {
    const localityMatches = selectedLocality === 'Todas las localidades' || splitValues(episode.localities).includes(selectedLocality)
    const neighborhoodMatches = selectedNeighborhood === 'Todos los barrios y sectores' || splitValues(episode.neighborhoods).includes(selectedNeighborhood)
    return localityMatches && neighborhoodMatches
  }), [episodes, selectedLocality, selectedNeighborhood])
  const episodesWithDate = episodes.filter((episode) => episode.event_date).length
  const episodesWithCoordinates = episodes.filter((episode) => Number.isFinite(episode.longitude) && Number.isFinite(episode.latitude)).length

  const handleReport = (event) => {
    event.preventDefault()
    if (!report.street.trim()) {
      setReportMessage('Completá una calle o intersección para agregar el ejemplo.')
      return
    }

    setReports((current) => [{
      id: crypto.randomUUID(),
      intersection: report.street.trim(),
      locality: report.place,
      incidentType: report.type,
      severity: report.level,
      description: report.description.trim(),
      status: 'Ejemplo ficticio',
      isDemo: true,
      source: 'Reporte local de demostración; guardado solo en memoria',
    }, ...current])
    setReportMessage('Reporte agregado solo como ejemplo en esta sesión. No se envió a ningún servicio ni se agregó a los antecedentes.')
    setReport((current) => ({ ...current, street: '', description: '' }))
  }

  const handleRoute = (event) => {
    event.preventDefault()
    if (!route.origin.trim() || !route.destination.trim()) {
      setRouteMessage('Indicá un punto de partida y un destino para ver la demostración.')
      return
    }
    setRouteMessage(`Vista de ejemplo: ${route.origin} → ${route.destination}. No es una ruta calculada ni informa si las calles son transitables.`)
  }

  return (
    <main className="app-shell" id="inicio">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Mapa de Inundaciones de Tigre, inicio">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">TIGRE <b>ALERTA</b><small>MAPA DE INUNDACIONES</small></span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#mapa">Mapa</a>
          <a href="#antecedentes">Antecedentes</a>
          <a href="#recorrido">Planificador</a>
          <a href="#reportar">Participación</a>
        </nav>
        <span className="prototype-badge"><i /> PROTOTIPO ACADÉMICO</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">INFORMACIÓN TERRITORIAL · PARTIDO DE TIGRE</p>
          <h1>Antecedentes documentados,<br /><em>con su ubicación a la vista.</em></h1>
          <p className="hero-lead">Consultá episodios históricos y las fuentes que los documentan. La ubicación se muestra con la precisión disponible.</p>
        </div>
        <aside className="documented-warning">
          <span className="warning-mark" aria-hidden="true">i</span>
          <div><strong>Antecedentes documentales</strong><p>Los registros históricos se consultan por separado. Solo se dibujarán cuando tengan coordenadas verificadas. Los reportes del formulario son ejemplos ficticios.</p></div>
        </aside>
      </section>

      <section className="stats-grid" aria-label="Resumen de antecedentes documentados">
        <StatCard label="EPISODIOS DOCUMENTADOS" value={episodesLoading ? 'Cargando…' : episodes.length} detail="Registros históricos consultados en Supabase" icon="▤" tone="blue" />
        <StatCard label="CON FECHA DEL EPISODIO" value={episodesLoading ? '—' : episodesWithDate} detail="Los demás conservan su precisión textual" icon="◷" tone="gold" />
        <StatCard label="UBICABLES EN EL MAPA" value={episodesLoading ? '—' : episodesWithCoordinates} detail="Solo con longitud y latitud disponibles" icon="⌖" tone="green" />
      </section>

      <section className="section-card map-section" id="mapa">
        <div className="section-heading map-heading">
          <div><p className="eyebrow">MAPA BASE</p><h2>Territorio de Tigre</h2><span className="subheading">Cartografía base OpenStreetMap</span></div>
          <span className="map-source-badge">SIN EPISODIOS UBICADOS</span>
        </div>
        <div className="map-frame">
          <DeckGL
            initialViewState={{ longitude: -58.625, latitude: -34.435, zoom: 11.3, pitch: 0, bearing: 0 }}
            controller
            layers={[]}
          >
            <Map mapStyle={mapStyle} attributionControl />
          </DeckGL>
          <div className="map-empty-note">
            <strong>{episodesLoading ? 'Consultando antecedentes…' : episodesWithCoordinates ? 'Los episodios con coordenadas verificadas se mostrarán aquí.' : 'Los episodios actuales no tienen coordenadas verificadas.'}</strong>
            <span>No se asignan puntos ni polígonos aproximados a partir de nombres de barrios o calles.</span>
          </div>
          <span className="map-stamp">MAPA BASE · SIN DATOS DE EVENTOS</span>
        </div>
        <p className="map-caveat">El mapa muestra únicamente cartografía base; no representa riesgo actual ni antecedentes geolocalizados.</p>
      </section>

      <section className="section-card history-section" id="antecedentes">
        <div className="section-heading history-heading">
          <div><p className="eyebrow">REGISTRO HISTÓRICO</p><h2>Antecedentes documentados</h2><span className="subheading">Fuentes y precisión conservadas por episodio</span></div>
          <span className="historical-badge">DATOS DOCUMENTALES</span>
        </div>
        <p className="history-intro">Estos registros describen episodios pasados según las fuentes citadas. La confianza documental no es una medición de severidad ni un nivel de riesgo.</p>

        <div className="history-filters">
          <label className="filter-control">LOCALIDAD
            <select value={selectedLocality} onChange={(event) => setSelectedLocality(event.target.value)}>
              <option>Todas las localidades</option>
              {localities.map((locality) => <option key={locality}>{locality}</option>)}
            </select>
          </label>
          <label className="filter-control">BARRIO O SECTOR
            <select value={selectedNeighborhood} onChange={(event) => setSelectedNeighborhood(event.target.value)}>
              <option>Todos los barrios y sectores</option>
              {allNeighborhoods.map((neighborhood) => <option key={neighborhood}>{neighborhood}</option>)}
            </select>
          </label>
          <span className="history-count">{filteredEpisodes.length} de {episodes.length} episodios</span>
        </div>

        {episodesLoading && <p className="history-state" role="status">Cargando antecedentes desde Supabase…</p>}
        {!episodesLoading && episodesError && <div className="history-error" role="alert"><strong>No se pudieron cargar los antecedentes.</strong><span>{episodesError}</span><small>Verificá las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY, y que exista la vista map_documented_episodes con permisos de lectura.</small></div>}
        {!episodesLoading && !episodesError && episodes.length === 0 && <p className="history-state">La vista está disponible, pero todavía no devolvió episodios.</p>}
        {!episodesLoading && !episodesError && episodes.length > 0 && filteredEpisodes.length === 0 && <p className="history-state">No hay episodios para esos filtros.</p>}
        {!episodesLoading && !episodesError && filteredEpisodes.length > 0 && <div className="episode-list">{filteredEpisodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} />)}</div>}
      </section>

      <section className="lower-grid">
        <section className="section-card planner-section" id="recorrido">
          <div className="section-heading"><div><p className="eyebrow">PLANIFICADOR DE DEMOSTRACIÓN</p><h2>Prepará tu recorrido</h2></div><span className="heading-icon route-icon" aria-hidden="true">↗</span></div>
          <p className="section-intro">Indicá desde dónde salís y hacia dónde necesitás ir.</p>
          <form className="route-form" onSubmit={handleRoute}>
            <label>PUNTO DE PARTIDA<input value={route.origin} onChange={(event) => setRoute({ ...route, origin: event.target.value })} placeholder="Ej. Estación Tigre" /></label>
            <span className="route-connector" aria-hidden="true"><i /></span>
            <label>DESTINO<input value={route.destination} onChange={(event) => setRoute({ ...route, destination: event.target.value })} placeholder="Ej. Puerto de Frutos" /></label>
            <button className="primary-button" type="submit">Ver ejemplo de recorrido <span>→</span></button>
          </form>
          {routeMessage && <p className="inline-feedback" role="status">{routeMessage}</p>}
          <p className="fine-print">Demostración únicamente: no calcula rutas ni informa si las calles son transitables.</p>
        </section>

        <section className="section-card report-section" id="reportar">
          <div className="section-heading"><div><p className="eyebrow">PARTICIPACIÓN · DEMOSTRACIÓN LOCAL</p><h2>Probar el formulario</h2></div><span className="heading-icon report-icon" aria-hidden="true">＋</span></div>
          <p className="demo-data-notice">Este formulario agrega ejemplos ficticios solo a la sesión. No envía reportes y no modifica los antecedentes históricos.</p>
          <form className="report-form" onSubmit={handleReport}>
            <label className="full-field">CALLE O INTERSECCIÓN *<input value={report.street} onChange={(event) => setReport({ ...report, street: event.target.value })} placeholder="Ej. Italia y Sarmiento" /></label>
            <label>LOCALIDAD<select value={report.place} onChange={(event) => setReport({ ...report, place: event.target.value })}>{neighborhoods.map((place) => <option key={place}>{place}</option>)}</select></label>
            <label>TIPO DE INCIDENCIA<select value={report.type} onChange={(event) => setReport({ ...report, type: event.target.value })}><option>Calle anegada</option><option>Agua acumulada</option><option>Árbol caído</option><option>Otro problema</option></select></label>
            <label>NIVEL INFORMADO<select value={report.level} onChange={(event) => setReport({ ...report, level: event.target.value })}><option>No lo sé</option><option>Bajo</option><option>Moderado</option><option>Alto</option></select></label>
            <label className="full-field">DESCRIPCIÓN (OPCIONAL)<textarea value={report.description} onChange={(event) => setReport({ ...report, description: event.target.value })} placeholder="Agregá un detalle breve" rows="2" /></label>
            <button className="primary-button report-submit" type="submit">Agregar ejemplo local <span>→</span></button>
          </form>
          {reportMessage && <p className="inline-feedback" role="status">{reportMessage}</p>}
          <div className="reports-list"><div className="reports-title"><strong>Ejemplos ficticios de esta sesión</strong><span>{reports.length}</span></div>{reports.slice(0, 3).map((item) => <article className="report-row demo-report-row" key={item.id}><span className="report-row-icon">⌖</span><div><strong>{item.intersection}</strong><p>{item.locality} · {item.incidentType}</p></div><span className="pending-tag">FICTICIO</span></article>)}</div>
          <p className="fine-print">Los ejemplos son datos de demostración, no evidencia de inundaciones.</p>
        </section>
      </section>

      <section className="sources-strip">
        <div><p className="eyebrow">FUENTES DE CONSULTA</p><h2>Información para verificar</h2></div>
        <a href="https://www.smn.gob.ar/" target="_blank" rel="noreferrer"><span>01</span><strong>Servicio Meteorológico Nacional</strong><small>Alertas meteorológicas oficiales ↗</small></a>
        <a href="https://alerta.ina.gob.ar/" target="_blank" rel="noreferrer"><span>02</span><strong>Instituto Nacional del Agua</strong><small>Información hidrológica ↗</small></a>
        <a href="https://www.tigre.gob.ar/seguridad/defensa_civil" target="_blank" rel="noreferrer"><span>03</span><strong>Defensa Civil de Tigre</strong><small>Información municipal ↗</small></a>
      </section>

      <footer className="footer"><a className="footer-brand" href="#inicio">TIGRE ALERTA</a><span>Prototipo académico en desarrollo · Mapa de Inundaciones de Tigre</span><a href="#inicio">Volver al inicio ↑</a></footer>
    </main>
  )
}

export default App
