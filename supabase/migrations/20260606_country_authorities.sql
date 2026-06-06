-- Create country_authorities table for business registration links
CREATE TABLE IF NOT EXISTS country_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL UNIQUE,
  country_name VARCHAR(100) NOT NULL,
  authority_name VARCHAR(200) NOT NULL,
  authority_website VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup by country code
CREATE INDEX IF NOT EXISTS idx_country_authorities_code ON country_authorities(country_code);

-- Enable RLS
ALTER TABLE country_authorities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (public reference data)
CREATE POLICY "Anyone can read country authorities"
  ON country_authorities FOR SELECT
  TO authenticated
  USING (true);

-- Seed data for Country Licensing Authorities
INSERT INTO country_authorities (country_code, country_name, authority_name, authority_website) VALUES
-- A
('AF', 'Afghanistan', 'Central Business Registry', 'https://acbr.gov.af'),
('AL', 'Albania', 'National Business Center (QKB)', 'https://qkb.gov.al'),
('DZ', 'Algeria', 'National Centre of Trade Register (CNRC)', 'https://www.cnrc.dz'),
('AD', 'Andorra', 'Registre de Societats', 'https://www.registre.ad'),
('AO', 'Angola', 'Guiché Único (GUE)', 'https://www.gue.gov.ao'),
('AG', 'Antigua & Barbuda', 'Intellectual Property & Companies Office', 'https://ipo.gov.ag'),
('AR', 'Argentina', 'Inspección General de Justicia (IGJ)', 'https://www.argentina.gob.ar/igj'),
('AM', 'Armenia', 'State Register of Legal Entities', 'https://www.e-register.am'),
('AU', 'Australia', 'ASIC – Australian Securities & Investments Commission', 'https://asic.gov.au'),
('AT', 'Austria', 'Firmenbuch / Business Register', 'https://www.justiz.gv.at/firmenbuch'),
('AZ', 'Azerbaijan', 'State Tax Service Register', 'https://www.e-taxes.gov.az'),

-- B
('BS', 'Bahamas', 'Registrar General''s Dept', 'https://www.bahamas.gov.bs'),
('BH', 'Bahrain', 'Ministry of Industry & Commerce (Sijilat)', 'https://www.sijilat.bh'),
('BD', 'Bangladesh', 'Registrar of Joint Stock Companies (RJSC)', 'https://www.roc.gov.bd'),
('BB', 'Barbados', 'Corporate Affairs & Intellectual Property Office', 'https://caipo.gov.bb'),
('BY', 'Belarus', 'Unified State Register', 'https://egr.gov.by'),
('BE', 'Belgium', 'Crossroads Bank for Enterprises', 'https://kbopub.economie.fgov.be'),
('BZ', 'Belize', 'Belize Companies Registry', 'https://www.companies.gov.bz'),
('BJ', 'Benin', 'GUFE – APIEX', 'https://gufe.apiex.bj'),
('BT', 'Bhutan', 'Ministry of Economic Affairs', 'https://www.moea.gov.bt'),
('BO', 'Bolivia', 'Registro de Comercio de Bolivia', 'https://www.fundempresa.org.bo'),
('BA', 'Bosnia & Herzegovina', 'Business Registers', 'https://www.fipa.gov.ba'),
('BW', 'Botswana', 'Companies & Intellectual Property Authority', 'https://www.cipa.co.bw'),
('BR', 'Brazil', 'Federal Revenue (CNPJ)', 'https://www.gov.br/receitafederal'),
('BN', 'Brunei', 'Registry of Companies (ROCB)', 'https://www.mofe.gov.bn'),
('BG', 'Bulgaria', 'Commercial Register', 'https://portal.registryagency.bg'),
('BF', 'Burkina Faso', 'CEPICI / Guichet Unique', 'https://monentreprise.bf'),
('BI', 'Burundi', 'API Burundi', 'https://www.api.bi'),

