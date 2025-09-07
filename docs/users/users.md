# **Users API Documentation**

## **Base URL**

```
/api/v1/users
```

---

## **Authentication**

- All endpoints require **Bearer Token Authentication**.
- Ensure you include the `Authorization` header with a valid token for secured routes:
  ```
  Authorization: Bearer <access_token>
  ```

---

## **Endpoints**

### 1. **Create User**

#### **POST /users**

Create a new user (admin-level access).

- **Authentication**: Required
- **Authorization**: Requires specific roles or permissions (`admin`, `create_user`).
- **Description**: Allows an authorized user to create another user. Does not include credentials.

#### **Request Body**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "johndoe@example.com",
  "phone": "+254728127391",
  "status": "active"
}
```

#### **Response**

- **Success (201 Created)**

  ```json
  {
    "apiVersion": "1",
    "kind": "USER",
    "data": {
      "id": "b35414f8-ad16-4b68-adcf-54b60390750d",
      "firstName": "John",
      "lastName": "Doe",
      "email": "johndoe@example.com",
      "phone": "+254728127391",
      "status": "active",
      "createdAt": "2024-11-19T08:23:54.953Z",
      "updatedAt": "2024-11-19T08:23:54.953Z"
    },
    "metadata": {
      "message": "User created successfully",
      "correlationId": "123e4567-e89b-12d3-a456-426614174000",
      "timestamp": "2024-11-19T08:23:54.953Z"
    }
  }
  ```

- **Validation Error (400)**
  ```json
  {
    "status": "fail",
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for one or more fields.",
    "details": [
      {
        "field": "email",
        "error": "Email is required."
      }
    ],
    "meta": {
      "correlationId": "123e4567-e89b-12d3-a456-426614174000",
      "timestamp": "2024-11-19T08:23:54.953Z"
    }
  }
  ```

---

### 2. **Register User**

#### **POST /users/register**

Allows self-registration for new users.

- **Authentication**: Not Required
- **Description**: Creates a new user along with their credentials for self-registration.

#### **Request Body**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "janedoe@example.com",
  "phone": "+254728127392",
  "credential": "securepassword123",
  "credentialType": "PASSWORD",
  "algorithm": "BCRYPT"
}
```

#### **Response**

- **Success (201 Created)**
  ```json
  {
    "apiVersion": "1",
    "kind": "USER",
    "data": {
      "id": "c35414f8-ad16-4b68-adcf-54b60390750d",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "janedoe@example.com",
      "phone": "+254728127392",
      "status": "pending_verification",
      "createdAt": "2024-11-19T08:23:54.953Z",
      "updatedAt": "2024-11-19T08:23:54.953Z"
    },
    "metadata": {
      "message": "User registered successfully",
      "correlationId": "456e7891-e89b-12d3-a456-426614174111",
      "timestamp": "2024-11-19T08:23:54.953Z"
    }
  }
  ```

---

### 3. **Get User By ID**

#### **GET /users/:userId**

Retrieve user details by ID.

- **Authentication**: Required

#### **Response**

- **Success (200 OK)**
  ```json
  {
    "apiVersion": "1",
    "kind": "USER",
    "data": {
      "id": "b35414f8-ad16-4b68-adcf-54b60390750d",
      "firstName": "John",
      "lastName": "Doe",
      "email": "johndoe@example.com",
      "phone": "+254728127391",
      "status": "active",
      "createdAt": "2024-11-19T08:23:54.953Z",
      "updatedAt": "2024-11-19T08:23:54.953Z"
    },
    "metadata": {
      "message": "User retrieved successfully",
      "correlationId": "789e1234-e89b-12d3-a456-426614174222",
      "timestamp": "2024-11-19T08:23:54.953Z"
    }
  }
  ```

---

### 4. **Update User**

#### **PATCH /users/:userId**

Update an existing user's details.

- **Authentication**: Required

#### **Request Body**

```json
{
  "firstName": "UpdatedName",
  "phone": "+254728127399"
}
```

#### **Response**

- **Success (200 OK)**
  ```json
  {
    "apiVersion": "1",
    "kind": "USER",
    "data": {
      "id": "b35414f8-ad16-4b68-adcf-54b60390750d",
      "firstName": "UpdatedName",
      "lastName": "Doe",
      "email": "johndoe@example.com",
      "phone": "+254728127399",
      "status": "active",
      "createdAt": "2024-11-19T08:23:54.953Z",
      "updatedAt": "2024-11-19T09:23:54.953Z"
    },
    "metadata": {
      "message": "User updated successfully",
      "correlationId": "123e4567-e89b-12d3-a456-426614174000",
      "timestamp": "2024-11-19T08:23:54.953Z"
    }
  }
  ```

---

### 5. **Delete User**

#### **DELETE /users/:userId**

Delete a user by ID.

- **Authentication**: Required
- **Response**: No content (204 No Content)

---

## **Developer Notes**

### **Adding a New Method**

1. Extend the `UserController` to define a new method.
2. Use the corresponding service methods in `UserService` (or create a new one).
3. Ensure proper validation schemas are added to `schemas/userSchemas.ts`.
4. Update the `users` route to include the new method and endpoint.

**Example:**
Adding a method to fetch users by status:

- **Service Method**: `UserService.getByStatus()`
- **Controller Method**:

  ```typescript
  public async getUsersByStatus(req: Request, res: Response): Promise<void> {
    const { status } = req.query;

    if (!status) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'Status parameter is required.'
      );
    }

    try {
      const users = await this.service.getByStatus(status as string);
      this.sendSuccess(req, res, users, 'Users retrieved successfully');
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
  ```

- **Route**:
  ```typescript
  router.get(
    '/status',
    authenticate('access'),
    validate(getUsersByStatusSchema),
    asyncHandler(UserController.getUsersByStatus.bind(UserController))
  );
  ```

### **Technical Notes**

- **Credential Management**:

  - Supports multiple hashing algorithms (`BCRYPT`, `ARGON2`).
  - Credentials are optional for `POST /users` but required for `POST /users/register`.

- **Caching**:

  - User data is cached for optimized retrieval (e.g., by phone or email).
  - Redis-based caching is configurable.

- **Validation**:
  - Strong input validation using `Joi`.
  - Custom validators are implemented for phone numbers and credentials.
