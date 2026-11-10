import { supabase } from './supabaseClient.js'

const episodeColumns = [
  'id',
  'event_date',
  'date_precision',
  'localities',
  'neighborhoods',
  'location_description',
  'location_precision',
  'longitude',
  'latitude',
  'geometry',
  'event_type',
  'evidence_summary',
  'documentary_confidence',
  'source_mentions',
].join(', ')

export async function fetchDocumentedEpisodes() {
  if (!supabase) {
    return {
      episodes: [],
      error: new Error('Supabase no está configurado. Completá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.'),
    }
  }

  try {
    const { data, error } = await supabase
      .from('map_documented_episodes')
      .select(episodeColumns)
      .order('event_date', { ascending: false, nullsFirst: false })

    if (error) return { episodes: [], error }

    return {
      episodes: (data ?? []).map((record) => ({
        ...record,
        longitude: record.longitude == null ? null : Number(record.longitude),
        latitude: record.latitude == null ? null : Number(record.latitude),
        source_mentions: Array.isArray(record.source_mentions) ? record.source_mentions : [],
      })),
      error: null,
    }
  } catch (error) {
    return { episodes: [], error }
  }
}