-- C
('CV', 'Cabo Verde', 'Casa do Cidadão', 'https://portondinosilha.cv'),
('KH', 'Cambodia', 'Ministry of Commerce – Business Registration', 'https://www.businessregistration.moc.gov.kh'),
('CM', 'Cameroon', 'OAPI / Business Register', 'https://www.mincommerce.cm'),
('CA', 'Canada', 'Corporations Canada', 'https://www.ic.gc.ca'),
('CF', 'Central African Republic', 'Ministry of Commerce', NULL),
('TD', 'Chad', 'ANIE – Investment Agency', 'https://www.anie-tchad.com'),
('CL', 'Chile', 'Registro de Empresas', 'https://www.registrodeempresasysociedades.cl'),
('CN', 'China', 'National Enterprise Credit Information System', 'https://www.gsxt.gov.cn'),
('CO', 'Colombia', 'RUES – Unified Business Registry', 'https://www.rues.org.co'),
('KM', 'Comoros', 'API Comores', 'https://investcomoros.com'),
('CG', 'Congo (Republic)', 'API Congo', 'https://apicongo.com'),
('CD', 'Congo (DRC)', 'GUFE – One Stop Shop', 'https://www.guichetunique.cd'),
('CR', 'Costa Rica', 'National Registry', 'https://www.rnpdigital.com'),
('CI', 'Côte d''Ivoire', 'CEPICI', 'https://www.cepici.gouv.ci'),
('HR', 'Croatia', 'Court Register', 'https://sudreg.pravosudje.hr'),
('CU', 'Cuba', 'Ministry of Justice', 'http://www.minjus.gob.cu'),
('CY', 'Cyprus', 'Registrar of Companies', 'https://efiling.drcor.mcit.gov.cy'),
('CZ', 'Czech Republic', 'Business Register', 'https://or.justice.cz'),

-- D
('DK', 'Denmark', 'Central Business Register (CVR)', 'https://cvr.dk'),
('DJ', 'Djibouti', 'ODPIC', 'http://www.odpic.dj'),
('DM', 'Dominica', 'Companies & IP Office', 'https://cipo.gov.dm'),
('DO', 'Dominican Republic', 'ONAPI / DGII', 'https://www.dgi.gov.do'),

-- E
('EC', 'Ecuador', 'Superintendencia de Compañías', 'https://www.supercias.gob.ec'),
('EG', 'Egypt', 'GAFI', 'https://www.gafi.gov.eg'),
('SV', 'El Salvador', 'National Registry (CNR)', 'https://www.cnr.gob.sv'),
('GQ', 'Equatorial Guinea', 'Ministry of Commerce', NULL),
('ER', 'Eritrea', 'Ministry of Trade', NULL),
('EE', 'Estonia', 'e-Business Register', 'https://ariregister.rik.ee'),
('SZ', 'Eswatini', 'Company Registry', 'https://www.cra.org.sz'),
('ET', 'Ethiopia', 'Ministry of Trade & Industry', 'https://www.moti.gov.et'),

-- F
('FJ', 'Fiji', 'Business Registration', 'https://www.egov.gov.fj'),
('FI', 'Finland', 'Trade Register', 'https://www.ytj.fi'),
('FR', 'France', 'Infogreffe', 'https://www.infogreffe.fr'),

-- G
('GA', 'Gabon', 'CDE – Enterprise Development Center', 'https://www.cde.ga'),
('GM', 'Gambia', 'GIEPA', 'https://giepa.gm'),
('GE', 'Georgia', 'National Agency of Public Registry', 'https://www.napr.gov.ge'),
('DE', 'Germany', 'Unternehmensregister', 'https://www.unternehmensregister.de'),
('GH', 'Ghana', 'Registrar General''s Department', 'https://rgd.gov.gh'),
('GR', 'Greece', 'General Commercial Registry (GEMI)', 'https://www.businessregistry.gr'),
('GD', 'Grenada', 'Corporate Affairs', 'https://www.registry.gov.gd'),
('GT', 'Guatemala', 'Registro Mercantil', 'https://www.rgm.gob.gt'),
('GN', 'Guinea', 'APIP', 'https://www.apiguinee.com'),
('GW', 'Guinea-Bissau', 'CE-Invest', 'https://www.ceinvestgb.com'),
('GY', 'Guyana', 'Deeds & Commercial Registry', 'https://www.dcra.gov.gy'),

