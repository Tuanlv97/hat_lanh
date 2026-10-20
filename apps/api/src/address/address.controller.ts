import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { AddressService } from './address.service';

@Controller('address')
export class AddressController {
  constructor(private readonly address: AddressService) {}

  @Get('provinces')
  provinces() {
    return this.address.listProvinces();
  }

  @Get('provinces/:code/wards')
  wards(@Param('code') code: string) {
    const wards = this.address.listWards(code);
    if (!wards) throw new NotFoundException({ statusCode: 404, error: 'NOT_FOUND', message: 'Không tìm thấy tỉnh/thành' });
    return wards;
  }
}
