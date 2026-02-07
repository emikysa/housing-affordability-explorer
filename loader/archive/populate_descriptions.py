#!/usr/bin/env python3
"""
Populate descriptions for all cost elements that don't have one.
Descriptions are short (few words) to help users understand scope.
"""

import csv

# Description mappings by ce_id or short_name
# Format: key -> description
DESCRIPTIONS = {
    # ============================================
    # B01 - LAND
    # ============================================
    "B01a-Land acquisition": "Purchasing property",
    "B01b-Land assembly": "Combining multiple parcels",

    "B01a01-Brokerage": "Real estate broker services",
    "B01a02-Due diligence": "Pre-purchase investigation",
    "B01a03-Legal": "Purchase legal services",
    "B01a04-Parcel purchase": "Land purchase costs",
    "B01b01-Easements": "Access rights acquisition",
    "B01b02-Multiple parcels": "Multi-parcel assembly",

    "B01a01a-Commission": "Broker fees",
    "B01a02a-Feasibility": "Feasibility analysis",
    "B01a03a-Closing costs": "Title and escrow fees",
    "B01a04a-Option premium": "Option to purchase fee",
    "B01a04b-Purchase price": "Land purchase amount",
    "B01b01a-Acquisition": "Easement purchase",
    "B01b02a-Assemblage premium": "Multi-parcel premium",

    # ============================================
    # B02 - PRE-DEVELOPMENT
    # ============================================
    "B02a-Surveys": "Site survey services",
    "B02b-Geotechnical": "Soil and subsurface analysis",
    "B02c-Environmental": "Environmental assessments",
    "B02d-Planning": "Project planning studies",
    "B02e-Engineering studies": "Preliminary engineering",
    "B02f-Legal": "Pre-development legal",
    "B02g-Public process": "Community engagement",

    "B02a01-Boundary survey": "Property line survey",
    "B02a02-Topographic survey": "Elevation and contours",
    "B02a03-Utility locate": "Underground utility mapping",
    "B02b01-Soil investigation": "Soil boring and testing",
    "B02b02-Geotechnical report": "Foundation recommendations",
    "B02c01-Phase I ESA": "Environmental records review",
    "B02c02-Phase II ESA": "Soil/groundwater sampling",
    "B02c03-Endangered species": "Wildlife habitat assessment",
    "B02c04-Wetland delineation": "Wetland boundary mapping",
    "B02d01-Market study": "Demand analysis",
    "B02d02-Zoning analysis": "Land use evaluation",
    "B02d03-Concept design": "Preliminary design concepts",
    "B02e01-Civil preliminary": "Preliminary site engineering",
    "B02e02-Drainage study": "Stormwater analysis",
    "B02e03-Traffic study": "Traffic impact analysis",
    "B02f01-Entitlement counsel": "Approval process attorney",
    "B02f02-Land use attorney": "Zoning legal services",
    "B02g01-Community meetings": "Neighborhood outreach",
    "B02g02-Government liaison": "Agency coordination",

    # ============================================
    # B05 - SITE INFRASTRUCTURE
    # ============================================
    "B05a-Site preparation": "Clearing and demolition",
    "B05b-Earthwork & grading": "Earth moving and shaping",
    "B05c-Stormwater & drainage": "Storm drainage systems",
    "B05d-Site utilities (wet + dry)": "Underground utilities",
    "B05e-Paving & transportation": "Roads and parking",
    "B05f-Site improvements & amenities": "Site features",
    "B05g-Landscaping & irrigation": "Planting and watering",

    "B05a01-Site prep": "Initial site work",
    "B05a02-Erosion control": "Sediment management",
    "B05b01-Grading": "Site leveling",
    "B05c01-Detention": "Stormwater storage",
    "B05c02-Water quality": "Runoff treatment",
    "B05d01-Electric": "Site electrical service",
    "B05d02-Gas": "Natural gas service",
    "B05d03-Sanitary sewer": "Wastewater piping",
    "B05d04-Storm sewer": "Storm drain piping",
    "B05d05-Telecom": "Communications conduit",
    "B05d06-Water": "Potable water service",
    "B05e01-Subgrade and base": "Pavement foundation",
    "B05e02-Curb and gutter": "Street edging",
    "B05e03-Paving": "Asphalt or concrete surface",
    "B05e04-Driveways": "Vehicle access",
    "B05e05-Surface lot": "At-grade parking",
    "B05e06-Sidewalks": "Pedestrian paths",
    "B05e07-EV charging": "Electric vehicle stations",
    "B05e08-Striping and signage": "Pavement markings",
    "B05e09-Parking structure": "Multi-level parking",
    "B05f01-Retaining walls": "Grade change structures",
    "B05f02-Fencing": "Perimeter enclosure",
    "B05f03-Structures": "Site buildings",
    "B05f04-Lighting": "Exterior illumination",
    "B05f05-Recreation": "Play and sport areas",
    "B05f06-Furniture": "Benches and fixtures",
    "B05g01-Irrigation": "Landscape watering",
    "B05g02-Hardscape": "Paved landscape areas",
    "B05g03-Trees": "Tree planting",
    "B05g04-Shrubs and groundcover": "Low plantings",
    "B05g05-Sod and seed": "Lawn establishment",

    "B05a01a-Demolition": "Structure removal",
    "B05a01b-Clearing": "Vegetation removal",
    "B05a02a-Permanent": "Long-term erosion control",
    "B05a02b-Temporary": "Construction-phase control",
    "B05b01a-Rough grading": "Initial earth moving",
    "B05b01b-Import/export": "Soil hauling",
    "B05b01c-Fine grading": "Final surface shaping",
    "B05d01a-Primary": "Main electrical feed",
    "B05d01b-Secondary": "Distribution wiring",
    "B05d02a-Main and service": "Gas line and meter",
    "B05d03a-Main extension": "Sewer line extension",
    "B05d03b-Service lateral": "Building sewer connection",
    "B05d04a-Pipe and structures": "Storm drain system",
    "B05d05a-Conduit": "Telecom raceway",
    "B05d06a-Main extension": "Water line extension",
    "B05d06b-Service lateral": "Building water connection",
    "B05g02a-Patios": "Outdoor living surfaces",
    "B05g02b-Walkways": "Landscape paths",
    "B05g02c-Walls and borders": "Landscape edging",

    # ============================================
    # B06 - SOFT COSTS
    # ============================================
    "B06a-Architecture": "Design services",
    "B06b-Engineering": "Engineering consultants",
    "B06c-Consultants": "Specialty consultants",
    "B06d-Legal": "Project legal services",
    "B06e-Development management": "Project oversight",
    "B06f-Project accounting": "Financial management",
    "B06g-Testing": "Quality assurance",

    "B06a01-Schematic design": "Concept drawings",
    "B06a02-Design development": "Detailed design",
    "B06a03-Interior design": "Interior finishes design",
    "B06a04-Construction documents": "Permit drawings",
    "B06a05-Construction admin": "Construction oversight",
    "B06b01-Civil": "Site engineering",
    "B06b02-Electrical": "Electrical design",
    "B06b03-Fire protection": "Fire systems design",
    "B06b04-Mechanical": "HVAC design",
    "B06b05-Plumbing": "Plumbing design",
    "B06b06-Structural": "Structural design",
    "B06c01-Landscape architect": "Landscape design",
    "B06c02-Energy modeling": "Energy analysis",
    "B06c03-Accessibility": "ADA compliance",
    "B06c04-Acoustical": "Sound design",
    "B06c05-Certifications": "Green building certs",
    "B06c06-Commissioning": "Systems verification",
    "B06d01-Entity formation": "Legal entity setup",
    "B06d02-Contracts": "Contract preparation",
    "B06d03-HOA formation": "Association setup",
    "B06e01-Owner rep": "Owner's representative",
    "B06f01-Project accounting": "Cost tracking",
    "B06f02-Tax": "Tax consulting",
    "B06g01-Field / materials testing": "Construction testing",
    "B06g02-Commissioning": "Startup verification",

    "B06g01a-Geotechnical testing": "Soil compaction tests",
    "B06g01b-Special inspections": "Code inspections",

    # ============================================
    # B07a - SUBSTRUCTURE
    # ============================================
    "B07a-Substructure": "Below-grade construction",

    # ============================================
    # B07b - SHELL
    # ============================================
    "B07b-Shell": "Building envelope",

    "B07b01-Structure": "Structural frame",
    "B07b02-Attached garage": "Integrated garage",
    "B07b03-Weather barriers": "Moisture protection",
    "B07b04-Roofing": "Roof covering",
    "B07b05-Windows": "Glazing systems",
    "B07b06-Exterior doors": "Entry openings",
    "B07b07-Insulation": "Thermal barrier",
    "B07b08-Siding": "Exterior cladding",
    "B07b09-Paint": "Exterior coatings",
    "B07b10-Porch": "Covered entry",
    "B07b11-Deck": "Exterior platform",

    "B07b01a-Foundation": "Below-grade structure",
    "B07b01b-Framing": "Wood/steel frame",
    "B07b01c-Masonry": "Block construction",
    "B07b01d-Structural steel": "Steel members",
    "B07b02a-Slab": "Garage floor",
    "B07b02b-Walls and ceiling": "Garage enclosure",
    "B07b02c-Fire separation": "Fire-rated assembly",
    "B07b03a-House wrap": "Weather resistive barrier",
    "B07b03b-Flashing": "Water diversion",
    "B07b03c-Sealants": "Joint sealing",
    "B07b03d-Rain screen": "Drainage cavity",
    "B07b04a-Underlayment": "Roof substrate",
    "B07b04b-Shingles": "Asphalt roofing",
    "B07b04c-Tile": "Clay/concrete tiles",
    "B07b04d-Metal roofing": "Metal panels",
    "B07b04e-Flat roof membrane": "Low-slope roofing",
    "B07b04f-Flashing": "Roof transitions",
    "B07b04g-Vents": "Roof ventilation",
    "B07b04h-Gutters and downspouts": "Roof drainage",
    "B07b05a-Fiberglass": "Fiberglass windows",
    "B07b05b-Skylights": "Roof windows",
    "B07b05c-Vinyl": "Vinyl windows",
    "B07b05d-Wood": "Wood windows",
    "B07b06a-Entry": "Front door",
    "B07b06b-Garage doors": "Vehicle doors",
    "B07b06c-Hardware": "Door hardware",
    "B07b06d-Patio": "Sliding/french doors",
    "B07b07a-Basement": "Below-grade insulation",
    "B07b07b-Floor": "Floor insulation",
    "B07b07c-Walls": "Wall insulation",
    "B07b07d-Continuous": "Exterior insulation",
    "B07b07e-Attic": "Ceiling insulation",
    "B07b08a-Brick": "Brick veneer",
    "B07b08b-Engineered wood": "Composite siding",
    "B07b08c-Fiber cement": "Cement board siding",
    "B07b08d-Metal": "Metal panels",
    "B07b08e-Soffit": "Eave covering",
    "B07b08f-Stone": "Stone veneer",
    "B07b08g-Stucco": "Cement plaster",
    "B07b08h-Trim": "Exterior trim",
    "B07b08i-Vinyl": "Vinyl siding",
    "B07b08j-Wood": "Wood siding",
    "B07b09a-Exterior": "Exterior painting",
    "B07b10a-Covered": "Roofed porch",
    "B07b10b-Screened": "Screened enclosure",
    "B07b11a-Structure": "Deck framing",
    "B07b11b-Decking": "Deck surface",
    "B07b11c-Railing": "Deck guardrail",

    "B07b01a01-Basement": "Full basement",
    "B07b01a02-Crawlspace": "Ventilated crawl",
    "B07b01a03-Deep": "Deep foundations",
    "B07b01a04-Shallow": "Spread foundations",
    "B07b01a05-Slab on grade": "Ground-level slab",
    "B07b01a06-Retaining": "Foundation walls",
    "B07b01b01-Floor": "Floor framing",
    "B07b01b02-Walls": "Wall framing",
    "B07b01b03-Beams and posts": "Support members",
    "B07b01b04-Roof": "Roof framing",
    "B07b01b05-Sheathing": "Panel sheathing",
    "B07b01b06-Hardware": "Connectors and fasteners",
    "B07b01b07-Steel framing": "Light gauge steel",
    "B07b01c01-CMU walls": "Concrete block walls",
    "B07b01c02-Structural block": "Load-bearing masonry",
    "B07b01d01-Beams and columns": "Steel frame",
    "B07b01d02-Lintels": "Opening headers",
    "B07b01d03-Connections": "Steel connectors",

    "B07b01a01a-Drainage": "Foundation drainage",
    "B07b01a01b-Egress": "Emergency exit",
    "B07b01a01c-Excavation": "Basement dig",
    "B07b01a01d-Floor slab": "Basement floor",
    "B07b01a01e-Walls": "Basement walls",
    "B07b01a01f-Waterproofing": "Moisture barrier",
    "B07b01a03a-Drilled shafts": "Caissons",
    "B07b01a03b-Driven piles": "Impact piles",
    "B07b01a03c-Helical piles": "Screw piles",
    "B07b01a04a-Continuous footings": "Strip foundations",
    "B07b01a04b-Grade beams": "Foundation beams",
    "B07b01a04c-Spread footings": "Pad foundations",
    "B07b01a04d-Stem walls": "Foundation walls",
    "B07b01b01a-Joists": "Floor joists",
    "B07b01b01b-Subfloor": "Floor sheathing",
    "B07b01b02a-Exterior": "Exterior walls",
    "B07b01b02b-Headers and beams": "Load transfer",
    "B07b01b02c-Interior": "Interior partitions",
    "B07b01b04a-Fascia and soffit framing": "Eave framing",
    "B07b01b04b-Rafters": "Stick framing",
    "B07b01b04c-Trusses": "Engineered trusses",
    "B07b01b05a-Roof": "Roof decking",
    "B07b01b05b-Wall": "Wall sheathing",

    # ============================================
    # B07c - SERVICES (MEP)
    # ============================================
    "B07c-Services": "Mechanical/electrical/plumbing",

    "B07c01-Radon mitigation": "Radon venting system",
    "B07c02-Plumbing": "Water and waste systems",
    "B07c03-Electrical": "Power and lighting",
    "B07c04-HVAC": "Heating and cooling",
    "B07c05-Fire protection": "Fire suppression",
    "B07c06-Central vacuum": "Built-in vacuum",
    "B07c07-Water treatment": "Water conditioning",
    "B07c08-Generator": "Backup power",
    "B07c09-Vertical transport": "Stairs and elevators",

    "B07c02a-Rough": "Pipe rough-in",
    "B07c02b-Gas piping": "Fuel gas lines",
    "B07c02c-Water heater": "Hot water system",
    "B07c02d-Fixtures": "Plumbing fixtures",
    "B07c02e-Specialties": "Plumbing accessories",
    "B07c03a-Service": "Electrical service",
    "B07c03b-Rough": "Wire rough-in",
    "B07c03c-Solar ready": "PV prep wiring",
    "B07c03d-EV ready": "EV charging prep",
    "B07c03e-Low voltage": "Data and comm",
    "B07c03f-Safety": "Life safety devices",
    "B07c03g-Devices": "Outlets and switches",
    "B07c03h-Lighting": "Light fixtures",
    "B07c04a-Distribution": "Air delivery",
    "B07c04b-Heating": "Heat source",
    "B07c04c-Cooling": "Air conditioning",
    "B07c04d-Ventilation": "Air exchange",
    "B07c04e-Controls": "HVAC controls",
    "B07c05a-Sprinkler": "Fire sprinklers",
    "B07c05b-Fire alarm": "Detection system",
    "B07c05c-Standpipes": "Fire hose connections",
    "B07c09a-Stairs": "Interior stairs",
    "B07c09b-Elevators": "Passenger elevators",

    "B07c02a01-DWV piping": "Drain/waste/vent",
    "B07c02a02-Supply piping": "Water supply lines",
    "B07c02a03-Venting": "Plumbing vents",
    "B07c02d01-Faucets": "Sink/tub faucets",
    "B07c02d02-Sinks": "Lavatories and sinks",
    "B07c02d03-Toilets": "Water closets",
    "B07c02d04-Tubs and showers": "Bathing fixtures",
    "B07c02e01-Floor drains": "Area drains",
    "B07c02e02-Cleanouts": "Access fittings",
    "B07c02e03-Hose bibs": "Outdoor faucets",
    "B07c03a01-Meter and grounding": "Service entrance",
    "B07c03a02-Panel": "Breaker panel",
    "B07c03b01-Wire and boxes": "Branch circuits",
    "B07c03e01-Data/telecom": "Network wiring",
    "B07c03e02-Doorbell": "Entry notification",
    "B07c03f01-Smoke/CO detectors": "Safety alarms",
    "B07c03g01-Receptacles": "Power outlets",
    "B07c03g02-Switches": "Light switches",
    "B07c03h01-Ceiling fans": "Fan fixtures",
    "B07c03h02-Exterior": "Outdoor lights",
    "B07c03h03-Interior": "Indoor lights",
    "B07c04a01-Ductwork": "Air ducts",
    "B07c04a02-Registers": "Supply/return grilles",
    "B07c04b01-Boiler": "Hot water heat",
    "B07c04b02-Furnace": "Forced air heat",
    "B07c04b03-Heat pump": "Heat pump system",
    "B07c04b04-Radiant": "Floor/ceiling heat",
    "B07c04c01-Central AC": "Central cooling",
    "B07c04c02-Minisplit": "Ductless system",
    "B07c04d01-Bath fans": "Exhaust fans",
    "B07c04d02-Kitchen hood": "Range exhaust",
    "B07c04d03-Whole house": "Fresh air system",
    "B07c04e01-Thermostat": "Temperature control",

    # ============================================
    # B07d - INTERIORS
    # ============================================
    "B07d-Interiors": "Interior finishes",

    "B07d01-Drywall": "Gypsum board",
    "B07d02-Ceilings": "Ceiling finishes",
    "B07d03-Paint": "Interior coatings",
    "B07d04-Fireplace": "Hearth systems",
    "B07d05-Wall tile": "Ceramic wall tile",
    "B07d06-Cabinets": "Built-in casework",
    "B07d07-Countertops": "Work surfaces",
    "B07d08-Flooring": "Floor finishes",
    "B07d09-Trim": "Millwork and molding",
    "B07d10-Doors": "Interior doors",
    "B07d11-Bath accessories": "Bathroom hardware",
    "B07d12-Appliances": "Built-in appliances",
    "B07d13-Window treatments": "Window coverings",
    "B07d14-Specialties": "Interior accessories",

    "B07d01a-Board and hang": "Drywall installation",
    "B07d01b-Finish": "Taping and mudding",
    "B07d01c-Texture": "Surface texture",
    "B07d02a-Acoustic tile": "Suspended ceiling",
    "B07d02b-Drywall ceiling": "Gypsum ceiling",
    "B07d02c-Specialty": "Decorative ceiling",
    "B07d03a-Interior": "Interior painting",
    "B07d04a-Tub/shower surround": "Wet area tile",
    "B07d06a-Bathroom": "Bath vanities",
    "B07d06b-Kitchen": "Kitchen cabinets",
    "B07d06c-Laundry": "Utility cabinets",
    "B07d07a-Backsplash": "Counter splash guard",
    "B07d07b-Bathroom": "Bath counters",
    "B07d07c-Kitchen": "Kitchen counters",
    "B07d08a-Subfloor prep": "Floor preparation",
    "B07d08b-Tile": "Ceramic floor tile",
    "B07d08c-Hardwood": "Wood flooring",
    "B07d08d-LVP/LVT": "Luxury vinyl",
    "B07d08e-Laminate": "Laminate flooring",
    "B07d08f-Carpet": "Carpet and pad",
    "B07d08g-Transitions": "Floor transitions",
    "B07d09a-Baseboard": "Base molding",
    "B07d09b-Casing": "Door/window trim",
    "B07d09c-Crown molding": "Ceiling trim",
    "B07d09d-Shelving and closets": "Storage systems",
    "B07d09e-Stair parts": "Stair trim",
    "B07d10a-Interior doors": "Passage doors",
    "B07d10b-Closet doors": "Storage doors",
    "B07d10c-Hardware": "Door hardware",
    "B07d11a-Hardware": "Bath hardware",
    "B07d11b-Mirrors": "Bath mirrors",
    "B07d11c-Shower doors": "Glass enclosures",
    "B07d12a-Kitchen": "Kitchen appliances",
    "B07d12b-Laundry": "Washer/dryer",
    "B07d13a-Blinds": "Window blinds",
    "B07d13b-Shades": "Window shades",
    "B07d14a-Signage": "Interior signs",
    "B07d14b-Toilet partitions": "Restroom dividers",
    "B07d14c-Lockers": "Storage lockers",

    # ============================================
    # B07e - SPECIAL SYSTEMS
    # ============================================
    "B07e-Special systems & options": "Technology and upgrades",

    "B07e01-Audio/video": "Entertainment systems",
    "B07e02-Battery storage": "Energy storage",
    "B07e03-Security system": "Security monitoring",
    "B07e04-Smart home": "Home automation",
    "B07e05-Solar PV": "Solar panels",

    # ============================================
    # B07f - SHARED SPACES
    # ============================================
    "B07f-Shared / accessory program spaces": "Common area construction",

    "B07f01-Access control": "Entry security",
    "B07f02-Common areas": "Shared spaces",
    "B07f03-Mail": "Mail facilities",
    "B07f04-Trash": "Waste handling",

    "B07f02a-Clubhouse": "Community building",
    "B07f02b-Corridors": "Common hallways",
    "B07f02c-Fitness room": "Exercise facility",
    "B07f02d-Leasing office": "Management office",
    "B07f02e-Lobby": "Entry vestibule",
    "B07f03a-Mailboxes and lockers": "Package storage",
    "B07f04a-Compactor and chute": "Trash system",

    # ============================================
    # F - FINANCE (Occupant)
    # ============================================
    "F01a-Mortgage": "Loan payments",
    "F01a01-Monthly payment": "Principal and interest",
    "F02a-Mortgage": "Interest portion",
    "F02a01-Monthly interest": "Interest payment",
    "F03a-Insurance": "Mortgage insurance",
    "F03a01-Monthly premium": "PMI payment",
    "F04a-Lender fees": "Loan origination",
    "F04a01-Origination and points": "Lender charges",
    "F04b-Prepaid": "Closing escrows",
    "F04b01-Taxes and insurance escrow": "Prepaid items",
    "F04c-Third party": "Settlement services",
    "F04c01-Appraisal and inspection": "Due diligence fees",

    # ============================================
    # O - OPERATIONS
    # ============================================
    "O01a-Electric": "Electric service",
    "O01a01-Monthly": "Monthly electric",
    "O01b-Gas": "Gas service",
    "O01b01-Monthly": "Monthly gas",
    "O01c-Water": "Water service",
    "O01c01-Monthly": "Monthly water",
    "O01d-Sewer": "Sewer service",
    "O01d01-Monthly": "Monthly sewer",
    "O01e-Trash": "Waste collection",
    "O01e01-Monthly": "Monthly trash",
    "O01f-Internet": "Internet service",
    "O01f01-Monthly": "Monthly internet",

    "O02a-Envelope": "Exterior maintenance",
    "O02a01-Roof": "Roof maintenance",
    "O02a02-Siding": "Siding maintenance",
    "O02a03-Windows and doors": "Opening maintenance",
    "O02a04-Gutters": "Gutter maintenance",
    "O02b-MEP": "Systems maintenance",
    "O02b01-HVAC": "HVAC maintenance",
    "O02b02-Water heater": "Water heater service",
    "O02b03-Plumbing": "Plumbing repairs",
    "O02b04-Electrical": "Electrical repairs",
    "O02c-Interior": "Interior maintenance",
    "O02c01-Flooring": "Floor maintenance",
    "O02c02-Paint": "Repainting",
    "O02c03-Appliances": "Appliance repairs",
    "O02d-Exterior": "Yard maintenance",
    "O02d01-Landscaping": "Landscape care",
    "O02d02-Hardscape": "Hardscape repairs",
    "O02e-Pest control": "Pest management",
    "O02e01-Service": "Pest service",
    "O02f-Home warranty": "Warranty coverage",
    "O02f01-Premium": "Warranty premium",
    "O02g-Reserve contributions": "Savings reserve",
    "O02g01-Monthly": "Monthly reserve",

    "O04a-Property tax": "Annual property tax",
    "O04a01-Local": "Local tax",
    "O04b-Special districts": "Special assessments",
    "O04b01-Assessments": "District fees",

    "O05a-Services": "HOA services",
    "O05a01-Landscaping": "Common landscaping",
    "O05a02-Snow removal": "Winter maintenance",
    "O05a03-Amenities": "Amenity operations",
    "O05b-Management": "HOA management",
    "O05b01-Fees": "Management fees",
    "O05c-Insurance": "HOA insurance",
    "O05c01-Master policy": "Common insurance",
    "O05d-Reserve": "HOA reserves",
    "O05d01-Contributions": "Reserve funding",
}

def main():
    input_file = '/Users/emikysa/Claude/HousingAffordabilityFramework/cost_elements_unified.tsv'

    with open(input_file, 'r') as f:
        reader = csv.DictReader(f, delimiter='\t')
        fieldnames = reader.fieldnames
        rows = list(reader)

    updated = 0
    for row in rows:
        if not row['description'].strip():
            ce_id = row['ce_id']
            if ce_id in DESCRIPTIONS:
                row['description'] = DESCRIPTIONS[ce_id]
                updated += 1

    with open(input_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(rows)

    print(f"Updated {updated} descriptions")

    # Check remaining empty
    still_empty = [r['ce_id'] for r in rows if not r['description'].strip()]
    if still_empty:
        print(f"\nStill empty ({len(still_empty)}):")
        for ce_id in still_empty:
            print(f"  {ce_id}")

if __name__ == '__main__':
    main()