-- H
('HT', 'Haiti', 'Ministry of Commerce', 'https://www.mci.gouv.ht'),
('HN', 'Honduras', 'Mercantile Registry', 'https://www.rnp.hn'),
('HK', 'Hong Kong', 'Companies Registry', 'https://www.cr.gov.hk'),
('HU', 'Hungary', 'Company Information Service', 'https://www.e-cegjegyzek.hu'),

-- I
('IS', 'Iceland', 'Company Register', 'https://www.rsk.is/fyrirtaekjaskra'),
('IN', 'India', 'MCA', 'https://www.mca.gov.in'),
('ID', 'Indonesia', 'AHU Online', 'https://ahu.go.id'),
('IR', 'Iran', 'Company Registration Portal', 'https://irsherkat.ssaa.ir'),
('IQ', 'Iraq', 'Companies Registrar', 'https://moci.gov.iq'),
('IE', 'Ireland', 'Companies Registration Office', 'https://www.cro.ie'),
('IL', 'Israel', 'Registrar of Companies', 'https://www.justice.gov.il'),
('IT', 'Italy', 'Registro Imprese', 'https://www.registroimprese.it'),

-- J
('JM', 'Jamaica', 'Companies Office of Jamaica', 'https://www.orcjamaica.com'),
('JP', 'Japan', 'National Tax Agency Corporate Number', 'https://www.houjin-bangou.nta.go.jp'),
('JO', 'Jordan', 'Companies Control Department', 'https://www.ccd.gov.jo'),

-- K
('KZ', 'Kazakhstan', 'eGov Business Registry', 'https://egov.kz'),
('KE', 'Kenya', 'eCitizen Business Registration', 'https://www.ecitizen.go.ke'),
('KI', 'Kiribati', 'Ministry of Commerce', NULL),
('KW', 'Kuwait', 'Ministry of Commerce', 'https://www.moci.gov.kw'),
('KG', 'Kyrgyzstan', 'Ministry of Justice', 'https://minjust.gov.kg'),

-- L
('LA', 'Laos', 'Enterprise Registry', 'https://www.erc.moic.gov.la'),
('LV', 'Latvia', 'Enterprise Register', 'https://www.ur.gov.lv'),
('LB', 'Lebanon', 'Commercial Register', 'https://www.justice.gov.lb'),
('LS', 'Lesotho', 'One-Stop Business Registration', 'https://osb.ls'),
('LR', 'Liberia', 'Liberia Business Registry', 'https://www.lbr.gov.lr'),
('LY', 'Libya', 'Commercial Registry', NULL),
('LI', 'Liechtenstein', 'Public Registry Office', 'https://www.oera.li'),
('LT', 'Lithuania', 'Register of Legal Entities', 'https://www.registrucentras.lt'),
('LU', 'Luxembourg', 'LBR', 'https://www.lbr.lu'),

-- M
('MG', 'Madagascar', 'EDBM', 'https://www.edbm.mg'),
('MW', 'Malawi', 'Registrar General', 'https://www.registrargeneral.gov.mw'),
('MY', 'Malaysia', 'SSM', 'https://www.ssm.com.my'),
('MV', 'Maldives', 'Ministry of Economic Development', 'https://business.egov.mv'),
('ML', 'Mali', 'API Mali', 'https://www.apimali.gov.ml'),
('MT', 'Malta', 'Malta Business Registry', 'https://mbr.mt'),
('MH', 'Marshall Islands', 'Registrar of Corporations', 'https://www.register-iri.com'),
('MR', 'Mauritania', 'ONAPE / Commercial Registry', NULL),
('MU', 'Mauritius', 'Corporate & Business Registration Dept', 'https://companies.govmu.org'),
('MX', 'Mexico', 'SIEM', 'https://www.siem.gob.mx'),
('FM', 'Micronesia', 'FSM Registrar', 'https://www.fsmlaw.org'),
('MD', 'Moldova', 'State Registration Chamber', 'https://www.asp.gov.md'),
('MC', 'Monaco', 'RCI Monaco', 'https://www.monaco-entreprises.gouv.mc'),
('MN', 'Mongolia', 'Legal Entity Registration', 'https://burtgel.gov.mn'),
('ME', 'Montenegro', 'CRPS', 'https://www.crps.me'),
('MA', 'Morocco', 'OMPIC', 'https://www.directinfo.ma'),
('MZ', 'Mozambique', 'Conservatória', 'https://www.portaldogoverno.gov.mz'),
('MM', 'Myanmar', 'DICA', 'https://www.myco.dica.gov.mm'),

