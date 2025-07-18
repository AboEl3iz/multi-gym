import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Gym Management System API',
      version: '1.0.0',
      description: 'API documentation for the Multi-Gym Management System',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/entities/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec; 