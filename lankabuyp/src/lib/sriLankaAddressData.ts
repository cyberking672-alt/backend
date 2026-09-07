export interface ProvinceData {
  nameEn: string;
  districts: string[];
}

export const SRI_LANKA_PROVINCES: ProvinceData[] = [
  {
    nameEn: 'Western Province',
    districts: ['Colombo', 'Gampaha', 'Kalutara']
  },
  {
    nameEn: 'Central Province',
    districts: ['Kandy', 'Matale', 'Nuwara Eliya']
  },
  {
    nameEn: 'Southern Province',
    districts: ['Galle', 'Matara', 'Hambantota']
  },
  {
    nameEn: 'Sabaragamuwa Province',
    districts: ['Ratnapura', 'Kegalle']
  },
  {
    nameEn: 'North Western Province',
    districts: ['Kurunegala', 'Puttalam']
  },
  {
    nameEn: 'Northern Province',
    districts: ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu']
  },
  {
    nameEn: 'Eastern Province',
    districts: ['Batticaloa', 'Ampara', 'Trincomalee']
  },
  {
    nameEn: 'Uva Province',
    districts: ['Badulla', 'Moneragala']
  },
  {
    nameEn: 'North Central Province',
    districts: ['Anuradhapura', 'Polonnaruwa']
  }
];

export const ALL_SRI_LANKA_DISTRICTS = SRI_LANKA_PROVINCES.flatMap(p => p.districts);

export const getProvinceForDistrict = (districtName: string): string => {
  if (!districtName) return 'Western Province';
  for (const prov of SRI_LANKA_PROVINCES) {
    if (prov.districts.some(d => d.toLowerCase() === districtName.toLowerCase())) {
      return prov.nameEn;
    }
  }
  return 'Western Province';
};
