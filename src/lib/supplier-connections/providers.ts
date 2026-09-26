/**
 * Catálogo de fornecedores de pneus (França + Europa) com o mínimo a preencher
 * para ligar a API e puxar o stock. Cada preset já traz o tipo de autenticação,
 * campos e um mapeamento de catálogo típico — só faltam as credenciais reais.
 */

export type AuthKind = 'login_password' | 'basic' | 'bearer' | 'api_key' | 'none';
export type AdapterKind = 'neumaticos_andres' | 'generic_rest' | 'generic_csv';
export type ProviderRegion = 'france' | 'europe' | 'generic';

export type FormField = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  help?: string;
  secret?: boolean;
  default?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
};

export type ProviderPreset = {
  id: string;
  name: string;
  country: string;
  region: ProviderRegion;
  website: string;
  docsUrl?: string;
  description: string;
  adapter: AdapterKind;
  auth: AuthKind;
  fields: FormField[];
};

const REST_MAPPING_FIELDS: FormField[] = [
  {
    key: 'catalogPath',
    label: 'Chemin du catalogue',
    type: 'text',
    default: '/products',
    help: 'Chemin ajouté à l’URL de base (ex. /api/v1/tyres).',
  },
  {
    key: 'itemsPath',
    label: 'Chemin JSON des articles',
    type: 'text',
    default: 'data',
    help: 'Ex. data.items, articles, products. Vide = la racine est un tableau.',
  },
  { key: 'mapEan', label: 'Champ EAN', type: 'text', default: 'ean' },
  { key: 'mapSku', label: 'Champ référence / SKU', type: 'text', default: 'sku' },
  { key: 'mapName', label: 'Champ nom', type: 'text', default: 'name' },
  { key: 'mapBrand', label: 'Champ marque', type: 'text', default: 'brand' },
  { key: 'mapPrice', label: 'Champ prix HT', type: 'text', default: 'price' },
  { key: 'mapStock', label: 'Champ stock', type: 'text', default: 'stock' },
  { key: 'mapWidth', label: 'Champ largeur', type: 'text', default: 'width' },
  { key: 'mapHeight', label: 'Champ hauteur', type: 'text', default: 'height' },
  { key: 'mapDiameter', label: 'Champ diamètre', type: 'text', default: 'diameter' },
  { key: 'mapLoad', label: 'Champ indice charge', type: 'text', default: 'load_index' },
  { key: 'mapSpeed', label: 'Champ indice vitesse', type: 'text', default: 'speed_index' },
  { key: 'mapSeason', label: 'Champ saison', type: 'text', default: 'season' },
  { key: 'mapCategory', label: 'Champ catégorie', type: 'text', default: 'category' },
  { key: 'mapImage', label: 'Champ image', type: 'text', default: 'image' },
  {
    key: 'marginPercent',
    label: 'Marge à appliquer (%)',
    type: 'number',
    default: 0,
    help: 'Ajoutée au prix fournisseur à l’import. 0 = prix tel quel.',
  },
];

function restFields(auth: AuthKind, extras: FormField[] = []): FormField[] {
  const authFields: FormField[] =
    auth === 'login_password'
      ? [
          { key: 'login', label: 'Identifiant / login API', type: 'text', required: true, secret: true },
          { key: 'password', label: 'Mot de passe API', type: 'password', required: true, secret: true },
        ]
      : auth === 'basic'
        ? [
            { key: 'login', label: 'Utilisateur Basic Auth', type: 'text', required: true, secret: true },
            { key: 'password', label: 'Mot de passe Basic Auth', type: 'password', required: true, secret: true },
          ]
        : auth === 'bearer'
          ? [{ key: 'token', label: 'Jeton Bearer', type: 'password', required: true, secret: true }]
          : auth === 'api_key'
            ? [
                {
                  key: 'apiKey',
                  label: 'Clé API',
                  type: 'password',
                  required: true,
                  secret: true,
                },
                {
                  key: 'apiKeyHeader',
                  label: 'En-tête de la clé',
                  type: 'text',
                  default: 'X-API-Key',
                  help: 'Ex. X-API-Key, Authorization, api-key.',
                },
              ]
            : [];

  return [
    {
      key: 'baseUrl',
      label: 'URL de base de l’API',
      type: 'url',
      required: true,
      placeholder: 'https://api.fournisseur.eu',
    },
    ...authFields,
    ...extras,
    ...REST_MAPPING_FIELDS,
  ];
}

function csvFields(extras: FormField[] = []): FormField[] {
  return [
    {
      key: 'catalogUrl',
      label: 'URL du fichier CSV',
      type: 'url',
      required: true,
      placeholder: 'https://fournisseur.eu/export/pneus.csv',
    },
    {
      key: 'login',
      label: 'Identifiant (si protégé)',
      type: 'text',
      secret: true,
    },
    {
      key: 'password',
      label: 'Mot de passe (si protégé)',
      type: 'password',
      secret: true,
    },
    ...extras,
  ];
}

