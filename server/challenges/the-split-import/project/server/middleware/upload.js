import multer from 'multer';
import { RequestError } from './errorHandler.js';
const receive = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(/\.csv$/i.test(file.originalname) ? null : new RequestError(422, 'Choose a .csv file.'), true),
}).single('file');
export function uploadCsv(req, res, next) {
  receive(req, res, error => next(error ? new RequestError(422, error.code === 'LIMIT_FILE_SIZE' ? 'Keep the file below 1 MB.' : error.message) : undefined));
}
