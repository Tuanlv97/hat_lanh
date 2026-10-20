import {
  BadRequestException,
  CallHandler,
  Controller,
  ExecutionContext,
  HttpCode,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { catchError, Observable, throwError } from 'rxjs';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MAX_UPLOAD_BYTES, sniffImage, UPLOAD_DIR } from './uploads';

const bad = (message: string) => new BadRequestException({ statusCode: 400, error: 'INVALID_FILE', message });

/** multer's size-limit error surfaces as 413; the API contract is 400. */
@Injectable()
class TooLargeTo400Interceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError((e: unknown) => throwError(() => (e instanceof PayloadTooLargeException ? bad('Ảnh tối đa 5 MB') : e))));
  }
}

@Controller('admin/uploads')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class UploadsController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(
    TooLargeTo400Interceptor,
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw bad('Thiếu tệp ảnh (trường "file")');
    if (file.size > MAX_UPLOAD_BYTES) throw bad('Ảnh tối đa 5 MB');
    const ext = sniffImage(file.buffer);
    if (!ext) throw bad('Chỉ chấp nhận ảnh png, jpg hoặc webp');
    const name = `${randomUUID()}.${ext}`;
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer, { flag: 'wx' });
    return { url: `/uploads/${name}` };
  }
}
