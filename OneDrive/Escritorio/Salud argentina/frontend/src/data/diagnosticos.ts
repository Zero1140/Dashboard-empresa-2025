// frontend/src/data/diagnosticos.ts
// Dataset de diagnósticos argentinos con códigos SNOMED CT

export interface Diagnostico {
  nombre: string;
  snomed_code: string;
  categoria: string;
}

export const DIAGNOSTICOS: Diagnostico[] = [
  // Cardiovascular
  { nombre: "Hipertensión arterial", snomed_code: "38341003", categoria: "Cardiovascular" },
  { nombre: "Insuficiencia cardíaca", snomed_code: "84114007", categoria: "Cardiovascular" },
  { nombre: "Cardiopatía isquémica", snomed_code: "414545008", categoria: "Cardiovascular" },
  { nombre: "Arritmia cardíaca", snomed_code: "698247007", categoria: "Cardiovascular" },
  { nombre: "Angina de pecho", snomed_code: "194828000", categoria: "Cardiovascular" },
  { nombre: "Infarto agudo de miocardio", snomed_code: "57054005", categoria: "Cardiovascular" },
  { nombre: "Enfermedad coronaria", snomed_code: "53741008", categoria: "Cardiovascular" },
  { nombre: "Fibrilación auricular", snomed_code: "49436004", categoria: "Cardiovascular" },

  // Respiratorio
  { nombre: "Asma bronquial", snomed_code: "195967001", categoria: "Respiratorio" },
  { nombre: "EPOC", snomed_code: "13645005", categoria: "Respiratorio" },
  { nombre: "Neumonía", snomed_code: "233604007", categoria: "Respiratorio" },
  { nombre: "Bronquitis aguda", snomed_code: "10509002", categoria: "Respiratorio" },
  { nombre: "Rinitis alérgica", snomed_code: "61582004", categoria: "Respiratorio" },
  { nombre: "Faringitis aguda", snomed_code: "363746003", categoria: "Respiratorio" },

  // Metabólico / Endócrino
  { nombre: "Diabetes mellitus tipo 2", snomed_code: "44054006", categoria: "Metabólico / Endócrino" },
  { nombre: "Diabetes mellitus tipo 1", snomed_code: "46635009", categoria: "Metabólico / Endócrino" },
  { nombre: "Hipotiroidismo", snomed_code: "40930008", categoria: "Metabólico / Endócrino" },
  { nombre: "Hipertiroidismo", snomed_code: "34486009", categoria: "Metabólico / Endócrino" },
  { nombre: "Obesidad", snomed_code: "414916001", categoria: "Metabólico / Endócrino" },
  { nombre: "Dislipemia", snomed_code: "370992007", categoria: "Metabólico / Endócrino" },

  // Digestivo
  { nombre: "Gastritis", snomed_code: "4556007", categoria: "Digestivo" },
  { nombre: "Enfermedad por reflujo gastroesofágico", snomed_code: "235595009", categoria: "Digestivo" },
  { nombre: "Colon irritable", snomed_code: "10743008", categoria: "Digestivo" },
  { nombre: "Colecistitis", snomed_code: "76581006", categoria: "Digestivo" },
  { nombre: "Hepatitis", snomed_code: "40468003", categoria: "Digestivo" },

  // Musculoesquelético
  { nombre: "Lumbalgia", snomed_code: "279039007", categoria: "Musculoesquelético" },
  { nombre: "Artritis reumatoide", snomed_code: "69896004", categoria: "Musculoesquelético" },
  { nombre: "Osteoporosis", snomed_code: "64859006", categoria: "Musculoesquelético" },
  { nombre: "Artrosis", snomed_code: "396275006", categoria: "Musculoesquelético" },
  { nombre: "Fibromialgia", snomed_code: "203082005", categoria: "Musculoesquelético" },

  // Neurológico
  { nombre: "Migraña", snomed_code: "37796009", categoria: "Neurológico" },
  { nombre: "Cefalea tensional", snomed_code: "398057008", categoria: "Neurológico" },
  { nombre: "Vértigo", snomed_code: "399963005", categoria: "Neurológico" },
  { nombre: "Epilepsia", snomed_code: "84757009", categoria: "Neurológico" },

  // Psiquiátrico
  { nombre: "Depresión mayor", snomed_code: "370143000", categoria: "Psiquiátrico" },
  { nombre: "Trastorno de ansiedad generalizada", snomed_code: "21897009", categoria: "Psiquiátrico" },
  { nombre: "Trastorno bipolar", snomed_code: "13746004", categoria: "Psiquiátrico" },
  { nombre: "Insomnio", snomed_code: "193462001", categoria: "Psiquiátrico" },

  // Infecciosas
  { nombre: "Infección urinaria", snomed_code: "68566005", categoria: "Infecciosas" },
  { nombre: "Infección respiratoria alta", snomed_code: "54150009", categoria: "Infecciosas" },
  { nombre: "Faringoamigdalitis", snomed_code: "90176006", categoria: "Infecciosas" },
  { nombre: "COVID-19", snomed_code: "840539006", categoria: "Infecciosas" },

  // Otros
  { nombre: "Anemia", snomed_code: "271737000", categoria: "Otros" },
  { nombre: "Dermatitis", snomed_code: "182782007", categoria: "Otros" },
  { nombre: "Conjuntivitis", snomed_code: "9826008", categoria: "Otros" },
  { nombre: "Urticaria", snomed_code: "126485001", categoria: "Otros" },
  { nombre: "Dolor crónico", snomed_code: "82423001", categoria: "Otros" },
  { nombre: "Hipovitaminosis D", snomed_code: "34713006", categoria: "Otros" },
];
