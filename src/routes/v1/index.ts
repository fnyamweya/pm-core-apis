import express, { RequestHandler, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from '../../../swagger';
import swaggerJsdoc from 'swagger-jsdoc';
import {
  isDevelopmentEnvironment,
  isProductionEnvironment,
} from '../../config/env';
import permissionRoutes from './accessControl/permissionRoutes';
import rolePermissionRoutes from './accessControl/rolePermissionRoutes';
import roleRoutes from './accessControl/roleRoutes';
// import applicationConfigRoutes from './applications/applicationConfigRoutes';
import authRoutes from './auth/authRoutes';
import clientAppRoutes from './clientApps/clientAppRoutes';
import kycRoutes from './kycProfile/kycRoutes';
import organizationRoutes from './organizations/organizationRoutes';
import organizationTypeRoutes from './organizations/organizationTypeRoutes';
import paymentProviderConfigRoutes from './payments/paymentProviderConfigRoutes';
import paymentProviderRoutes from './payments/paymentProviderRoutes';
import smsRoutes from './sms/smsRoutes';
import fileRoutes from './storage/fileRoutes';
import userRoutes from './users/userRoutes';
import propertyRoutes from './properties/propertyRoutes';
import locationRoutes from './locations/locationRoutes';
import locationAddressComponentRoutes from './locations/locationAddressComponentRoutes';
import addressComponentRoutes from './locations/addressComponentRoutes';

const router = express.Router();

interface RouteConfig {
  path: string;
  route: Router;
}

interface SwaggerRouteConfig {
  path: string;
  handlers: RequestHandler[];
}

// Base application routes
const appRoutes: RouteConfig[] = [
  { path: '/users', route: userRoutes },
  { path: '/auth', route: authRoutes },
  { path: '/roles', route: roleRoutes },
  { path: '/roles', route: rolePermissionRoutes },
  { path: '/permissions', route: permissionRoutes },
  { path: '/organizations', route: organizationRoutes },
  { path: '/organization-types', route: organizationTypeRoutes },
  // { path: '/role-permissions', route: rolePermissionRoutes },
  { path: '/sms', route: smsRoutes },
  { path: '/payment-providers', route: paymentProviderRoutes },
  { path: '/payment-configs', route: paymentProviderConfigRoutes },
  { path: '/apps', route: clientAppRoutes },
  { path: '/kyc', route: kycRoutes },
  { path: '/files', route: fileRoutes },
  // { path: '/applications', route: applicationConfigRoutes },
  { path: '/properties', route: propertyRoutes },
  { path: '/locations', route: locationRoutes },
  { path: '/locations/components', route: locationAddressComponentRoutes },
  { path: '/locations/address/components', route: addressComponentRoutes },
  

  // Add more base routes here
];

// Development-only routes
const devRoutes: SwaggerRouteConfig[] = [
  {
    path: '/docs',
    handlers: [
      ...swaggerUi.serve,
      swaggerUi.setup(swaggerJsdoc(swaggerOptions)),
    ],
  },
];

// Raw JSON spec for tooling
router.get('/docs.json', (_req, res) => {
  res.json(swaggerJsdoc(swaggerOptions));
});

// Production-only routes
const prodRoutes: RouteConfig[] = [
  // { path: '/prod-only', route: prodOnlyRoutes() }, // Add routes specific to production here
];

// Utility function to add routes
const loadRoutes = (routes: RouteConfig[]) => {
  routes.forEach(({ path, route }) => router.use(path, route));
};

// Utility function to add Swagger routes
const loadSwaggerRoutes = (routes: SwaggerRouteConfig[]) => {
  routes.forEach(({ path, handlers }) => router.use(path, ...handlers));
};

// Load base application routes
loadRoutes(appRoutes);

// Always load Swagger docs at /docs
loadSwaggerRoutes(devRoutes);

// Load environment-specific routes
if (isProductionEnvironment) {
  loadRoutes(prodRoutes);
}

export default router;