function p(
  partial: Omit<ProviderPreset, 'fields' | 'auth'> & { fields?: FormField[]; auth?: AuthKind }
): ProviderPreset {
  const auth = partial.auth ?? (partial.adapter === 'generic_csv' ? 'none' : 'login_password');
  const fields =
    partial.fields ??
    (partial.adapter === 'generic_csv' ? csvFields() : restFields(auth));
  return { ...partial, auth, fields };
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  p({
    id: 'neumaticos_andres',
    name: 'Neumáticos Andrés (GenaSA)',
    country: 'ES',
    region: 'europe',
    website: 'https://www.neumaticosandres.com',
    docsUrl: 'https://backend.genasa.es',
    description: 'Grossiste ibérique déjà branché : stock, prix et commandes. Remplissez login / mot de passe et lancez l’import.',
    adapter: 'neumaticos_andres',
    auth: 'login_password',
    fields: [
      { key: 'login', label: 'Login API', type: 'text', required: true, secret: true },
      { key: 'password', label: 'Mot de passe API', type: 'password', required: true, secret: true },
      { key: 'baseUrl', label: 'URL API', type: 'url', required: true, default: 'https://backend.genasa.es' },
      { key: 'testMode', label: 'Environnement de test', type: 'checkbox', default: false },
      { key: 'postCode', label: 'Code postal pour le stock', type: 'text', default: '75001' },
      { key: 'importLimit', label: 'Limite d’articles par import', type: 'number', default: 80 },
    ],
  }),

  // --- France ---
  p({
    id: 'allopneus',
    name: 'Allopneus Pro',
    country: 'FR',
    region: 'france',
    website: 'https://pro.allopneus.com',
    description: '1er site pneus en France. Portail Pro + flux catalogue. Collez l’URL API / CSV fournie par votre commercial.',
    adapter: 'generic_rest',
  }),
  p({
    id: '1001pneus',
    name: '1001Pneus / Centralpneus',
    country: 'FR',
    region: 'france',
    website: 'https://www.1001pneus.fr',
    description: 'Marketplace française (groupe Centralpneus). API ou export CSV B2B.',
    adapter: 'generic_rest',
  }),
  p({
    id: 'pneus_online',
    name: 'Pneus Online / TyreLeader',
    country: 'FR',
    region: 'france',
    website: 'https://www.pneus-online.fr',
    description: 'TyreLeader (FR/BE/ES/IT). Catalogue Europe via API partenaire ou fichier quotidien.',
    adapter: 'generic_rest',
  }),
  p({
    id: 'autossimo',
    name: 'Autossimo (Autodistribution)',
    country: 'FR',
    region: 'france',
    website: 'https://www.autossimo.com',
    description: 'Réseau AD — pièces et pneus. Connexion EDI / API partenaire.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'point_s',
    name: 'Point S',
    country: 'FR',
    region: 'france',
    website: 'https://www.points.fr',
    description: 'Réseau n°1 d’indépendants en France. Portail B2B + flux articles.',
    adapter: 'generic_rest',
  }),
  p({
    id: 'euromaster',
    name: 'Euromaster (Michelin)',
    country: 'FR',
    region: 'france',
    website: 'https://www.euromaster.fr',
    description: 'Réseau Michelin. Commandes et stock via le portail professionnel.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'first_stop',
    name: 'First Stop',
    country: 'FR',
    region: 'france',
    website: 'https://www.firststop.fr',
    description: 'Réseau Bridgestone. Catalogue et dispo atelier via API partenaire.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'feu_vert',
    name: 'Feu Vert Pro',
    country: 'FR',
    region: 'france',
    website: 'https://www.feuvert.fr',
    description: 'Enseigne nationale. Flux produits / pneus pour partenaires.',
    adapter: 'generic_csv',
  }),
  p({
    id: 'norauto',
    name: 'Norauto Pro (Mobivia)',
    country: 'FR',
    region: 'france',
    website: 'https://www.norauto.fr',
    description: 'Groupe Mobivia. Export catalogue ou API Mid Office.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'profil_plus',
    name: 'Profil Plus',
    country: 'FR',
    region: 'france',
    website: 'https://www.profilplus.fr',
    description: 'Grossiste pneus France (VL / PL / agri). Connexion FTP/CSV ou API.',
    adapter: 'generic_csv',
  }),
  p({
    id: 'michelin_b2b',
    name: 'Michelin B2B',
    country: 'FR',
    region: 'france',
    website: 'https://b2b.michelin.com',
    docsUrl: 'https://developer.michelin.com',
    description: 'Portail constructeur : prix, dispo, EPREL. Clé fournie par Michelin.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'continental_b2b',
    name: 'Continental ContiOnlineOrder',
    country: 'DE',
    region: 'europe',
    website: 'https://www.continental-tires.com',
    description: 'Commande en ligne Continental (EU). Token OAuth / clé partenaire.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'bridgestone_b2b',
    name: 'Bridgestone Partner',
    country: 'EU',
    region: 'europe',
    website: 'https://www.bridgestone.eu',
    description: 'Portail partenaires Bridgestone / Firestone. API B2B Europe.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'goodyear_b2b',
    name: 'Goodyear B2B',
    country: 'EU',
    region: 'europe',
    website: 'https://www.goodyear.eu',
    description: 'Goodyear / Dunlop / Fulda. Catalogue et stock via le hub partenaire.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'pirelli_b2b',
    name: 'Pirelli B2B',
    country: 'IT',
    region: 'europe',
    website: 'https://www.pirelli.com',
    description: 'Cyber / portail flottes et revendeurs. Jeton fourni par Pirelli.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'hankook_b2b',
    name: 'Hankook B2B',
    country: 'EU',
    region: 'europe',
    website: 'https://www.hankooktire.com',
    description: 'Portail Europe Hankook. Prix et stock revendeur.',
    adapter: 'generic_rest',
    auth: 'login_password',
  }),

  // --- Europe ---
  p({
    id: 'tyre24',
    name: 'Tyre24 (Alcar)',
    country: 'DE',
    region: 'europe',
    website: 'https://www.tyre24.com',
    description: 'Place de marché pneus / jantes n°1 en Allemagne. API Alcar documentée.',
    adapter: 'generic_rest',
    auth: 'login_password',
  }),
  p({
    id: 'delticom',
    name: 'Delticom / ReifenDirekt',
    country: 'DE',
    region: 'europe',
    website: 'https://www.delti.com',
    description: 'Groupe Delticom (ReifenDirekt, Tirendo…). Flux wholesale Europe.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'intercars',
    name: 'Inter Cars',
    country: 'PL',
    region: 'europe',
    website: 'https://www.intercars.eu',
    description: 'Plus grand distributeur indépendant d’Europe (PL + 15 pays). API IC WebCAT.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'stahlgruber',
    name: 'Stahlgruber / WM',
    country: 'DE',
    region: 'europe',
    website: 'https://www.stahlgruber.de',
    description: 'WM Group — pièces et pneus DACH/EU. Connexion TecCom / API.',
    adapter: 'generic_rest',
    auth: 'basic',
  }),
  p({
    id: 'heuver',
    name: 'Heuver',
    country: 'NL',
    region: 'europe',
    website: 'https://www.heuver.com',
    description: 'Spécialiste PL / agri / OTR. API + CSV quotidien.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'vandenban',
    name: 'Van den Ban',
    country: 'NL',
    region: 'europe',
    website: 'https://www.vandenban.nl',
    description: 'Grossiste Benelux (VL/PL). Portail + export stock.',
    adapter: 'generic_csv',
  }),
  p({
    id: 'oponeo',
    name: 'Oponeo',
    country: 'PL',
    region: 'europe',
    website: 'https://www.oponeo.fr',
    description: 'Pure player Europe (PL/FR/DE/UK). API affilié / wholesale.',
    adapter: 'generic_rest',
    auth: 'api_key',
  }),
  p({
    id: 'reifen_com',
    name: 'Reifen.com',
    country: 'DE',
    region: 'europe',
    website: 'https://www.reifen.com',
    description: 'Place de marché DE. Flux produits XML/CSV ou REST partenaire.',
    adapter: 'generic_csv',
  }),
  p({
    id: 'blackcircles',
    name: 'Blackcircles',
    country: 'UK',
    region: 'europe',
    website: 'https://www.blackcircles.com',
    description: 'N°1 UK (groupe Michelin). API fitting / catalogue partenaire.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),
  p({
    id: 'giti_b2b',
    name: 'Giti Tire B2B',
    country: 'EU',
    region: 'europe',
    website: 'https://www.giti.com',
    description: 'Marque Giti / GT Radial. Portail Europe.',
    adapter: 'generic_rest',
    auth: 'login_password',
  }),
  p({
    id: 'nokian_b2b',
    name: 'Nokian Tyres B2B',
    country: 'FI',
    region: 'europe',
    website: 'https://www.nokiantyres.com',
    description: 'Hiver / all-season. Portail revendeurs Europe.',
    adapter: 'generic_rest',
    auth: 'bearer',
  }),

  // --- Génériques ---
  p({
    id: 'generic_rest',
    name: 'API REST générique',
    country: 'EU',
    region: 'generic',
    website: '',
    description: 'Tout fournisseur avec une API JSON. Indiquez l’URL, l’auth et le mapping des champs — on tire le catalogue.',
    adapter: 'generic_rest',
    auth: 'login_password',
  }),
  p({
    id: 'generic_csv',
    name: 'Flux CSV / fichier quotidien',
    country: 'EU',
    region: 'generic',
    website: '',
    description: 'URL HTTPS vers un CSV (même colonnes que l’import MecaniDoc : pa_largeur, EAN, regular_price…).',
    adapter: 'generic_csv',
    auth: 'none',
  }),
];

export function getProvider(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.id === id);
}

export const SECRET_FIELD_KEYS = new Set(
  PROVIDER_PRESETS.flatMap((p) => p.fields.filter((f) => f.secret).map((f) => f.key))
);

export function defaultValuesFor(provider: ProviderPreset): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of provider.fields) {
    if (f.default !== undefined) out[f.key] = f.default;
  }
  return out;
}
