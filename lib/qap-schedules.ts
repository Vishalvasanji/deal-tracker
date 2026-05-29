// Schedules — combines the QAP application exhibits/appendices into one module:
//   App 1 Owner Info, App 2 Site Control, App 3 Ownership History,
//   App 11 NP Participation (gated by §11 qualified nonprofit),
//   App 35 Matching, App 36 Environmental, LHC-2 CEO Notification,
//   Existing LHC Property (gated by §12 is existing LIHTC property).
// App 13 (Counsel's Opinion) and App 34 (Debarment) are intentionally excluded.
// Every "By:" signatory field auto-fills with the Controlling Principal name (§11).

export const SCHEDULES_SECTION = 'schedules'

// Read-only values pulled from Project Description §11 / §12.
export interface SchedulesPulled {
  taxpayerName: string
  taxpayerIs: string
  taxpayerTaxId: string
  controllingPrincipalName: string
  controllingPrincipalRole: string
  taxpayerContact: string
  taxpayerEmail: string
  taxpayerPhone: string
  taxpayerAddress: string
  taxpayerCityStateZip: string
  builderRelated: string   // §11 ioi_dev_builder (Yes/No)
  projectName: string
  streetAddress: string
  city: string
  parish: string
  zip: string
  isDistressed: string     // §12 is_distressed (Yes/No)
}

// App 35 Matching — five fixed match categories (rows 10–18).
export const MATCHING_LINES = [
  { key: 'match_local_cash',     label: 'Non-federal cash from local governmental unit' },
  { key: 'match_tax_abatement',  label: 'Abatement of state or local taxes, fees or other charges that otherwise would have been imposed' },
  { key: 'match_land_value',     label: 'Value of land or other real property (less debt, lien or encumbrance) not acquired with federal funds' },
  { key: 'match_infrastructure', label: 'Investments within the prior 10 months from non-federal resources in on-site/off-site infrastructure' },
  { key: 'match_site_prep',      label: 'Reasonable value of site preparation and construction materials not acquired with federal resources' },
] as const

// LHC-2 CEO Notification — three jurisdiction blocks, each with the same fields.
export const CEO_BLOCKS = [
  { key: 'local',  title: 'Local',               ceoLabel: 'Name of local Chief Executive Officer (CEO)' },
  { key: 'parish', title: 'Parish',              ceoLabel: 'Name of Parish Chief Executive Officer (CEO)' },
  { key: 'state',  title: 'State Representative', ceoLabel: 'Name of State Representative' },
] as const

export const CEO_FIELDS = [
  { key: 'title',        label: 'Job Title' },
  { key: 'locality',     label: 'Municipality/Locality' },
  { key: 'address',      label: 'Street Address' },
  { key: 'citystatezip', label: 'City, State, Zip' },
  { key: 'salutation',   label: 'Salutation' },
] as const

// App 11 NP Participation — affordable housing developments table columns.
export const NP_DEV_COLUMNS = [
  { key: 'name',       label: 'Name' },
  { key: 'location',   label: 'Location' },
  { key: 'units',      label: 'Number of Units' },
  { key: 'subsidized', label: 'Subsidized?', options: ['Yes', 'No'] },
] as const

// App 36 Environmental — restrictions checklist.
export interface EnvItem { key: string; label: string; type: 'yesno' | 'text' }
export interface EnvGroup { title: string; items: EnvItem[] }

export const ENV_GROUPS: EnvGroup[] = [
  { title: 'Flood Plain', items: [
    { key: 'env_flood_sfha',       label: 'Is the project located in a FEMA Special Flood Hazard Area?', type: 'yesno' },
    { key: 'env_flood_map_panel',  label: 'Identify Map Panel and Date', type: 'text' },
    { key: 'env_flood_insurance',  label: 'Does the project currently carry Flood Insurance?', type: 'yesno' },
    { key: 'env_flood_structures', label: 'Do any structures appear to be within or close to the floodplain?', type: 'yesno' },
  ] },
  { title: 'Historic Preservation', items: [
    { key: 'env_hist_listed',            label: 'Is the property listed in the National Register of Historic Places?', type: 'yesno' },
    { key: 'env_hist_district_listed',   label: 'Is the property in a historic district listed in the National Register?', type: 'yesno' },
    { key: 'env_hist_district_eligible', label: 'Is the property in a historic district determined eligible for the National Register?', type: 'yesno' },
  ] },
  { title: 'Airport Hazards', items: [
    { key: 'env_airport_clearzone', label: 'Is the project located in the clear zone of an airport? (24 CFR Part 51 D)', type: 'yesno' },
  ] },
  { title: 'Hazardous Operations', items: [
    { key: 'env_haz_manufacturing', label: 'Any evidence of manufacturing operations utilizing or producing hazardous substances?', type: 'yesno' },
    { key: 'env_haz_past_ops',      label: 'Any evidence that past operations in close proximity used hazardous substances?', type: 'yesno' },
  ] },
  { title: 'Explosive / Flammable Operations & Storage (24 CFR Part 51C)', items: [
    { key: 'env_explosive_tanks', label: 'Visual evidence of unobstructed/unshielded above-ground storage tanks (fuel oil, gas, etc.)?', type: 'yesno' },
  ] },
  { title: 'Toxic Chemical & Radioactive — Petroleum Storage', items: [
    { key: 'env_petro_heating',          label: 'Evidence of heating activities suggesting fuel storage tanks?', type: 'yesno' },
    { key: 'env_petro_in_use',           label: 'If yes, are any such tanks being used?', type: 'yesno' },
    { key: 'env_petro_oos_underground',  label: 'Any out-of-service underground fuel storage tanks?', type: 'yesno' },
  ] },
  { title: 'Polychlorinated Biphenyls (PCB)', items: [
    { key: 'env_pcb_equipment',  label: 'Any evidence electrical equipment (transformers, capacitors, hydraulics) may contain PCBs?', type: 'yesno' },
    { key: 'env_pcb_nonutility', label: 'If yes, is any such equipment owned by a non-utility and not marked?', type: 'yesno' },
    { key: 'env_pcb_tested',     label: 'If yes, indicate whether equipment was tested for PCBs and the results', type: 'text' },
  ] },
  { title: 'Asbestos Containing Materials (ACM)', items: [
    { key: 'env_acm', label: 'Any evidence of ACM insulation or fire-retardant materials (boiler/pipe wrap, etc.)?', type: 'yesno' },
  ] },
  { title: 'Lead Based Paint', items: [
    { key: 'env_lead_pre1978',         label: 'Are there residential structures on the property built prior to 1978?', type: 'yesno' },
    { key: 'env_lead_certified_free',  label: 'If yes, has the property been certified as lead-free?', type: 'yesno' },
    { key: 'env_lead_risk_assessment', label: 'If not certified, has a Risk Assessment been completed?', type: 'yesno' },
    { key: 'env_lead_plan',            label: 'If yes, has the owner developed a plan including Interim Controls?', type: 'yesno' },
    { key: 'env_lead_assessor_review', label: 'If yes, has a qualified Risk Assessor reviewed the plan for 24 CFR 35 compliance?', type: 'yesno' },
  ] },
  { title: 'Easement & Use Restrictions', items: [
    { key: 'env_easements', label: 'Are there easements, deed restrictions, or other use restrictions on this property?', type: 'yesno' },
  ] },
]

export const SITE_CONTROL_METHODS = ['Purchase', 'Option to Purchase', 'Lease'] as const
