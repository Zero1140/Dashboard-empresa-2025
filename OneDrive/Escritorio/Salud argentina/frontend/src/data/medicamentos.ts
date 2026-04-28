// frontend/src/data/medicamentos.ts
// Dataset de medicamentos argentinos con códigos SNOMED CT

export interface Medicamento {
  nombre: string;
  snomed_code: string;
  categoria: string;
}

export const MEDICAMENTOS: Medicamento[] = [
  // Antibióticos
  { nombre: "Amoxicilina 500mg", snomed_code: "372687004", categoria: "Antibióticos" },
  { nombre: "Amoxicilina 875mg", snomed_code: "372687004", categoria: "Antibióticos" },
  { nombre: "Amoxicilina + Ácido Clavulánico 875/125mg", snomed_code: "89519005", categoria: "Antibióticos" },
  { nombre: "Azitromicina 500mg", snomed_code: "387531004", categoria: "Antibióticos" },
  { nombre: "Ciprofloxacina 500mg", snomed_code: "372840008", categoria: "Antibióticos" },
  { nombre: "Claritromicina 500mg", snomed_code: "372741007", categoria: "Antibióticos" },
  { nombre: "Metronidazol 500mg", snomed_code: "372602008", categoria: "Antibióticos" },
  { nombre: "Cefalexina 500mg", snomed_code: "372786004", categoria: "Antibióticos" },
  { nombre: "Doxiciclina 100mg", snomed_code: "372478003", categoria: "Antibióticos" },
  { nombre: "Trimetoprima/Sulfametoxazol 160/800mg", snomed_code: "363528009", categoria: "Antibióticos" },
  { nombre: "Clindamicina 300mg", snomed_code: "387325003", categoria: "Antibióticos" },

  // Antihipertensivos
  { nombre: "Enalapril 10mg", snomed_code: "372658000", categoria: "Antihipertensivos" },
  { nombre: "Enalapril 20mg", snomed_code: "372658000", categoria: "Antihipertensivos" },
  { nombre: "Losartán 50mg", snomed_code: "373567002", categoria: "Antihipertensivos" },
  { nombre: "Losartán 100mg", snomed_code: "373567002", categoria: "Antihipertensivos" },
  { nombre: "Amlodipina 5mg", snomed_code: "386864001", categoria: "Antihipertensivos" },
  { nombre: "Amlodipina 10mg", snomed_code: "386864001", categoria: "Antihipertensivos" },
  { nombre: "Metoprolol 50mg", snomed_code: "372826007", categoria: "Antihipertensivos" },
  { nombre: "Hidroclorotiazida 25mg", snomed_code: "387525002", categoria: "Antihipertensivos" },
  { nombre: "Atenolol 50mg", snomed_code: "372832002", categoria: "Antihipertensivos" },
  { nombre: "Valsartán 80mg", snomed_code: "386877009", categoria: "Antihipertensivos" },
  { nombre: "Carvedilol 12.5mg", snomed_code: "395084009", categoria: "Antihipertensivos" },
  { nombre: "Ramipril 5mg", snomed_code: "386872004", categoria: "Antihipertensivos" },
  { nombre: "Nifedipina 10mg (liberación retardada)", snomed_code: "372543009", categoria: "Antihipertensivos" },

  // Analgésicos / Antipiréticos
  { nombre: "Ibuprofeno 400mg", snomed_code: "387207008", categoria: "Analgésicos/Antipiréticos" },
  { nombre: "Ibuprofeno 600mg", snomed_code: "387207008", categoria: "Analgésicos/Antipiréticos" },
  { nombre: "Paracetamol 500mg", snomed_code: "387517004", categoria: "Analgésicos/Antipiréticos" },
  { nombre: "Diclofenac 50mg", snomed_code: "7034005", categoria: "Analgésicos/Antipiréticos" },
  { nombre: "Naproxeno 500mg", snomed_code: "372588000", categoria: "Analgésicos/Antipiréticos" },
  { nombre: "Ketorolac 10mg", snomed_code: "372501008", categoria: "Analgésicos/Antipiréticos" },
  { nombre: "Metamizol 500mg", snomed_code: "387406002", categoria: "Analgésicos/Antipiréticos" },

  // Antiulcerosos
  { nombre: "Omeprazol 20mg", snomed_code: "372721003", categoria: "Antiulcerosos" },
  { nombre: "Omeprazol 40mg", snomed_code: "372721003", categoria: "Antiulcerosos" },
  { nombre: "Pantoprazol 40mg", snomed_code: "395798007", categoria: "Antiulcerosos" },
  { nombre: "Lansoprazol 30mg", snomed_code: "409134005", categoria: "Antiulcerosos" },
  { nombre: "Ranitidina 150mg", snomed_code: "372755005", categoria: "Antiulcerosos" },
  { nombre: "Famotidina 40mg", snomed_code: "373940008", categoria: "Antiulcerosos" },

  // Hipoglucemiantes
  { nombre: "Metformina 500mg", snomed_code: "372567009", categoria: "Hipoglucemiantes" },
  { nombre: "Metformina 850mg", snomed_code: "372567009", categoria: "Hipoglucemiantes" },
  { nombre: "Glibenclamida 5mg", snomed_code: "372711004", categoria: "Hipoglucemiantes" },
  { nombre: "Glimepirida 4mg", snomed_code: "386966003", categoria: "Hipoglucemiantes" },
  { nombre: "Sitagliptina 100mg", snomed_code: "444995001", categoria: "Hipoglucemiantes" },
  { nombre: "Empagliflozina 10mg", snomed_code: "703674001", categoria: "Hipoglucemiantes" },

  // Antidislipémicos
  { nombre: "Atorvastatina 20mg", snomed_code: "373444002", categoria: "Antidislipémicos" },
  { nombre: "Atorvastatina 40mg", snomed_code: "373444002", categoria: "Antidislipémicos" },
  { nombre: "Simvastatina 20mg", snomed_code: "387584000", categoria: "Antidislipémicos" },
  { nombre: "Rosuvastatina 10mg", snomed_code: "412151004", categoria: "Antidislipémicos" },
  { nombre: "Gemfibrozilo 600mg", snomed_code: "372540007", categoria: "Antidislipémicos" },

  // Anticoagulantes
  { nombre: "Warfarina 5mg", snomed_code: "372756006", categoria: "Anticoagulantes" },
  { nombre: "Enoxaparina 60mg/0.6ml", snomed_code: "372562005", categoria: "Anticoagulantes" },
  { nombre: "Dabigatrán 110mg", snomed_code: "713463006", categoria: "Anticoagulantes" },

  // Broncodilatadores
  { nombre: "Salbutamol 100mcg Inhalador", snomed_code: "372897005", categoria: "Broncodilatadores" },
  { nombre: "Budesonida 200mcg Inhalador", snomed_code: "395726003", categoria: "Broncodilatadores" },
  { nombre: "Formoterol 12mcg Inhalador", snomed_code: "395726002", categoria: "Broncodilatadores" },
  { nombre: "Tiotropio 18mcg Inhalador", snomed_code: "406459007", categoria: "Broncodilatadores" },

  // Antidepresivos / Ansiolíticos
  { nombre: "Sertralina 50mg", snomed_code: "372594008", categoria: "Antidepresivos/Ansiolíticos" },
  { nombre: "Sertralina 100mg", snomed_code: "372594008", categoria: "Antidepresivos/Ansiolíticos" },
  { nombre: "Fluoxetina 20mg", snomed_code: "372767007", categoria: "Antidepresivos/Ansiolíticos" },
  { nombre: "Alprazolam 0.5mg", snomed_code: "386983007", categoria: "Antidepresivos/Ansiolíticos" },
  { nombre: "Lorazepam 1mg", snomed_code: "387106007", categoria: "Antidepresivos/Ansiolíticos" },
  { nombre: "Clonazepam 0.5mg", snomed_code: "372762007", categoria: "Antidepresivos/Ansiolíticos" },

  // Otros comunes
  { nombre: "Levotiroxina 50mcg", snomed_code: "710809001", categoria: "Otros" },
  { nombre: "Levotiroxina 100mcg", snomed_code: "710809001", categoria: "Otros" },
  { nombre: "Metilprednisolona 16mg", snomed_code: "116593003", categoria: "Otros" },
  { nombre: "Dexametasona 4mg", snomed_code: "372584003", categoria: "Otros" },
  { nombre: "Betahistina 16mg", snomed_code: "372498009", categoria: "Otros" },
  { nombre: "Furosemida 40mg", snomed_code: "387475002", categoria: "Otros" },
  { nombre: "Espironolactona 25mg", snomed_code: "387392006", categoria: "Otros" },
  { nombre: "Alopurinol 300mg", snomed_code: "387135004", categoria: "Otros" },
  { nombre: "Colchicina 0.5mg", snomed_code: "387413002", categoria: "Otros" },
];
