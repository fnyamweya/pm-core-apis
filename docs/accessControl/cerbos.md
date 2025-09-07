# Authorization with Cerbos

This guide provides a comprehensive overview of how to implement authorization using Cerbos in our application. It covers the key components, including how to draft policies, handle routes, and integrate Cerbos into our middleware.

## Table of Contents

1. [Introduction](#introduction)
2. [Cerbos Overview](#cerbos-overview)
3. [Policy Drafting](#policy-drafting)
4. [Middleware Implementation](#middleware-implementation)
5. [Route Handling](#route-handling)
6. [Error Handling](#error-handling)
7. [Logging](#logging)
8. [Testing](#testing)
9. [Best Practices](#best-practices)

## Introduction

Authorization is a critical aspect of securing our application. Cerbos is a flexible, high-performance, policy engine for authorization that allows us to define fine-grained access controls. This guide will help developers understand how to integrate Cerbos into our application, draft policies, and handle authorization checks in our routes.

## Cerbos Overview

Cerbos is a policy engine that allows us to define access control policies using a declarative language. These policies are evaluated at runtime to determine whether a user is allowed to perform a specific action on a resource.

### Key Concepts

- **Principal**: Represents the user making the request. It includes the user's ID and roles.
- **Resource**: Represents the resource being accessed (e.g., a user, document, etc.).
- **Action**: Represents the action being performed on the resource (e.g., read, write, delete).
- **Policy**: Defines the rules for who can perform what actions on which resources.

## Policy Drafting

Policies are the core of Cerbos. They define the rules for access control. Policies are written in YAML or JSON and stored in the Cerbos policy store.

### Example Policy

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: 'default'
  resource: 'users'
  rules:
    - actions: ['read', 'update']
      effect: 'ALLOW'
      roles: ['admin']
      condition:
        match:
          expr: request.resource.id == request.principal.id
```

### Policy Structure

- **apiVersion**: The version of the Cerbos API.
- **resourcePolicy**: Defines the resource-specific policy.
- **version**: The version of the policy.
- **resource**: The kind of resource the policy applies to.
- **rules**: The list of rules defining access control.
  - **actions**: The actions allowed by the rule.
  - **effect**: Whether the rule allows or denies access.
  - **roles**: The roles to which the rule applies.
  - **condition**: Optional conditions that must be met for the rule to apply.

### Best Practices for Policy Drafting

1. **Keep Policies Simple**: Avoid overly complex conditions. If a policy becomes too complex, consider breaking it into multiple policies.
2. **Use Conditions Sparingly**: Conditions should be used only when necessary. Simple role-based access control is often sufficient.
3. **Test Policies Thoroughly**: Ensure that policies are tested with various scenarios to avoid unintended access.

## Middleware Implementation

The `authorize` middleware is responsible for checking whether a user is authorized to perform a specific action on a resource.

### `authorize` Middleware

```typescript
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { getCerbosClient } from '../../config/cerbos';
import { UnauthorizedError } from '../../errors/httpErrors';
import { logger } from '../../utils/logger';
import { DecodedToken } from './authenticate';

interface UserRoles {
  roles: string[];
}

type User = DecodedToken & UserRoles;

const authorize = (
  resourceKind: string,
  action: string,
  idField: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as User;
      if (!user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!user.roles || user.roles.length === 0) {
        throw new UnauthorizedError('User roles are not defined');
      }

      logger.info('User roles:', { roles: user.roles });

      const resourceId = req.params[idField] || 'default-resource-id';
      logger.info('Request parameters:', req.params);
      if (!resourceId) {
        logger.warn('Resource ID is not defined in the request parameters', {
          params: req.params,
        });
      }

      const principal = {
        id: user.sub,
        roles: user.roles,
      };

      const resource = {
        kind: resourceKind,
        id: resourceId,
        attributes: {},
      };

      const cerbosClient = await getCerbosClient();

      logger.info('Cerbos authorization check:', {
        principal,
        resource,
        action,
      });

      const decision = await cerbosClient.checkResource({
        principal,
        resource,
        actions: [action],
      });

      logger.info('Cerbos decision:', { decision });

      if (decision.isAllowed(action)) {
        next();
      } else {
        res.status(httpStatus.FORBIDDEN).json({ message: 'Access denied' });
      }
    } catch (error) {
      logger.error('Authorization error:', error);

      if (error instanceof UnauthorizedError) {
        res.status(httpStatus.UNAUTHORIZED).json({ message: error.message });
      } else {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'An unexpected error occurred during authorization',
        });
      }
    }
  };
};

export default authorize;
```

### Key Points

- **User Authentication**: The middleware assumes that the user is already authenticated and their details are available in the request object.
- **Resource Identification**: The middleware extracts the resource ID from the request parameters.
- **Cerbos Client**: The middleware uses the Cerbos client to check if the user is allowed to perform the specified action on the resource.
- **Decision Handling**: Based on the Cerbos decision, the middleware either allows the request to proceed or returns a `403 Forbidden` response.

## Route Handling

Routes are where the authorization middleware is applied. Each route that requires authorization should use the `authorize` middleware.

### Example Routes

```typescript
import { Router } from 'express';
import UserController from '../../../controllers/users/userController';
import UserRoleController from '../../../controllers/users/userRoleController';
import authenticate from '../../../middlewares/auth/authenticate';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import { assignRoleSchema } from '../../../validations/users/userRoleValidation';
import {
  createUserSchema,
  registerUserSchema,
  updateUserSchema,
} from '../../../validations/users/userValidation';

const router = Router();

/**
 * @route POST /users
 * @description Create a new user
 * @access Public
 */
router.post(
  '/',
  validate(createUserSchema),
  authenticate('access'),
  authorize('users', 'create'),
  asyncHandler(UserController.createUser.bind(UserController))
);

/**
 * @route POST /users/register
 * @description Register a new user (self-registration)
 * @access Public
 */
router.post(
  '/register',
  validate(registerUserSchema),
  asyncHandler(UserController.registerUser.bind(UserController))
);

/**
 * @route PUT /users/:userId
 * @description Update an existing user by ID
 * @access Public
 */
router.put(
  '/:userId',
  authenticate('access'),
  authorize('users', 'update'),
  validate(updateUserSchema),
  asyncHandler(UserController.updateUser.bind(UserController))
);

/**
 * @route GET /users
 * @description Retrieve all users with optional pagination
 * @access Public
 */
router.get(
  '/',
  // authenticate('access'),
  asyncHandler(UserController.getPaginated.bind(UserController))
);

/**
 * @route GET /users/:userId
 * @description Retrieve a user by ID
 * @access Public
 */
router.get(
  '/:userId',
  authenticate('access'),
  asyncHandler(UserController.getUserById.bind(UserController))
);

/**
 * @route GET /users/email
 * @description Retrieve a user by email
 * @access Public
 */
router.get(
  '/email',
  authenticate('access'),
  asyncHandler(UserController.getUserByEmail.bind(UserController))
);

/**
 * @route DELETE /users/:userId
 * @description Delete a user by ID
 * @access Public
 */
router.delete(
  '/:userId',
  authenticate('access'),
  asyncHandler(UserController.deleteUser.bind(UserController))
);

/** -------------------- User Role Routes -------------------- **/

/**
 * @route POST /users/:userId/roles
 * @description Add a role to a specific user
 * @access Public
 */
router.post(
  '/:userId/roles',
  validate(assignRoleSchema),
  asyncHandler(UserRoleController.addUserRole.bind(UserRoleController))
);

/**
 * @route GET /users/:userId/roles
 * @description Retrieve all roles for a specific user
 * @access Public
 */
router.get(
  '/:userId/roles',
  asyncHandler(UserRoleController.getUserRoles.bind(UserRoleController))
);

/**
 * @route DELETE /users/:userId/roles/:roleId
 * @description Remove a specific role from a user
 * @access Public
 */
router.delete(
  '/:userId/roles/:roleId',
  asyncHandler(UserRoleController.removeUserRole.bind(UserRoleController))
);

/**
 * @route DELETE /users/:userId/roles
 * @description Remove all roles from a specific user
 * @access Public
 */
router.delete(
  '/:userId/roles',
  asyncHandler(UserRoleController.removeAllUserRoles.bind(UserRoleController))
);

export default router;
```

### Key Points

- **Route Definition**: Each route is defined with a specific HTTP method and path.
- **Middleware Chain**: The middleware chain includes validation, authentication, and authorization.
- **Controller Binding**: The route handler is bound to the appropriate controller method.

## Error Handling

Error handling is crucial for ensuring that our application behaves predictably in case of authorization failures.

### Error Classes

```typescript
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
```

### Error Handling in Middleware

```typescript
try {
  // Authorization logic
} catch (error) {
  logger.error('Authorization error:', error);

  if (error instanceof UnauthorizedError) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: error.message });
  } else {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'An unexpected error occurred during authorization',
    });
  }
}
```

### Key Points

- **Custom Errors**: Define custom error classes for specific error scenarios.
- **Logging**: Log errors to help with debugging and monitoring.
- **Response Handling**: Return appropriate HTTP status codes and messages based on the error.

## Logging

Logging is essential for monitoring and debugging authorization checks.

### Logging Middleware

```typescript
import { logger } from '../../utils/logger';

