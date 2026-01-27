import fileUpload from 'express-fileupload';
import { versionNo } from '../../../../helpers/contants';
import { Server } from '../../../../helpers/env';
import { AppError } from '../../../../helpers/errors';
import { Logger } from '../../../../helpers/logger';
import { HealthStatusModel } from '../models/common.model';
import { AwsS3Service } from '../../../../helpers/AwsS3';
import { s3Paths } from '../../../../helpers/entities';
import { Entities } from '../../../../helpers';
import { Db } from '../../../../database/db';

export class CommonService {
  AwsS3Service: AwsS3Service | null = null;
  db: Db;

  constructor() {
    Logger.info('CommonService initialized...');

    this.db = Db.Instance;
  }

  private getAwsS3Service(): AwsS3Service {
    if (!this.AwsS3Service) {
      this.AwsS3Service = new AwsS3Service();
    }
    return this.AwsS3Service;
  }

  public GetHealthStatus(): HealthStatusModel {
    Logger.info('CommonService.GetHealthStatus');

    return {
      message: 'Server is running',
      environment: Server.ENVIRONMENT,
      versionNo: versionNo,
    };
  }

  public async GetCategories(): Promise<Entities.Category[]> {
    Logger.info('CommonService.GetCategories');

    return await this.db.v1.User.GetCategories();
  }

  public async UploadImage(files: fileUpload.FileArray | null | undefined, path?: s3Paths): Promise<string> {
    Logger.info('CommonService.UploadImage');

    if (!files) throw new AppError(400, 'Missing file');

    const file = files.fileToUpload as fileUpload.UploadedFile;

    const db = Db.Instance;
    const img = await this.getAwsS3Service().UploadFileToS3(file.data, file.name, path);

    return img;
  }
}
