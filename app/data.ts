// Límite de etiquetas que se pueden imprimir por hora
export const LIMITE_ETIQUETAS_POR_HORA = 100;

// Colores disponibles por tipo de material
// Cada tipo tiene dos variantes: chica y grande
export const coloresPorTipo: Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> = {
  PLA: {
    chica: {
      BLACK: "#000000",
      COLORCHANGE: "#808080",
      FLUORESCENTYELLOW: "#FFFF00",
      GLITTERGOLD: "#FFD700",
      LIGHTBROWN: "#A0522D",
      PASTELBLUE: "#AEC6CF",
      PINK: "#FFC0CB",
      BLUE: "#0000FF",
      CRYSTAL: "#CCE5FF",
      FUCHSIA: "#FF00FF",
      GLITTERRED: "#FF6347",
      LIGHTPINK: "#FFB6C1",
      PASTELCREAM: "#FFFDD0",
      RED: "#FF0000",
      ULTRAWHITE: "#FFFFFF",
      WHITE: "#F8F8FF",
      ICEBLUE: "#AEC6CF",
      FIREFLY: "#FF4500",
      GLITTERARMYGREEN: "#556B2F",
      GLITTERSILVER: "#C0C0C0",
      MUSTARD: "#FFDB58",
      PASTELGREEN: "#77DD77",
      SILVER: "#C0C0C0",
      CAPIBARA: "#A68F6A",
      ARMYGREEN: "#4B5320",
      BROWN: "#8B4513",
      FLUORESCENTGREEN: "#39FF14",
      GLITTERBLACK: "#222222",
      GOLD: "#FFD700",
      NAFTASUPER: "#FA8072",
      PASTELPINK: "#FFD1DC",
      VIOLET: "#8A2BE2",
      ORANGE: "#FFA500",
      PASTELVIOLET: "#CBAACB",
      YELLOW: "#FFFF00",
      APPLEGREEN: "#8DB600",
      FLUORESCENTORANGE: "#FF8000",
      GLITTERBLUE: "#4682B4",
      DARKBLUE: "#0000FF",
      LIGHTBLUE: "#ADD8E6",
    },
    grande: {
      BLACK_GRANDE: "#000000",
      COLORCHANGE_GRANDE: "#808080",
      FLUORESCENTYELLOW_GRANDE: "#FFFF00",
      GLITTERGOLD_GRANDE: "#FFD700",
      LIGHTBROWN_GRANDE: "#A0522D",
      PASTELBLUE_GRANDE: "#AEC6CF",
      PINK_GRANDE: "#FFC0CB",
      BLUE_GRANDE: "#0000FF",
      CRYSTAL_GRANDE: "#CCE5FF",
      FUCHSIA_GRANDE: "#FF00FF",
      GLITTERRED_GRANDE: "#FF6347",
      LIGHTPINK_GRANDE: "#FFB6C1",
      PASTELCREAM_GRANDE: "#FFFDD0",
      RED_GRANDE: "#FF0000",
      ULTRAWHITE_GRANDE: "#FFFFFF",
      WHITE_GRANDE: "#F8F8FF",
      ICEBLUE_GRANDE: "#AEC6CF",
      FIREFLY_GRANDE: "#FF4500",
      GLITTERARMYGREEN_GRANDE: "#556B2F",
      GLITTERSILVER_GRANDE: "#C0C0C0",
      MUSTARD_GRANDE: "#FFDB58",
      PASTELGREEN_GRANDE: "#77DD77",
      SILVER_GRANDE: "#C0C0C0",
      CAPIBARA_GRANDE: "#A68F6A",
      ARMYGREEN_GRANDE: "#4B5320",
      BROWN_GRANDE: "#8B4513",
      FLUORESCENTGREEN_GRANDE: "#39FF14",
      GLITTERBLACK_GRANDE: "#222222",
      GOLD_GRANDE: "#FFD700",
      NAFTASUPER_GRANDE: "#FA8072",
      PASTELPINK_GRANDE: "#FFD1DC",
      VIOLET_GRANDE: "#8A2BE2",
      ORANGE_GRANDE: "#FFA500",
      PASTELVIOLET_GRANDE: "#CBAACB",
      YELLOW_GRANDE: "#FFFF00",
      APPLEGREEN_GRANDE: "#8DB600",
      FLUORESCENTORANGE_GRANDE: "#FF8000",
      GLITTERBLUE_GRANDE: "#4682B4",
      DARKBLUE_GRANDE: "#0000FF",
      LIGHTBLUE_GRANDE: "#ADD8E6",
    },
  },
  SILK: {
    chica: {
      SALUMINUM: "#4682B4",
      SBLUE: "#0000FF",
      SFUCHSIA: "#FF00FF",
      SGOLD: "#FFD700",
      SGRAPHITE: "#4B4B4B",
      SGREEN: "#228B22",
      SPEACH: "#FFDAB9",
      SPURPLE: "#800080",
      SRED: "#FF0000",
      SROSEGOLD: "#B76E79",
      SSAND: "#C2B280",
      SORANGEFLUOR: "#FF8000",
      SGREENFLUOR: "#556B2F",
      SMARBLE: "#A7A59B",
      SPEARL: "#4682B4",
      SLIGHTBLUE: "#4682B4",
      SARMYGREEN: "#556B2F",
      SYELLOWFLUOR: "#FFFF00",
      OLIVE: "#4B5320",
      STRICOLORBLUEGREENYELLOWFLUO: "#5965D8",
      STRICOLORGOLDGREENFUCHSIA: "#9E8D2E",
      STRICOLORGOLDGREENPURPLE: "#800080",
      STRICOLORGOLDPURPLEBLUE: "#001780",
      STRICOLORGOLDREDBLUE: "#CC3B3B",
      STRICOLORGREENPURPLEBLUE: "#558A33",
      STRICOLORGREENREDBLUE: "#77DD77",
      STRICOLORREDGOLDORANGEFLUO: "#DD7A77",
      STRICOLORFUCHSIAGOLDORANGEF: "#800080",
      SLAMBO: "#59C74A",
      SBICOLORGRAPHITEGREEN: "#4B4B4B",
      SBICOLORGRAPHITERED: "#FF0000",
      BICOLORGRAPHITEGOLD: "#77DD77",
      BICOLORPEARLGOLD: "#DD7A77",
      SBICOLORGRAPHITEPEARL: "#A0522D",
      SBICOLORORANGEGOLD: "#AEC6CF",
      SBICOLORFUCHSIAGOLD: "#800080",
      SBICOLORGRAPHITEPURPLE: "#800080",
    },
    grande: {
      SALUMINUM_GRANDE: "#4682B4",
      SBLUE_GRANDE: "#0000FF",
      SFUCHSIA_GRANDE: "#FF00FF",
      SGOLD_GRANDE: "#FFD700",
      SGRAPHITE_GRANDE: "#4B4B4B",
      SGREEN_GRANDE: "#228B22",
      SPEACH_GRANDE: "#FFDAB9",
      SPURPLE_GRANDE: "#800080",
      SRED_GRANDE: "#FF0000",
      SROSEGOLD_GRANDE: "#B76E79",
      SSAND_GRANDE: "#C2B280",
      SORANGEFLUOR_GRANDE: "#FF8000",
      SGREENFLUOR_GRANDE: "#556B2F",
      SMARBLE_GRANDE: "#A7A59B",
      SPEARL_GRANDE: "#4682B4",
      SLIGHTBLUE_GRANDE: "#4682B4",
      SARMYGREEN_GRANDE: "#556B2F",
      SYELLOWFLUOR_GRANDE: "#FFFF00",
      OLIVE_GRANDE: "#4B5320",
      STRICOLORBLUEGREENYELLOWFLUO_GRANDE: "#5965D8",
      STRICOLORGOLDGREENFUCHSIA_GRANDE: "#9E8D2E",
      STRICOLORGOLDGREENPURPLE_GRANDE: "#800080",
      STRICOLORGOLDPURPLEBLUE_GRANDE: "#001780",
      STRICOLORGOLDREDBLUE_GRANDE: "#CC3B3B",
      STRICOLORGREENPURPLEBLUE_GRANDE: "#558A33",
      STRICOLORGREENREDBLUE_GRANDE: "#77DD77",
      STRICOLORREDGOLDORANGEFLUO_GRANDE: "#DD7A77",
      STRICOLORFUCHSIAGOLDORANGEF_GRANDE: "#800080",
      SLAMBO_GRANDE: "#59C74A",
      SBICOLORGRAPHITEGREEN_GRANDE: "#4B4B4B",
      SBICOLORGRAPHITERED_GRANDE: "#FF0000",
      BICOLORGRAPHITEGOLD_GRANDE: "#77DD77",
      BICOLORPEARLGOLD_GRANDE: "#DD7A77",
      SBICOLORGRAPHITEPEARL_GRANDE: "#A0522D",
      SBICOLORORANGEGOLD_GRANDE: "#AEC6CF",
      SBICOLORFUCHSIAGOLD_GRANDE: "#800080",
      SBICOLORGRAPHITEPURPLE_GRANDE: "#800080",
    },
  },
  PETG: {
    chica: {
      PWHITE: "#F8F8FF",
      PBLACK: "#000000",
      PAPPLEGREEN: "#8DB600",
      PCRYSTAL: "#CCE5FF",
      PRED: "#FF0000",
      PSILVER: "#000000",
      PVIOLET: "#8A2BE2",
      PBLUE: "#0000FF",
      PARMYGREEN: "#8DB600",
      PCOLORCHANGE: "#808080",
      PYELLOW: "#FFFF00",
      TRANSPARENTRED: "#FF0000",
      TRANSPARENTBLUE: "#3A37BE",
      TRANSPARENTGREEN: "#29BB55",
      TRANSPARENTYELLOW: "#F0DB1D",
      TRANSPARENTBLACK: "#111010",
    },
    grande: {
      PWHITE_GRANDE: "#F8F8FF",
      PBLACK_GRANDE: "#000000",
      PAPPLEGREEN_GRANDE: "#8DB600",
      PCRYSTAL_GRANDE: "#CCE5FF",
      PRED_GRANDE: "#FF0000",
      PSILVER_GRANDE: "#000000",
      PVIOLET_GRANDE: "#8A2BE2",
      PBLUE_GRANDE: "#0000FF",
      PARMYGREEN_GRANDE: "#8DB600",
      PCOLORCHANGE_GRANDE: "#808080",
      PYELLOW_GRANDE: "#FFFF00",
      TRANSPARENTRED_GRANDE: "#FF0000",
      TRANSPARENTBLUE_GRANDE: "#3A37BE",
      TRANSPARENTGREEN_GRANDE: "#29BB55",
      TRANSPARENTYELLOW_GRANDE: "#F0DB1D",
      TRANSPARENTBLACK_GRANDE: "#111010",
    },
  },
  ABS: {
    chica: {
      ABSBLACK: "#000000",
      ABSWHITE: "#FFFFFF",
    },
    grande: {
      ABSBLACK_GRANDE: "#000000",
      ABSWHITE_GRANDE: "#FFFFFF",
    },
  },
  ASA: {
    chica: {
      ASABLACK: "#111111",
      ASAWHITE: "#FFFFFF",
    },
    grande: {
      ASABLACK_GRANDE: "#111111",
      ASAWHITE_GRANDE: "#FFFFFF",
    },
  },
  TPU: {
    chica: {
      TWHITE: "#F8F8FF",
      TBLACK: "#000000",
      TRED: "#FF0000",
      TBLUE: "#0000FF",
      TSILVER: "#C0C0C0",
    },
    grande: {
      TWHITE_GRANDE: "#F8F8FF",
      TBLACK_GRANDE: "#000000",
      TRED_GRANDE: "#FF0000",
      TBLUE_GRANDE: "#0000FF",
      TSILVER_GRANDE: "#C0C0C0",
    },
  },
  ESPECIALES: {
    chica: {
      FC: "#808080",
    },
    grande: {
      FC_GRANDE: "#808080",
    },
  },
};

