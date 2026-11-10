import datasetCsv from './dataset-demo-inundaciones-tigre.csv?raw'

const severityLabels = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
}

function parseDataset(csv) {
  const [headerLine, ...dataLines] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')

  return dataLines.filter(Boolean).map((line) => {
    const values = line.split(',')
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index]]))

    return {
      id: record.name.toLowerCase().replaceAll(' ', '-'),
      name: record.name,
      locality: record.locality,
      intersection: record.description,
      eventDate: record.event_date,
      incidentType: 'Anegamiento simulado',
      severity: severityLabels[record.category] ?? 'No determinado',
      category: record.category,
      value: Number(record.value),
      coordinates: {
        longitude: Number(record.longitude),
        latitude: Number(record.latitude),
      },
      isDemo: record.is_demo === 'true',
      source: record.source,
    }
  })
}

export const demoEvents = parseDataset(datasetCsv)
