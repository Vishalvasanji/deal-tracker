// QAP Checklist — threshold requirements & exhibits, sorted into what THIS project
// must submit vs. what it doesn't, driven by the applicant's answers. Ports the
// "Checklist" sheet's column-A conditions (each requirement is required when its
// condition resolves to "Yes"). Always-required items are listed unconditionally;
// "Not Applicable to This QAP" placeholder rows are omitted.

export interface ChecklistContext {
  // §12 yes/no
  existingAcquired: boolean        // H100 — any existing buildings acquired
  floodHazard: boolean             // H114 — Special Flood Hazard Area
  levee: boolean                   // H115 — levee-protected area
  historicRehab: boolean           // H105 — historic rehabilitation
  rehab: boolean                   // H103 — any rehabilitation
  rentalHousingAcquired: boolean   // H110 — existing rental housing acquired
  scatteredSite: boolean           // H92 = "No" — not a single site
  preservationProperty: boolean    // H157 — preservation property
  federalFunds: boolean            // receives federal funds (federal-agency letter)
  // §11
  notInGoodStanding: boolean       // H66 — a team member not in good standing
  chdo: boolean                    // H73 — applicant is a CHDO
  // §13 / §15
  nonProfitPool: boolean           // M177 = 1 — Qualified Non-Profit / CHDO set-aside pool
  basisBoost: boolean              // M218 = "Boost" — claiming the §15 basis boost
  // computed module flags
  tdcExceeds: boolean              // Dev Costs F255 > 1 — adjusted TDC over the HUD limit
  feeViolations: boolean           // Dev Costs J142 ≠ 0 — a fee/profit limit violation
  unitSizeBathsFlag: boolean       // Unit Mix AO/AP — a unit fails the min size/bath
  // selection-criteria / special-needs (coarse: surfaced for verification when claimed)
  specialNeeds: boolean            // §24 homeless/disabled household target
  extendedAffordability: boolean   // §25.A extended-affordability points
  claimsSelectionPoints: boolean   // any selection self-score entered
}

export type ChecklistGroup = 'Threshold Requirements' | 'Application Exhibits'

export interface ChecklistItem {
  name: string
  group: ChecklistGroup
  /** required when this returns true; always-required items use () => true */
  req: (c: ChecklistContext) => boolean
}

// The worksheets every applicant completes (Checklist rows 9–22). Status comes from
// the app's completion tracker on the page.
export const CHECKLIST_WORKSHEETS: { label: string; completionKey?: string }[] = [
  { label: 'Project Description', completionKey: 'section10' },
  { label: 'Unit Mix and Rents', completionKey: 'unitMix' },
  { label: 'Development Costs', completionKey: 'developmentCosts' },
  { label: 'Basis Calculation', completionKey: 'basisCalculation' },
  { label: 'Revenues and Expenses', completionKey: 'revenuesExpenses' },
  { label: 'Development Team', completionKey: 'developmentTeam' },
  { label: 'Syndication', completionKey: 'syndication' },
  { label: 'Taxpayer Certification' },
  { label: 'Reserve Adequacy', completionKey: 'reserveAdequacy' },
  { label: 'Developer Experience (LHC-3)' },
  { label: 'Property Management Experience (LHC-4)' },
  { label: 'Appendix 1 (Ownership Information)', completionKey: 'schedules' },
  { label: 'Appendix 2 (Site Control Worksheet)', completionKey: 'schedules' },
  { label: 'Appendix 4 (Zoning Evidence)' },
]