/**
 * Determina si un color en formato hexadecimal es oscuro
 * @param hexColor Color en formato hexadecimal (con o sin #)
 * @returns true si el color es oscuro, false si es claro
 */
export function esColorOscuro(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia < 128;
}

/**
 * Limpia y formatea el nombre de una etiqueta según su tipo
 * @param etiqueta Nombre de la etiqueta
 * @param tipo Tipo de material (PLA, SILK, PETG, etc.)
 * @returns Nombre formateado y limpio
 */
export function limpiarNombre(etiqueta: string, tipo: string): string {
  // Remover el sufijo _GRANDE si existe
  let etiquetaSinSufijo = etiqueta.replace(/_GRANDE$/, "");
  
  const prefijos: Record<string, string[]> = {
    SILK: ["S", "SBICOLOR", "STRICOLOR"],
    PETG: ["P", "TRANSPARENT"],
    ABS: ["ABS"],
    ASA: ["ASA"],
    ESPECIALES: ["F"],
    TPU: ["T"],
  };

  const reemplazos: Record<string, string> = {
    COLORCHANGE: "COLOR CHANGE",
    FLUORESCENT: "FLUO ",
    GLITTER: "GLIT ",
    LIGHT: "LIGHT ",
    DARK: "DARK ",
    PASTEL: "PASTEL ",
    ULTRA: "ULTRA ",
    APPLEGREEN: "APPLE GREEN",
    ARMYGREEN: "ARMY GREEN",
    NAFTASUPER: "NAFTA SUPER",
    ROSEGOLD: "ROSE GOLD",
    FUCHSIAGOLDORANGEF: "FUCHSIA GOLD ORANGE F",
    FUCHSIAGOLD: "FUCHSIA GOLD",
    GRAPHITEPEARL: "GRAPHITE PEARL",
    PEARLGOLD: "PEARL GOLD",
    ORANGEGOLD: "ORANGE GOLD",
    REDGRAPHITE: "RED GRAPHITE",
    GOLDPURPLEBLUE: "GOLD PURPLE BLUE",
    GREENPURPLEBLUE: "GREEN PURPLE BLUE",
    GREENGOLDFUCHSIA: "GREEN GOLD FUCHSIA",
    REDGOLDBLUE: "RED GOLD BLUE",
    REDORANGEGOLD: "RED ORANGE GOLD",
    BLUEYELLOWFGREEN: "BLUE YELLOW GREEN",
  };

  let etiquetaMostrar = etiquetaSinSufijo;

  // Quitar prefijos según el tipo de filamento
  const prefijosTipo = prefijos[tipo] || [];
  for (const prefijo of prefijosTipo) {
    if (etiquetaMostrar.startsWith(prefijo)) {
      etiquetaMostrar = etiquetaMostrar.substring(prefijo.length);
      break;
    }
  }

  // Aplicar reemplazos de nombres
  for (const [key, value] of Object.entries(reemplazos)) {
    etiquetaMostrar = etiquetaMostrar.replace(key, value);
  }

  // Capitalizar la primera letra
  etiquetaMostrar = etiquetaMostrar.trim();
  if (etiquetaMostrar.length > 0) {
    etiquetaMostrar =
      etiquetaMostrar.charAt(0).toUpperCase() +
      etiquetaMostrar.slice(1).toLowerCase();
  }

  return etiquetaMostrar;
}