logger.info('User roles:', { roles: user.roles });
logger.info('Request parameters:', req.params);
logger.info('Cerbos authorization check:', {
  principal,
  resource,
  action,
});
logger.info('Cerbos decision:', { decision });
logger.error('Authorization error:', error);
```

### Key Points

- **Contextual Logging**: Include relevant context in log messages (e.g., user roles, request parameters).
- **Decision Logging**: Log the Cerbos decision to understand why a request was allowed or denied.
- **Error Logging**: Log errors with detailed information to aid in troubleshooting.

## Testing

Testing is crucial to ensure that our authorization logic works as expected.

### Unit Tests

```typescript
import { expect } from 'chai';
import sinon from 'sinon';
import { authorize } from './authorize';
import { getCerbosClient } from '../../config/cerbos';

describe('authorize middleware', () => {
  let req: any;
  let res: any;
  let next: any;
  let cerbosClientStub: any;

  beforeEach(() => {
    req = {
      user: {
        sub: 'user-id',
        roles: ['admin'],
      },
      params: {
        userId: 'user-id',
      },
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    next = sinon.stub();
    cerbosClientStub = sinon.stub(getCerbosClient, 'checkResource').resolves({
      isAllowed: sinon.stub().returns(true),
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should allow access if Cerbos allows the action', async () => {
    await authorize('users', 'read')(req, res, next);
    expect(next.calledOnce).to.be.true;
  });

  it('should deny access if Cerbos denies the action', async () => {
    cerbosClientStub.resolves({
      isAllowed: sinon.stub().returns(false),
    });
    await authorize('users', 'read')(req, res, next);
    expect(res.status.calledWith(403)).to.be.true;
    expect(res.json.calledWith({ message: 'Access denied' })).to.be.true;
  });

  it('should handle unauthorized errors', async () => {
    req.user = undefined;
    await authorize('users', 'read')(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWith({ message: 'User not authenticated' })).to.be
      .true;
  });
});
```

### Key Points

- **Stubbing Dependencies**: Use stubs to simulate the behavior of dependencies (e.g., Cerbos client).
- **Test Cases**: Cover various scenarios, including allowed and denied access, and error cases.
- **Assertions**: Use assertions to verify that the middleware behaves as expected.

## Best Practices

1. **Consistency**: Ensure that authorization logic is consistent across all routes.
2. **Separation of Concerns**: Keep authorization logic separate from business logic.
3. **Documentation**: Document policies and middleware clearly to aid in understanding and maintenance.
4. **Monitoring**: Monitor authorization decisions and errors to detect and address issues promptly.
5. **Security**: Regularly review and update policies to address security vulnerabilities.
