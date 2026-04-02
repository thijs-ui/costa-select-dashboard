const BASE_URL = 'https://api.pipedrive.com/v1'

// Haalt alle pagina's op via Pipedrive cursor-based pagination
async function pipedriveGetAll(path: string, token: string): Promise<unknown[]> {
  const results: unknown[] = []
  let start = 0
  const limit = 500

  while (true) {
    const res = await fetch(
      `${BASE_URL}${path}?api_token=${token}&limit=${limit}&start=${start}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`Pipedrive API fout: ${res.status} ${path}`)
    const json = await res.json()

    const items = json.data ?? []
    results.push(...items)

    // Stop als er geen volgende pagina is
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start += limit
  }

  return results
}

export interface PipedriveDeal {
  id: number
  title: string
  status: string
  stage_id: number
  pipeline_id: number
  value: number
  currency: string
  add_time: string
  won_time: string | null
  lost_time: string | null
  close_time: string | null
  lost_reason: string | null
  person_id: { value: number; name: string } | null
  person_name: string | null
  user_id: { id: number; name: string } | null
}

export interface PipedriveStage {
  id: number
  name: string
  pipeline_id: number
  order_nr: number
}

export interface PipedrivePipeline {
  id: number
  name: string
}

export interface PipedriveActivity {
  id: number
  subject: string
  type: string
  done: boolean
  due_date: string
  person_name: string | null
  user_id: number
  person_id: { value: number; name: string } | null
}

export interface PipedrivePerson {
  id: number
  name: string
  add_time: string
  owner_id: { id: number; name: string } | null
}

export interface PipedriveUser {
  id: number
  name: string
  active_flag: boolean
}

export async function fetchDeals(token: string): Promise<PipedriveDeal[]> {
  return pipedriveGetAll('/deals', token) as Promise<PipedriveDeal[]>
}

export async function fetchStages(token: string): Promise<PipedriveStage[]> {
  return pipedriveGetAll('/stages', token) as Promise<PipedriveStage[]>
}

export async function fetchPipelines(token: string): Promise<PipedrivePipeline[]> {
  return pipedriveGetAll('/pipelines', token) as Promise<PipedrivePipeline[]>
}

export async function fetchActivities(token: string): Promise<PipedriveActivity[]> {
  const results: PipedriveActivity[] = []
  let start = 0
  const limit = 500

  while (true) {
    const res = await fetch(
      `${BASE_URL}/activities?api_token=${token}&done=1&limit=${limit}&start=${start}`,
      { cache: 'no-store' }
    )
    if (!res.ok) break
    const json = await res.json()
    results.push(...(json.data ?? []))
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start += limit
  }

  return results
}

export async function fetchPersons(token: string): Promise<PipedrivePerson[]> {
  return pipedriveGetAll('/persons', token) as Promise<PipedrivePerson[]>
}

export async function fetchUsers(token: string): Promise<PipedriveUser[]> {
  return pipedriveGetAll('/users', token) as Promise<PipedriveUser[]>
}

export interface PipedriveDealField {
  id: number
  key: string
  name: string
  field_type: string  // 'varchar', 'date', 'enum', 'set', 'int', 'double', 'text'
  options?: Array<{ id: number; label: string }>
}

export async function fetchDealFields(token: string): Promise<PipedriveDealField[]> {
  return pipedriveGetAll('/dealFields', token) as Promise<PipedriveDealField[]>
}

export interface PipedriveLeadField {
  id: number
  key: string
  name: string
  field_type: string
  options?: Array<{ id: number; label: string }>
}

export interface PipedriveLead {
  id: string
  title: string
  owner_id: number
  person_id: { value: number; name: string } | null
  add_time: string
  is_archived: boolean
  [key: string]: unknown
}

export async function fetchLeadFields(token: string): Promise<PipedriveLeadField[]> {
  return pipedriveGetAll('/leadFields', token) as Promise<PipedriveLeadField[]>
}

export interface PipedriveLeadLabel {
  id: string
  name: string
  color: string
}

export async function fetchLeadLabels(token: string): Promise<PipedriveLeadLabel[]> {
  const res = await fetch(
    `${BASE_URL}/leadLabels?api_token=${token}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export async function fetchLeads(token: string): Promise<PipedriveLead[]> {
  const results: PipedriveLead[] = []
  let start = 0
  while (true) {
    const res = await fetch(
      `${BASE_URL}/leads?api_token=${token}&limit=500&start=${start}&archived_status=not_archived`,
      { cache: 'no-store' }
    )
    if (!res.ok) break
    const json = await res.json()
    const items = json.data ?? []
    results.push(...items)
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start += 500
  }
  return results
}

export async function fetchAllActivities(token: string): Promise<PipedriveActivity[]> {
  const results: PipedriveActivity[] = []
  // Fetch done activities
  let start = 0
  while (true) {
    const res = await fetch(
      `${BASE_URL}/activities?api_token=${token}&done=1&limit=500&start=${start}`,
      { cache: 'no-store' }
    )
    if (!res.ok) break
    const json = await res.json()
    results.push(...(json.data ?? []))
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start += 500
  }
  // Fetch open activities
  start = 0
  while (true) {
    const res = await fetch(
      `${BASE_URL}/activities?api_token=${token}&done=0&limit=500&start=${start}`,
      { cache: 'no-store' }
    )
    if (!res.ok) break
    const json = await res.json()
    results.push(...(json.data ?? []))
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start += 500
  }
  return results
}
