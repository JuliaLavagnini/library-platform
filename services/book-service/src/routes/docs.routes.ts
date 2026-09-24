import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi.ts';

export const docsRouter = Router();

// Machine-readable spec, e.g. for generating clients or importing into Postman.
docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

// Interactive docs: browse the endpoints and try them from the browser.
docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, { customSiteTitle: 'Book Service API' }),
);