-- N
('NA', 'Namibia', 'BIPA', 'https://www.bipa.na'),
('NR', 'Nauru', 'Corporate Registry', NULL),
('NP', 'Nepal', 'Office of Company Registrar', 'https://ocr.gov.np'),
('NL', 'Netherlands', 'Kamer van Koophandel', 'https://www.kvk.nl'),
('NZ', 'New Zealand', 'Companies Office', 'https://companies-register.companiesoffice.govt.nz'),
('NI', 'Nicaragua', 'Ministry of Development', 'https://www.mific.gob.ni'),
('NE', 'Niger', 'ANPIPS', 'https://anpips.ne'),
('NG', 'Nigeria', 'CAC', 'https://www.cac.gov.ng'),
('MK', 'North Macedonia', 'Central Registry', 'https://www.crm.com.mk'),
('NO', 'Norway', 'Brønnøysund Register Centre', 'https://www.brreg.no'),

-- O
('OM', 'Oman', 'Ministry of Commerce', 'https://www.business.gov.om'),

-- P
('PK', 'Pakistan', 'SECP', 'https://www.secp.gov.pk'),
('PW', 'Palau', 'Registrar of Corporations', 'https://www.palaugov.pw'),
('PA', 'Panama', 'Panama Registry', 'https://www.registro-publico.gob.pa'),
('PG', 'Papua New Guinea', 'IPA Registry', 'https://www.ipa.gov.pg'),
('PY', 'Paraguay', 'RUC — Taxpayer Registry', 'https://www.hacienda.gov.py'),
('PE', 'Peru', 'SUNARP', 'https://www.sunarp.gob.pe'),
('PH', 'Philippines', 'SEC (eSPARC)', 'https://esparc.sec.gov.ph'),
('PL', 'Poland', 'KRS', 'https://ekrs.ms.gov.pl'),
('PT', 'Portugal', 'RNPC / Corporate Registry', 'https://www.irn.mj.pt'),

-- Q
('QA', 'Qatar', 'Ministry of Commerce', 'https://www.moci.gov.qa'),

-- R
('RO', 'Romania', 'ONRC', 'https://www.onrc.ro'),
('RU', 'Russia', 'Federal Tax Service (EGRUL)', 'https://egrul.nalog.ru'),
('RW', 'Rwanda', 'ORG (RDB)', 'https://org.rdb.rw'),

