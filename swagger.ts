import path from 'path';

const swaggerOptions = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'This is the API documentation for the service.',
      contact: {
        name: 'Support',
        email: 'support@example.com',
        url: 'https://example.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080/api/v1', // Replace with your base URL and version
        description: 'Local development server',
      },
      {
        url: 'https://api.example.com/api/v1', // Replace with your production URL
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Users',
        description: 'Operations related to users',
      },
      {
        name: 'Products',
        description: 'Operations related to products',
      },
    ],
    externalDocs: {
      description: 'Find more info here',
      url: 'https://example.com/docs',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format `Bearer <token>`',
        },
      },
      schemas: {
        // Example schema for responses
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            code: {
              type: 'integer',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.resolve(process.cwd(), 'src/routes/**/*.ts'),
    path.resolve(process.cwd(), 'docs/openapi.yaml'),
  ], // Include consolidated YAML spec with absolute paths
};

export default swaggerOptions;
