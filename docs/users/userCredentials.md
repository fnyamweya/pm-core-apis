## **User Credentials**

### **Authentication**

All endpoints require authentication using a Bearer token. The token must be included in the `Authorization` header of every request.

**Example Header**:

```http
Authorization: Bearer <your-access-token>
```

---

### **Endpoints**

#### **1. Create User Credential**

- **Endpoint**: `POST /users/:userId/credentials`
- **Authentication**: Required (Bearer token)
- **Description**: Create a secure credential for a user.

- **Request Parameters**:

  - `userId` (path, required, string): The unique ID of the user.

- **Request Headers**:

  ```http
  Authorization: Bearer <your-access-token>
  ```

- **Request Body**:

  ```json
  {
    "credential": "securepassword",
    "credentialType": "PASSWORD",
    "algorithm": "ARGON2"
  }
  ```

- **Response**:
  ```json
  {
    "apiVersion": "1",
    "kind": "USER_CREDENTIAL",
    "metadata": {
      "correlationId": "c50ed2f2-bd59-4e1a-9093-5d3fd5b7ec93",
      "timestamp": "2024-11-19T10:15:30.123Z",
      "message": "Credential created successfully"
    }
  }
  ```

---

#### **2. Verify User Credential**

- **Endpoint**: `POST /users/:userId/credentials/verify`
- **Authentication**: Required (Bearer token)
- **Description**: Verify if a user's credential matches the stored hash.

- **Request Parameters**:

  - `userId` (path, required, string): The unique ID of the user.

- **Request Headers**:

  ```http
  Authorization: Bearer <your-access-token>
  ```

- **Request Body**:

  ```json
  {
    "credential": "securepassword"
  }
  ```

- **Response**:
  ```json
  {
    "apiVersion": "1",
    "kind": "USER_CREDENTIAL",
    "metadata": {
      "correlationId": "c50ed2f2-bd59-4e1a-9093-5d3fd5b7ec93",
      "timestamp": "2024-11-19T10:15:30.123Z",
      "message": "Credential verified successfully"
    }
  }
  ```

---

#### **3. Update User Credential**

- **Endpoint**: `PUT /users/:userId/credentials`
- **Authentication**: Required (Bearer token)
- **Description**: Update an existing credential for a user.

- **Request Parameters**:

  - `userId` (path, required, string): The unique ID of the user.

- **Request Headers**:

  ```http
  Authorization: Bearer <your-access-token>
  ```

- **Request Body**:

  ```json
  {
    "credential": "newpassword",
    "algorithm": "ARGON2"
  }
  ```

- **Response**:
  ```json
  {
    "apiVersion": "1",
    "kind": "USER_CREDENTIAL",
    "metadata": {
      "correlationId": "c50ed2f2-bd59-4e1a-9093-5d3fd5b7ec93",
      "timestamp": "2024-11-19T10:15:30.123Z",
      "message": "Credential updated successfully"
    }
  }
  ```

---

#### **4. Delete User Credential**

- **Endpoint**: `DELETE /users/:userId/credentials`
- **Authentication**: Required (Bearer token)
- **Description**: Delete a user's credential.

- **Request Parameters**:

  - `userId` (path, required, string): The unique ID of the user.

- **Request Headers**:

  ```http
  Authorization: Bearer <your-access-token>
  ```

- **Response**:
  ```json
  {
    "apiVersion": "1",
    "kind": "USER_CREDENTIAL",
    "metadata": {
      "correlationId": "c50ed2f2-bd59-4e1a-9093-5d3fd5b7ec93",
      "timestamp": "2024-11-19T10:15:30.123Z",
      "message": "Credential deleted successfully"
    }
  }
  ```

---

### **Implementation Details**

#### **Authentication**

All endpoints are secured using Bearer tokens. Implement token validation middleware in the application to validate the token before proceeding with request processing.

**Example Middleware**:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/httpErrors';

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Missing authentication token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // Assuming user payload is attached to the token
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export default authenticate;
```

#### **Extending the Service**

**To Add a New Method**:

1. **Define in Service Layer**:

   - Add the method to `UserCredentialsService` for business logic.
   - Example: `resetCredential`:
     ```typescript
     public async resetCredential(userId: string, newCredential: string): Promise<void> {
       const hashedCredential = await this.hashCredential(newCredential, this.DEFAULT_ALGORITHM);
       await this.update(userId, { hashedCredential });
     }
     ```

2. **Add Controller Logic**:

   - Update the controller to handle the new route:

     ```typescript
     public async resetUserCredential(req: Request, res: Response): Promise<void> {
       const { userId } = req.params;
       const { newCredential } = req.body;

       await this.service.resetCredential(userId, newCredential);

       this.sendSuccess(req, res, {}, 'Credential reset successfully');
     }
     ```

3. **Update Routes**:

   - Add the new route in `routes/userCredentialsRoutes.ts`:
     ```typescript
     router.put(
       '/users/:userId/credentials/reset',
       authenticate,
       validate(resetCredentialSchema),
       userCredentialsController.resetUserCredential
     );
     ```

4. **Update Validation Schema**:
   - Add validation for the new endpoint:
     ```typescript
     export const resetCredentialSchema = {
       params: Joi.object({ userId: Joi.string().uuid().required() }),
       body: Joi.object({ newCredential: Joi.string().min(6).required() }),
     };
     ```

---

### **Security Best Practices**

- **Token Security**: Use HTTPS for all communications to secure tokens in transit.
- **Credential Storage**: Hash all credentials using the recommended algorithm (ARGON2).
- **Rate Limiting**: Apply rate limiting to sensitive endpoints such as `/verify` to prevent brute-force attacks.
- **Correlation ID**: Include `x-correlation-id` in all responses for request traceability.
