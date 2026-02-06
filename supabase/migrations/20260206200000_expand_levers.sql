-- ============================================================================
-- Expand Levers: Add 15 specific policy mechanism levers
-- ============================================================================
-- The existing 5 levers are generic category-level (e.g., "Regulatory reform
-- initiatives"). These 15 new levers represent specific, actionable policy
-- mechanisms that students and practitioners can study and implement.
-- ============================================================================

-- Insert 15 new specific levers
INSERT INTO levers (lever_id, lever_type_id, name, description, implementation_approach, typical_actors, typical_timeline, feasibility_notes, sort_order)
VALUES
  ('LEV-FEE_WAIVER', 'Regulatory reform', 'Fee waivers and reductions',
   'Waiving or reducing permit fees, impact fees, or tap fees for projects meeting affordability or performance criteria.',
   'Adopt ordinance establishing fee waiver criteria tied to AMI targets, unit count thresholds, or certification standards. Requires revenue offset analysis.',
   'Municipal council, planning department, utility districts',
   'Short-term (6-12 months)',
   'Politically popular; requires revenue offset from general fund or fee redistribution. Most effective when combined with expedited permitting.',
   6),

  ('LEV-EXPEDITED_PERMIT', 'Administrative reform', 'Expedited permitting pathways',
   'Fast-track or by-right permitting for projects meeting pre-defined criteria, eliminating discretionary review delays.',
   'Establish by-right approval for projects within form-based code parameters. Create dedicated affordable housing review track with guaranteed turnaround times.',
   'Planning department, building department, city manager',
   'Short-term (3-6 months)',
   'High impact on R1 (schedule uncertainty). Requires adequate staff capacity or third-party review contracts.',
   7),

  ('LEV-DENSITY_BONUS', 'Regulatory reform', 'Density bonuses for affordable units',
   'Allowing additional density (units per acre or building height) in exchange for including affordable units.',
   'Amend zoning code to include density bonus provisions. Define affordability tiers, bonus ratios, and design standards for bonus units.',
   'Municipal council, planning commission, zoning board',
   'Medium-term (12-18 months)',
   'Proven effective in high-land-cost markets. Must balance community concerns about neighborhood character with housing production goals.',
   8),

  ('LEV-INCLUSIONARY', 'Regulatory reform', 'Inclusionary zoning requirements',
   'Requiring a percentage of new residential development to be affordable, with alternatives such as in-lieu fees or off-site construction.',
   'Adopt inclusionary housing ordinance defining set-aside percentage, AMI targets, compliance alternatives, and monitoring/enforcement.',
   'Municipal council, housing authority, planning department',
   'Medium-term (12-24 months)',
   'Controversial; requires careful economic analysis to avoid discouraging development. In-lieu fee alternatives provide flexibility.',
   9),

  ('LEV-LAND_TRUST', 'Financing / underwriting', 'Community land trust and shared equity',
   'Separating land ownership from building ownership to permanently preserve affordability through deed restrictions or ground leases.',
   'Establish or partner with community land trust. Transfer publicly owned land via ground lease. Implement shared equity homeownership models.',
   'Housing authority, community land trust, municipal council, lenders',
   'Long-term (24-36 months)',
   'Most effective for long-term affordability preservation. Requires ongoing stewardship capacity and lender familiarity with ground lease structures.',
   10),

  ('LEV-TIF', 'Financing / underwriting', 'Tax increment financing districts',
   'Capturing increased property tax revenue from new development to fund infrastructure improvements that support affordable housing.',
   'Establish TIF district with affordable housing as eligible use. Define base value, increment allocation, and project eligibility criteria.',
   'Municipal council, finance department, housing authority, county assessor',
   'Medium-term (12-18 months)',
   'Effective for infrastructure-heavy sites. Requires demonstrating that development would not occur "but for" the TIF subsidy.',
   11),

  ('LEV-WEATHERIZATION', 'Technical standard / code', 'Weatherization and energy retrofit programs',
   'Programs that fund or incentivize building envelope and systems upgrades to reduce operating costs and improve occupant comfort.',
   'Establish or expand weatherization assistance program. Create utility-funded energy efficiency incentives. Adopt above-code energy standards with compliance pathways.',
   'Utility companies, state energy office, housing authority, contractors',
   'Short-term (3-12 months)',
   'High ROI for occupant affordability through reduced O01 utility costs. Directly links BPF performance (controls) to HAF cost reduction.',
   12),

  ('LEV-PREAPPROVED_PLANS', 'Administrative reform', 'Pre-approved residential plan sets',
   'Developing and maintaining a library of pre-reviewed residential designs that can be permitted with minimal additional review.',
   'Commission development of pre-approved plan sets. Establish streamlined permit pathway for projects using approved plans. Update plans as codes change.',
   'Building department, architects, planning department',
   'Medium-term (6-12 months)',
   'Dramatically reduces R1 (schedule) and R3 (scope uncertainty). Most effective for infill lots with predictable site conditions.',
   13),

  ('LEV-MODULAR', 'Technical standard / code', 'Modular and factory-built approval pathways',
   'Creating clear permitting and inspection pathways for modular, panelized, and factory-built construction methods.',
   'Adopt state modular building code provisions. Establish factory inspection agreements. Train local inspectors on modular assembly verification.',
   'Building department, state building code council, modular manufacturers',
   'Medium-term (12-18 months)',
   'Addresses BAR-MODULAR_RESTRICTIONS directly. Factory QC can exceed field quality. Reduces weather delays (R1) and labor cost variability.',
   14),

  ('LEV-WORKFORCE', 'Market practice', 'Construction workforce development',
   'Programs to train, recruit, and retain skilled construction workers to address labor shortages that drive up costs and timelines.',
   'Partner with community colleges and trade schools. Establish apprenticeship pipelines. Create pre-apprenticeship programs for underrepresented groups.',
   'Trade unions, community colleges, workforce development boards, contractors',
   'Long-term (24-36 months)',
   'Addresses root cause of labor cost inflation. Slow to show results but compounds over time. Critical for sustaining production capacity.',
   15),

  ('LEV-ADU_REFORM', 'Regulatory reform', 'ADU and missing middle zoning reform',
   'Reforming zoning codes to allow accessory dwelling units, duplexes, triplexes, and other missing middle housing types by right.',
   'Amend single-family zoning to allow ADUs, duplexes, triplexes by right. Reduce minimum lot sizes and setbacks. Remove owner-occupancy requirements.',
   'Municipal council, planning commission, zoning board',
   'Medium-term (6-12 months)',
   'High impact on land cost per unit (B01). Politically sensitive in established neighborhoods. Oregon, California, Minnesota provide model legislation.',
   16),

  ('LEV-INFRA_SHARING', 'Regulatory reform', 'Infrastructure cost-sharing agreements',
   'Mechanisms for sharing infrastructure costs across multiple developments or between developers and municipalities.',
   'Establish area-wide infrastructure plans with proportional cost sharing. Create reimbursement agreements for oversized infrastructure. Use special improvement districts.',
   'Municipal council, public works, developers, special districts',
   'Medium-term (12-24 months)',
   'Addresses first-mover disadvantage where initial developers bear disproportionate infrastructure costs. Reduces B04 and B05 per-unit costs.',
   17),

  ('LEV-PUBLIC_LAND', 'Financing / underwriting', 'Public land disposition for housing',
   'Making publicly owned land available for affordable housing development through below-market sale, long-term lease, or land banking.',
   'Inventory publicly owned surplus parcels. Establish disposition criteria prioritizing affordable housing. Use ground leases to maintain public ownership.',
   'Municipal council, housing authority, school districts, county, state agencies',
   'Medium-term (12-18 months)',
   'Directly reduces B01 (land cost), which is often 15-30% of total development cost. Requires political will to prioritize housing over revenue maximization.',
   18),

  ('LEV-GREEN_INCENTIVE', 'Technical standard / code', 'Green building certification incentives',
   'Incentives for projects achieving green building certifications (ENERGY STAR, LEED, Passive House, ZERH) through fee reductions, expedited review, or density bonuses.',
   'Adopt incentive tiers linked to certification levels. Streamline permit process for certified projects. Provide technical assistance and fee offsets.',
   'Building department, planning department, utility companies, green building organizations',
   'Short-term (6-12 months)',
   'Links B06c05 (certification costs) to long-term O01 (utility) savings. Creates market signal for high-performance construction.',
   19),

  ('LEV-TOD', 'Regulatory reform', 'Transit-oriented development incentives',
   'Incentivizing higher-density, mixed-use development near transit stations through relaxed zoning, reduced parking requirements, and infrastructure investment.',
   'Establish TOD overlay zones with increased height/density allowances. Reduce or eliminate minimum parking requirements near transit. Invest in pedestrian/bicycle infrastructure.',
   'Municipal council, transit authority, planning department, regional planning',
   'Medium-term (12-24 months)',
   'Addresses BAR-EXCESS_PARKING and BAR-PARKING_INDUCED_SIZE. Most effective in cities with existing or planned transit investment.',
   20)
ON CONFLICT (lever_id) DO NOTHING;

-- ============================================================================
-- Map new levers to relevant barriers via barrier_lever_map
-- ============================================================================

INSERT INTO barrier_lever_map (barrier_id, lever_id, relationship_notes)
VALUES
  -- LEV-FEE_WAIVER
  ('BAR-VALUATION_BASED_FEES', 'LEV-FEE_WAIVER', 'Fee waivers directly offset valuation-based fee burden'),
  ('BAR-UNSCALED_FEES', 'LEV-FEE_WAIVER', 'Waiving fees removes barrier of fees not scaled to unit size'),
  ('BAR-FLAT_TAP_FEES', 'LEV-FEE_WAIVER', 'Fee reduction programs can address flat tap fee structures'),
  ('BAR-SPECIAL_DISTRICT_FLAT', 'LEV-FEE_WAIVER', 'Waiver programs can offset flat special district fees'),

  -- LEV-EXPEDITED_PERMIT
  ('BAR-LONG_TIMELINES', 'LEV-EXPEDITED_PERMIT', 'Expedited pathways directly reduce approval timelines'),
  ('BAR-SEQUENTIAL_REVIEWS', 'LEV-EXPEDITED_PERMIT', 'Fast-track can parallelize sequential review steps'),
  ('BAR-MULTIPLE_PLAN_CHECKS', 'LEV-EXPEDITED_PERMIT', 'Single streamlined review replaces multiple plan checks'),
  ('BAR-INSPECTION_DELAYS', 'LEV-EXPEDITED_PERMIT', 'Dedicated inspection scheduling reduces construction delays'),
  ('BAR-DISCRETIONARY_REVIEW', 'LEV-EXPEDITED_PERMIT', 'By-right pathways eliminate discretionary review entirely'),
  ('BAR-STAFF_CAPACITY', 'LEV-EXPEDITED_PERMIT', 'Third-party review contracts supplement limited staff'),

  -- LEV-DENSITY_BONUS
  ('BAR-MIN_LOT_SIZE', 'LEV-DENSITY_BONUS', 'Density bonuses override minimum lot size for qualifying projects'),
  ('BAR-MIN_UNIT_SIZE', 'LEV-DENSITY_BONUS', 'Bonus units can be smaller than standard minimums'),
  ('BAR-DEMAND_MISMATCH', 'LEV-DENSITY_BONUS', 'More units per site helps match housing supply to demand'),
  ('BAR-PUBLIC_OPPOSITION', 'LEV-DENSITY_BONUS', 'Affordability requirement provides public benefit justification for density'),

  -- LEV-INCLUSIONARY
  ('BAR-DEMAND_MISMATCH', 'LEV-INCLUSIONARY', 'Requires production of affordable units within market-rate projects'),
  ('BAR-NO_PROPORTIONALITY', 'LEV-INCLUSIONARY', 'Creates proportional affordable housing production requirement'),

  -- LEV-LAND_TRUST
  ('BAR-APPRAISAL_BIAS', 'LEV-LAND_TRUST', 'CLT model addresses appraisal challenges through ground lease structure'),
  ('BAR-APPRAISAL_LAG', 'LEV-LAND_TRUST', 'Shared equity model reduces dependency on appraisal timing'),
  ('BAR-CONSERVATIVE_UNDERWRITE', 'LEV-LAND_TRUST', 'CLT stewardship model reduces lender risk, enabling better terms'),
  ('BAR-FIRST_COST_BIAS', 'LEV-LAND_TRUST', 'Land cost removal shifts focus from first cost to lifecycle cost'),

  -- LEV-TIF
  ('BAR-UNSCALED_FEES', 'LEV-TIF', 'TIF revenues can offset infrastructure fees for affordable projects'),
  ('BAR-NO_PROPORTIONALITY', 'LEV-TIF', 'TIF captures proportional value from development to fund infrastructure'),

  -- LEV-WEATHERIZATION
  ('BAR-LOW_EFFICIENCY', 'LEV-WEATHERIZATION', 'Weatherization programs directly upgrade building efficiency'),
  ('BAR-FIRST_COST_BIAS', 'LEV-WEATHERIZATION', 'Subsidized upgrades overcome first-cost barrier to efficiency investment'),
  ('BAR-LOW_DURABILITY_MATERIALS', 'LEV-WEATHERIZATION', 'Retrofit programs can replace low-durability materials with better alternatives'),
  ('BAR-MIN_CODE_ONLY', 'LEV-WEATHERIZATION', 'Programs incentivize performance above minimum code requirements'),

  -- LEV-PREAPPROVED_PLANS
  ('BAR-LONG_TIMELINES', 'LEV-PREAPPROVED_PLANS', 'Pre-approved plans eliminate plan review time'),
  ('BAR-CUSTOM_DESIGN', 'LEV-PREAPPROVED_PLANS', 'Standard plans reduce custom design cost and risk'),
  ('BAR-NO_SIMPLE_ARCHETYPES', 'LEV-PREAPPROVED_PLANS', 'Pre-approved library provides simple, proven archetypes'),
  ('BAR-NO_STANDARD_PLANS', 'LEV-PREAPPROVED_PLANS', 'Directly addresses lack of standard plans'),
  ('BAR-INCONSISTENT_REVIEW', 'LEV-PREAPPROVED_PLANS', 'Pre-reviewed plans eliminate review interpretation variability'),

  -- LEV-MODULAR
  ('BAR-MODULAR_RESTRICTIONS', 'LEV-MODULAR', 'Directly removes barriers to modular construction'),
  ('BAR-PRESCRIPTIVE_CODES', 'LEV-MODULAR', 'Performance-based pathways accommodate factory-built methods'),
  ('BAR-PRESCRIPTIVE_MATERIALS', 'LEV-MODULAR', 'Expanded material acceptance enables factory-optimized assemblies'),
  ('BAR-INSPECTION_MISMATCH', 'LEV-MODULAR', 'Factory inspection agreements align with production schedule'),

  -- LEV-WORKFORCE
  ('BAR-PRACTICE_GAPS', 'LEV-WORKFORCE', 'Training programs close gaps between design intent and field practice'),
  ('BAR-FRAGMENTED_SEQUENCING', 'LEV-WORKFORCE', 'Cross-trained workers reduce sequencing coordination failures'),
  ('BAR-DESIGN_GUIDANCE_GAPS', 'LEV-WORKFORCE', 'Workforce education bridges gap between design specs and field execution'),

  -- LEV-ADU_REFORM
  ('BAR-MIN_LOT_SIZE', 'LEV-ADU_REFORM', 'ADU reform allows additional units on existing lots'),
  ('BAR-MIN_UNIT_SIZE', 'LEV-ADU_REFORM', 'ADU reform accommodates smaller dwelling units'),
  ('BAR-USE_PROHIBITION', 'LEV-ADU_REFORM', 'Reform removes single-family-only use restrictions'),
  ('BAR-HOA_PROHIBITION', 'LEV-ADU_REFORM', 'State-level reform can override HOA restrictions on ADUs'),
  ('BAR-EXCESS_PARKING', 'LEV-ADU_REFORM', 'ADU reform typically reduces or eliminates parking requirements for ADUs'),
  ('BAR-PUBLIC_OPPOSITION', 'LEV-ADU_REFORM', 'By-right ADU approval removes discretionary triggers for opposition'),

  -- LEV-INFRA_SHARING
  ('BAR-FLAT_TAP_FEES', 'LEV-INFRA_SHARING', 'Shared infrastructure agreements distribute tap fee burden proportionally'),
  ('BAR-CONSERVATIVE_STORMWATER', 'LEV-INFRA_SHARING', 'Regional stormwater facilities reduce per-project requirements'),
  ('BAR-OVERSIZED_STREETS', 'LEV-INFRA_SHARING', 'Cost sharing spreads oversized infrastructure costs across benefiting properties'),
  ('BAR-UTILITY_SETBACKS', 'LEV-INFRA_SHARING', 'Shared utility corridors can reduce per-lot setback requirements'),

  -- LEV-PUBLIC_LAND
  ('BAR-DEMAND_MISMATCH', 'LEV-PUBLIC_LAND', 'Public land disposition enables affordable housing where market land costs prohibit it'),
  ('BAR-FIRST_COST_BIAS', 'LEV-PUBLIC_LAND', 'Below-market land reduces total first cost, enabling higher construction quality'),

  -- LEV-GREEN_INCENTIVE
  ('BAR-FIRST_COST_BIAS', 'LEV-GREEN_INCENTIVE', 'Incentives offset green building premium, reducing first-cost barrier'),
  ('BAR-LOW_EFFICIENCY', 'LEV-GREEN_INCENTIVE', 'Certification requirements ensure above-code energy performance'),
  ('BAR-VERIFICATION_COST', 'LEV-GREEN_INCENTIVE', 'Fee offsets reduce net cost of third-party verification'),
  ('BAR-NO_INSURABILITY_SIGNAL', 'LEV-GREEN_INCENTIVE', 'Green certifications provide performance signal for insurance underwriting'),

  -- LEV-TOD
  ('BAR-EXCESS_PARKING', 'LEV-TOD', 'TOD zones reduce or eliminate minimum parking requirements'),
  ('BAR-PARKING_INDUCED_SIZE', 'LEV-TOD', 'Reduced parking requirements shrink building footprint, reducing cost'),
  ('BAR-MIN_LOT_SIZE', 'LEV-TOD', 'TOD overlays allow smaller lots near transit'),
  ('BAR-PUBLIC_OPPOSITION', 'LEV-TOD', 'Transit proximity provides public benefit justification for density')
ON CONFLICT (barrier_id, lever_id) DO NOTHING;
