export interface SupplierPreset {
  id: string;
  name: string;
  email: string;
  phone: string;
  defaultProduct: string;
  defaultCn: string;
}

export const SUPPLIER_PRESETS: SupplierPreset[] = [
  {
    id: 'sup_tata_01',
    name: 'Tata Steel Limited (Jamshedpur)',
    email: 'cbam.desk@tatasteel.com',
    phone: '+919830112233',
    defaultProduct: 'Continuously Cast Billets (150x150 mm)',
    defaultCn: '7207 11 00',
  },
  {
    id: 'sup_sail_02',
    name: 'Steel Authority of India Limited (Durgapur)',
    email: 'cbam.durgapur@sail.in',
    phone: '+919831998877',
    defaultProduct: 'Hot Rolled Steel Rounds (Dia 80mm)',
    defaultCn: '7214 99 10',
  },
  {
    id: 'sup_jsw_03',
    name: 'JSW Steel Limited (Vijayanagar)',
    email: 'cbam@jsw.in',
    phone: '+919845112233',
    defaultProduct: 'Carbon Steel Blooms & Billets',
    defaultCn: '7207 11 00',
  },
  {
    id: 'sup_jspl_04',
    name: 'Jindal Steel & Power Limited (Angul)',
    email: 'quality.angul@jindalsteel.com',
    phone: '+919861001122',
    defaultProduct: 'Alloy Round Billets (ASTM A105)',
    defaultCn: '7228 30 20',
  },
];