-- S
('KN', 'Saint Kitts & Nevis', 'Registrar of Companies', 'https://www.gov.kn'),
('LC', 'Saint Lucia', 'Registry of Companies', 'https://www.companiesregistry.govt.lc'),
('VC', 'Saint Vincent & Grenadines', 'Commerce Registry', 'https://www.gov.vc'),
('WS', 'Samoa', 'Samoa Companies Registry', 'https://www.businessregistries.gov.ws'),
('SM', 'San Marino', 'Registro delle Imprese', 'https://www.agency.sm'),
('ST', 'São Tomé & Príncipe', 'GUFE', 'https://gufe.st'),
('SA', 'Saudi Arabia', 'Ministry of Commerce', 'https://mc.gov.sa'),
('SN', 'Senegal', 'APIX', 'https://www.apix.sn'),
('RS', 'Serbia', 'SBRA', 'https://www.apr.gov.rs'),
('SC', 'Seychelles', 'SBR / FSA', 'https://www.sbr.gov.sc'),
('SL', 'Sierra Leone', 'Office of Registrar General', 'https://www.oarg.gov.sl'),
('SG', 'Singapore', 'ACRA', 'https://www.acra.gov.sg'),
('SK', 'Slovakia', 'Business Register', 'https://www.orsr.sk'),
('SI', 'Slovenia', 'AJPES', 'https://www.ajpes.si'),
('SB', 'Solomon Islands', 'Company Haus', 'https://companyhaus.gov.sb'),
('SO', 'Somalia', 'Ministry of Commerce', NULL),
('ZA', 'South Africa', 'CIPC', 'https://www.cipc.co.za'),
('KR', 'South Korea', 'KOREA Biz Portal', 'https://www.startbiz.go.kr'),
('SS', 'South Sudan', 'Business Registry (MOJ)', NULL),
('ES', 'Spain', 'Registro Mercantil', 'https://www.rmc.es'),
('LK', 'Sri Lanka', 'Department of Registrar of Companies', 'https://www.drc.gov.lk'),
('SD', 'Sudan', 'Commercial Registrar', NULL),
('SR', 'Suriname', 'Chamber of Commerce', 'https://www.surinamechamber.com'),
('SE', 'Sweden', 'Bolagsverket', 'https://www.bolagsverket.se'),
('CH', 'Switzerland', 'Zefix', 'https://www.zefix.ch'),
('SY', 'Syria', 'Ministry of Internal Trade', NULL),

-- T
('TW', 'Taiwan', 'MOEA Business Registration', 'https://gcis.nat.gov.tw'),
('TJ', 'Tajikistan', 'Tax Committee Register', 'https://www.andoz.tj'),
('TZ', 'Tanzania', 'BRELA', 'https://www.brela.go.tz'),
('TH', 'Thailand', 'Department of Business Development', 'https://www.dbd.go.th'),
('TL', 'Timor-Leste', 'SERVE', 'https://serve.gov.tl'),
('TG', 'Togo', 'CFE Togo', 'https://www.cfetogo.tg'),
('TO', 'Tonga', 'Business Registry', 'https://www.businessregistries.gov.to'),
('TT', 'Trinidad & Tobago', 'Companies Registry', 'https://www.agla.gov.tt'),
('TN', 'Tunisia', 'RNE', 'https://www.registre-entreprises.tn'),
('TR', 'Turkey', 'MERSIS', 'https://mersis.gtb.gov.tr'),
('TM', 'Turkmenistan', 'Ministry of Finance & Economy', NULL),
('TV', 'Tuvalu', 'Ministry of Finance', NULL),

-- U
('UG', 'Uganda', 'URSB', 'https://ursb.go.ug'),
('UA', 'Ukraine', 'Unified State Register', 'https://usr.minjust.gov.ua'),
('AE', 'United Arab Emirates', 'Ministry of Economy', 'https://www.moec.gov.ae'),
('GB', 'United Kingdom', 'Companies House', 'https://www.gov.uk/companieshouse'),
('US', 'United States', 'State Business Registries (SOS offices)', 'https://www.usa.gov/state-business'),
('UY', 'Uruguay', 'BPS / Companies Registry', 'https://www.dgi.gub.uy'),
('UZ', 'Uzbekistan', 'Single Window Portal', 'https://my.gov.uz'),

-- V
('VU', 'Vanuatu', 'VFSC', 'https://www.vfsc.vu'),
('VE', 'Venezuela', 'SENIAT (RIF)', 'https://www.seniat.gob.ve'),
('VN', 'Vietnam', 'National Business Registration Portal', 'https://dangkykinhdoanh.gov.vn'),

-- Y
('YE', 'Yemen', 'Ministry of Industry', NULL),

-- Z
('ZM', 'Zambia', 'PACRA', 'https://www.pacra.org.zm'),
('ZW', 'Zimbabwe', 'Companies Registry', 'https://www.dcip.gov.zw')

ON CONFLICT (country_code) DO UPDATE SET
  country_name = EXCLUDED.country_name,
  authority_name = EXCLUDED.authority_name,
  authority_website = EXCLUDED.authority_website;