const Y = () => true

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // ── Threshold Requirements (Checklist rows 30–144) ──
  { group: 'Threshold Requirements', name: 'Site Control (also Appendix 2)', req: Y },
  { group: 'Threshold Requirements', name: 'Zoning (also Appendix 4)', req: Y },
  { group: 'Threshold Requirements', name: 'Infrastructure', req: Y },
  { group: 'Threshold Requirements', name: 'Environmental Restrictions Checklist', req: c => c.existingAcquired },
  { group: 'Threshold Requirements', name: 'Taxpayer Agreement Regarding Tenant Referrals', req: Y },
  { group: 'Threshold Requirements', name: 'Minimum Internet / Cable Capacity', req: Y },
  { group: 'Threshold Requirements', name: 'Amenities: On-Site Laundry or Washers & Dryers', req: Y },
  { group: 'Threshold Requirements', name: 'Energy Efficiency Requirements', req: Y },
  { group: 'Threshold Requirements', name: 'Design Features', req: Y },
  { group: 'Threshold Requirements', name: 'NC or SR Projects in a Special Flood Hazard Area', req: c => c.floodHazard },
  { group: 'Threshold Requirements', name: 'Compliance with Local Floodplain Management', req: Y },
  { group: 'Threshold Requirements', name: 'Floodplain Determination', req: Y },
  { group: 'Threshold Requirements', name: "Architect's Certification — Levee-Protected Area", req: c => c.levee },
  { group: 'Threshold Requirements', name: 'Capital Needs Assessment (also Appendix 6)', req: c => c.rentalHousingAcquired || c.existingAcquired },
  { group: 'Threshold Requirements', name: 'Historic Rehabilitation Projects', req: c => c.historicRehab },
  { group: 'Threshold Requirements', name: 'Minimum Score', req: Y },
  { group: 'Threshold Requirements', name: 'Audited Financials of Project (or Equivalent)', req: c => c.rentalHousingAcquired },
  { group: 'Threshold Requirements', name: 'Sales Price With Related Persons', req: c => c.existingAcquired },
  { group: 'Threshold Requirements', name: 'Ten-Year Title History (also Appendix 3)', req: Y },
  { group: 'Threshold Requirements', name: 'Organizational Chart for Taxpayer / Applicant', req: Y },
  { group: 'Threshold Requirements', name: 'Developer Experience', req: Y },
  { group: 'Threshold Requirements', name: 'Property Management Experience', req: Y },
  { group: 'Threshold Requirements', name: 'Development Team Member "Not in Good Standing"', req: c => c.notInGoodStanding },
  { group: 'Threshold Requirements', name: 'Local Community Notification (also Appendix 37)', req: Y },
  { group: 'Threshold Requirements', name: 'Failure to Meet Minimum Unit Size / Bathroom Requirements', req: c => c.unitSizeBathsFlag },
  { group: 'Threshold Requirements', name: 'Failure to Meet Maximum Unit Development Cost', req: c => c.tdcExceeds },
  { group: 'Threshold Requirements', name: 'Construction and Design Standards', req: Y },
  { group: 'Threshold Requirements', name: 'Project Amenities (also Appendix 29)', req: Y },
  { group: 'Threshold Requirements', name: 'One or More Violations of Fee and Profit Limits', req: c => c.feeViolations },
  { group: 'Threshold Requirements', name: 'Developer Certification of Sources and Uses', req: Y },
  { group: 'Threshold Requirements', name: 'Resiliency Standards — Tier 1/2 Parishes', req: Y },
  { group: 'Threshold Requirements', name: 'Resiliency Standards — New Construction', req: c => c.rehab === false },
  { group: 'Threshold Requirements', name: 'Legal Description', req: Y },
  { group: 'Threshold Requirements', name: 'Map', req: Y },
  { group: 'Threshold Requirements', name: 'Negative Neighborhood Features', req: Y },
  { group: 'Threshold Requirements', name: 'Development Wi-Fi', req: Y },
  { group: 'Threshold Requirements', name: 'LIHTC Compliance Training', req: Y },
  { group: 'Threshold Requirements', name: '30% AMI and Target Population', req: Y },
  { group: 'Threshold Requirements', name: 'Signed Documents', req: Y },

  // ── Application Exhibits (Checklist rows 158–312) ──
  { group: 'Application Exhibits', name: 'Site Control', req: Y },
  { group: 'Application Exhibits', name: 'Ownership History', req: Y },
  { group: 'Application Exhibits', name: 'Zoning', req: Y },
  { group: 'Application Exhibits', name: 'Appraisal', req: c => c.rehab },
  { group: 'Application Exhibits', name: 'Capital Needs Assessment', req: c => c.rentalHousingAcquired || c.existingAcquired },
  { group: 'Application Exhibits', name: 'Financing Commitments', req: Y },
  { group: 'Application Exhibits', name: 'Waiver of Profit Limits', req: c => c.feeViolations },
  { group: 'Application Exhibits', name: 'Development Services Agreement', req: Y },
  { group: 'Application Exhibits', name: 'Federal Agency Letter', req: c => c.federalFunds },
  { group: 'Application Exhibits', name: 'Non-Profit Participation', req: c => c.nonProfitPool },
  { group: 'Application Exhibits', name: 'Non-Profit IRS Determination Letter', req: c => c.nonProfitPool },
  { group: 'Application Exhibits', name: "Non-Profit Counsel's Opinion", req: c => c.nonProfitPool },
  { group: 'Application Exhibits', name: 'Non-Profit Articles and By-Laws', req: c => c.nonProfitPool },
  { group: 'Application Exhibits', name: 'CHDO Approval Letter', req: c => c.chdo },
  { group: 'Application Exhibits', name: 'Points Claimed for Geographic Diversity', req: c => c.claimsSelectionPoints },
  { group: 'Application Exhibits', name: 'Points Claimed for Redevelopment Project', req: c => c.claimsSelectionPoints },
  { group: 'Application Exhibits', name: 'Points Claimed in Rehabilitation & Preservation', req: Y },
  { group: 'Application Exhibits', name: 'Scattered-Site Project', req: c => c.scatteredSite },
  { group: 'Application Exhibits', name: 'Preservation Property', req: c => c.preservationProperty },
  { group: 'Application Exhibits', name: 'Special Needs Project (Non-Elderly)', req: c => c.specialNeeds },
  { group: 'Application Exhibits', name: 'Points Claimed for Increased Unit Affordability', req: c => c.claimsSelectionPoints },
  { group: 'Application Exhibits', name: 'Basis Boost', req: c => c.basisBoost },
  { group: 'Application Exhibits', name: 'Points Claimed for Additional Financial Support', req: c => c.extendedAffordability },
  { group: 'Application Exhibits', name: 'Community Facilities', req: c => c.claimsSelectionPoints },
  { group: 'Application Exhibits', name: 'Points Claimed for Additional Accessible Units', req: c => c.claimsSelectionPoints },
  { group: 'Application Exhibits', name: 'Points Claimed for On-Site Security', req: c => c.claimsSelectionPoints },
  { group: 'Application Exhibits', name: 'Certification Regarding Debarment', req: Y },
  { group: 'Application Exhibits', name: 'Environmental Restrictions Checklist', req: c => c.existingAcquired },
  { group: 'Application Exhibits', name: 'CEO Notification Letter', req: Y },
  { group: 'Application Exhibits', name: 'Developer Experience Exhibit', req: Y },
  { group: 'Application Exhibits', name: 'Management Experience Exhibit', req: Y },
  { group: 'Application Exhibits', name: 'Tenant Selection Plan', req: Y },
]

export interface ChecklistResult {
  required: ChecklistItem[]
  notRequired: ChecklistItem[]
}

export function evaluateChecklist(ctx: ChecklistContext): ChecklistResult {
  const required: ChecklistItem[] = []
  const notRequired: ChecklistItem[] = []
  for (const it of CHECKLIST_ITEMS) (it.req(ctx) ? required : notRequired).push(it)
  return { required, notRequired }
}
