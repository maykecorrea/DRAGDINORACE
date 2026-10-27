/** Retratos do Flow. Arquivo: /assets/gf/clientes/<id>.png */
export const CLIENTES = [
  { id: "dona_cotinha_casco", tipo: "vizinho", nome: "Dona Cotinha Casco" },
  { id: "seu_pacheco_cabecudo", tipo: "vizinho", nome: "Seu Pacheco Cabeçudo" },
  { id: "lia_fibra", tipo: "vizinho", nome: "Lia Fibra" },
  { id: "professor_gastao", tipo: "vizinho", nome: "Professor Gastão Iguano" },
  { id: "vovo_brontilde", tipo: "vizinho", nome: "Vovó Brontilde" },
  { id: "ze_trilo", tipo: "vizinho", nome: "Zé Trilo" },
  { id: "mestra_ondina", tipo: "vizinho", nome: "Mestra Ondina" },
  { id: "raio_velox", tipo: "motoboy", nome: "Raio Velox" },
  { id: "compsinha", tipo: "motoboy", nome: "Compsinha" },
  { id: "jacira_ptera", tipo: "motoboy", nome: "Dona Jacira Ptera" },
  { id: "kiko_gali", tipo: "motoboy", nome: "Kiko Gali" },
  { id: "brisa_dilo", tipo: "motoboy", nome: "Brisa Dilo" },
  { id: "seu_tiburcio", tipo: "motoboy", nome: "Seu Tibúrcio" },
  { id: "dona_estegolina", tipo: "comerciante", nome: "Dona Estegolina" },
  { id: "seu_galvao_mamute", tipo: "comerciante", nome: "Seu Galvão Mamute" },
  { id: "tia_quetza", tipo: "comerciante", nome: "Tia Quetza" },
  { id: "estiraco_chaveiro", tipo: "comerciante", nome: "Estiraco Chaveiro" },
  { id: "madame_amonita", tipo: "comerciante", nome: "Madame Amonita" },
  { id: "seu_dimas_dimetro", tipo: "comerciante", nome: "Seu Dimas Dímetro" },
  { id: "ictio_nakamura", tipo: "comerciante", nome: "Ictio Nakamura" },
  { id: "dra_teriza", tipo: "comerciante", nome: "Dra. Teriza" },
  { id: "raimundo_cascudo", tipo: "pechincheiro", nome: "Raimundo Cascudo" },
  { id: "dona_regateia", tipo: "pechincheiro", nome: "Dona Regatéia" },
  { id: "barganho_arqueu", tipo: "pechincheiro", nome: "Barganho Arqueu" },
  { id: "coronel_tricerato", tipo: "pechincheiro", nome: "Coronel Tricerato" },
  { id: "dona_meganeura", tipo: "pechincheiro", nome: "Dona Meganeura" },
  { id: "tchuca_carnota", tipo: "pechincheiro", nome: "Tchuca Carnota" },
  { id: "mestre_pleura", tipo: "pechincheiro", nome: "Mestre Pleura" },
  { id: "silvana_raptorlog", tipo: "frota", nome: "Silvana Garra" },
  { id: "brontes_ossobus", tipo: "frota", nome: "Seu Brontes Ossobus" },
  { id: "spina_taxi", tipo: "frota", nome: "Dona Spina" },
  { id: "dra_mosa", tipo: "frota", nome: "Dra. Mosa" },
  { id: "capitao_detrito", tipo: "frota", nome: "Capitão Detrito" },
  { id: "nina_nitro", tipo: "corredor", nome: "Nina Nitro" },
  { id: "tutu_turbo", tipo: "corredor", nome: "Tutu Turbo" },
  { id: "velma_asa_negra", tipo: "corredor", nome: "Velma Asa-Negra" },
  { id: "baronesa_vitoria", tipo: "corredor", nome: "Baronesa Vitória" },
  { id: "alonso_live", tipo: "corredor", nome: "Alonso Alô-Alô" },
  { id: "monge_cerato", tipo: "corredor", nome: "Monge Cerato" },
  { id: "empresario_varano", tipo: "caloteiro", nome: "Empresário Varano" },
  { id: "seu_prometeu", tipo: "caloteiro", nome: "Seu Prometeu" },
  { id: "johnny_rajada", tipo: "caloteiro", nome: "Johnny Rajada" },
  { id: "dona_mel_docura", tipo: "caloteiro", nome: "Dona Mel Doçura" },
  { id: "comendador_cheque", tipo: "caloteiro", nome: "Comendador Cheque-Pré" },
  { id: "mc_parcela", tipo: "caloteiro", nome: "MC Parcela" },
  { id: "guru_paleofit", tipo: "caloteiro", nome: "Guru Paleo-Forma" },
  { id: "lambe_startup", tipo: "caloteiro", nome: "Lambê Novidade" },
  { id: "tio_eustaquio", tipo: "caloteiro", nome: "Tio Eustáquio" },
  { id: "secretario_burocracio", tipo: "prefeitura", nome: "Secretário Burocrácio" },
  { id: "eng_herrera", tipo: "prefeitura", nome: "Engenheira Herrera" },
] as const;

const pools = new Map<string, string[]>();
for (const client of CLIENTES) {
  const list = pools.get(client.tipo) ?? [];
  list.push(client.id);
  pools.set(client.tipo, list);
}

export function clienteId(tipo: string, salt: string): string | undefined {
  const pool = pools.get(tipo);
  if (!pool?.length) return undefined;
  let hash = 2166136261;
  const key = `${tipo}:${salt}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return pool[(hash >>> 0) % pool.length];
}

export function portraitSrc(id: string): string | undefined {
  if (!CLIENTES.some((client) => client.id === id)) return undefined;
  return `/assets/gf/clientes/${id}.png?v=1`;
}

/** Tipo de cliente vira um retrato estável. Personagens da história ficam de fora. */
export function faceSrc(id: string, salt = id): string | undefined {
  return portraitSrc(id) ?? portraitSrc(clienteId(id, salt) ?? "");
}