// Contraseña del supervisor
export const PASSWORD_SUPERVISOR = "49585357";

// Lista de supervisores disponibles
export const SUPERVISORES = [
  "Juan Pablo Leo",
  "Julian",
  "Leo",
  "Maxi G",
  "Richard",
];

// Operador especial que indica que la máquina está libre (no se puede imprimir)
export const OPERADOR_LINEA_LIBRE = "Línea Libre";

// Lista de operadores disponibles
export const OPERADORES = [
  "Benicio",
  "Rodigo",
  "Adrián",
  "Carla",
  "Thomas",
  "Julián",
  "Tiziano",
  "Marisa",
  "Arion",
  "Franco leo",
  "Román",
  "Richard",
  "Lucas aguero",
  "Brian",
  "Paulo",
  "Juan Carlos",
  "Micaela",
  "Díaz Lucas",
  "Mijael",
  "Ezequiel",
  "Guido",
  "Matías",
  "Jesús",
  "Juana",
  OPERADOR_LINEA_LIBRE,
];

/**
 * Verifica si un operador es "Línea Libre" (estado especial donde no se puede imprimir)
 * @param operador Nombre del operador a verificar
 * @returns true si es "Línea Libre", false en caso contrario
 */
export function esLineaLibre(operador: string | null | undefined): boolean {
  return operador === OPERADOR_LINEA_LIBRE;
}

// Verificar contraseña del supervisor
export function verificarPasswordSupervisor(password: string): boolean {
  return password === PASSWORD_SUPERVISOR;
}

