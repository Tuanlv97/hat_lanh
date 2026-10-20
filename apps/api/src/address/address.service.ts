import { Injectable } from '@nestjs/common';
import data from './data/vn-address.json';

export interface Ward {
  code: string;
  name: string;
}
interface Province {
  code: string;
  name: string;
  wards: Ward[];
}

@Injectable()
export class AddressService {
  private readonly provinces: { code: string; name: string }[];
  private readonly wardsByProvince = new Map<string, Ward[]>();
  private readonly wardCodes = new Map<string, Set<string>>();

  constructor() {
    const list = (data as { provinces: Province[] }).provinces;
    this.provinces = list.map((p) => ({ code: p.code, name: p.name }));
    for (const p of list) {
      const wards = p.wards.map((w) => ({ code: w.code, name: w.name }));
      this.wardsByProvince.set(p.code, wards);
      this.wardCodes.set(p.code, new Set(wards.map((w) => w.code)));
    }
  }

  listProvinces(): { code: string; name: string }[] {
    return this.provinces;
  }

  /** undefined when the province does not exist. */
  listWards(provinceCode: string): Ward[] | undefined {
    return this.wardsByProvince.get(provinceCode);
  }

  isValidWard(provinceCode: string, wardCode: string): boolean {
    return this.wardCodes.get(provinceCode)?.has(wardCode) ?? false;
  }
}
