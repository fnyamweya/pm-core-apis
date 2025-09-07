## KYC Documentation

### Overview

This document outlines the KYC (Know Your Customer) process for user verification within our system. The KYC process includes capturing specific attributes depending on user roles, verifying them, and enforcing KYC checks through middleware to restrict access to sensitive areas of the application.

### Key Components

1. **KYC Profile**: Represents the overall KYC verification status for a user.
2. **KYC Attributes**: Stores specific identification details that vary by role (e.g., National ID, Tax ID for businesses).
3. **Role-Based KYC Requirements**: Different user roles require different attributes to fulfill KYC requirements.
4. **KYC Status Middleware**: Ensures users meet required KYC verification status for accessing protected routes.

---

### KYC Profile Statuses

| Status         | Description                                         |
| -------------- | --------------------------------------------------- |
| `pending`      | KYC verification is initiated but not yet reviewed. |
| `verified`     | KYC has been reviewed and approved.                 |
| `rejected`     | KYC was reviewed and rejected.                      |
| `under_review` | KYC is under manual review.                         |

---

### Role-Based KYC Requirements

| Role       | Required Attributes                                  |
| ---------- | ---------------------------------------------------- |
| Individual | National ID, Date of Birth                           |
| Admin      | National ID, Date of Birth, Employment ID            |
| Business   | Business Registration Number, Tax ID, Contact Person |

These requirements guide what attributes need to be provided and verified for each role before granting full access to the system.

---

### API Endpoints

#### 1. Create a KYC Profile

This endpoint is used to create a new KYC profile for a user, capturing identification attributes based on their role.

- **Endpoint**: `POST /api/kyc-profiles`
- **Description**: Initiates a KYC profile by capturing identification details required by the user's role.
- **Required Fields**:
  - `userId`: Unique identifier for the user.
  - `role`: Role of the user (e.g., `Individual`, `Admin`, `Business`).
  - `attributes`: Key-value pairs of identification details based on role.

##### Sample Request Payloads

**For Individual User**

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "role": "Individual",
  "attributes": {
    "nationalId": "12345678",
    "dateOfBirth": "1990-05-20"
  }
}
```

**For Admin User**

```json
{
  "userId": "234e5678-e89b-12d3-a456-426614174001",
  "role": "Admin",
  "attributes": {
    "nationalId": "87654321",
    "dateOfBirth": "1985-04-15",
    "employmentId": "EMP001"
  }
}
```

**For Business**

```json
{
  "userId": "345e6789-e89b-12d3-a456-426614174002",
  "role": "Business",
  "attributes": {
    "businessRegistrationNumber": "BR123456",
    "taxId": "PIN987654",
    "contactPerson": {
      "name": "John Doe",
      "nationalId": "67890123",
      "phone": "+254700123456"
    }
  }
}
```

##### Sample Response

```json
{
  "kycProfileId": "789e1234-e89b-12d3-a456-426614174111",
  "status": "pending",
  "createdAt": "2024-11-13T08:30:00Z",
  "message": "KYC profile created successfully and pending verification."
}
```

---

#### 2. Update KYC Status

Allows an administrator or automated system to update the KYC status of a user.

- **Endpoint**: `PATCH /api/kyc-profiles/:kycProfileId/status`
- **Description**: Updates the verification status of an existing KYC profile.
- **Required Fields**:
  - `status`: New status for the KYC profile (`verified`, `rejected`, `under_review`).

##### Sample Request Payload

```json
{
  "status": "verified"
}
```

##### Sample Response

```json
{
  "kycProfileId": "789e1234-e89b-12d3-a456-426614174111",
  "status": "verified",
  "updatedAt": "2024-11-13T09:00:00Z",
  "message": "KYC status updated to verified."
}
```

---

#### 3. Retrieve KYC Profile

This endpoint fetches the KYC profile for a specific user, showing current verification status and attributes.

- **Endpoint**: `GET /api/kyc-profiles/:userId`
- **Description**: Retrieves the KYC profile and current verification status for the specified user.

##### Sample Response

**For Individual User**

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "kycProfile": {
    "status": "verified",
    "verifiedAt": "2024-11-13T09:00:00Z",
    "attributes": {
      "nationalId": "12345678",
      "dateOfBirth": "1990-05-20"
    }
  }
}
```

**For Business User**

```json
{
  "userId": "345e6789-e89b-12d3-a456-426614174002",
  "kycProfile": {
    "status": "verified",
    "verifiedAt": "2024-11-13T09:00:00Z",
    "attributes": {
      "businessRegistrationNumber": "BR123456",
      "taxId": "PIN987654",
      "contactPerson": {
        "name": "John Doe",
        "nationalId": "67890123",
        "phone": "+254700123456"
      }
    }
  }
}
```

---

### Middleware for KYC Enforcement

The KYC status middleware ensures that users meet the required KYC verification status for accessing specific routes. This can be customized based on roles, allowing flexibility.

#### Example: `checkKycStatus` Middleware

**Purpose**: This middleware checks if the user has the required KYC status before accessing a route.

**Usage**: Apply this middleware to routes that require a specific KYC status.

```typescript
// Apply to routes as needed
app.get('/api/protected-route', checkKycStatus('verified'), (req, res) => {
  res.json({ message: 'Access granted to verified users.' });
});
```

#### Additional Middleware Example: Role-Based Attribute Check

For some routes, it may be necessary to check that specific attributes (e.g., `nationalId` for Admin) are present in the KYC profile based on user role.

```typescript
const checkKycAttribute = (requiredAttributes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(httpStatus.FORBIDDEN)
        .json({ message: 'User not authenticated' });
    }

    try {
      const kycProfile = await kycProfileService.getKycProfileByUserId(
        req.user.sub
      );

      if (
        !kycProfile ||
        !requiredAttributes.every((attr) => attr in kycProfile.attributes)
      ) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: `User KYC profile is missing required attributes: ${requiredAttributes.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Error checking KYC attributes' });
    }
  };
};

// Example usage for routes that require specific attributes
app.get(
  '/api/admin-route',
  checkKycAttribute(['nationalId', 'employmentId']),
  (req, res) => {
    res.json({
      message: 'Access granted to users with required KYC attributes.',
    });
  }
);
```

---

### Sample Workflow Summary

1. **User Registration**:

   - A new user registers and selects a role (e.g., `Individual`, `Admin`, `Business`).
   - A KYC profile is created with the necessary attributes based on the user's role.

2. **KYC Information Submission**:

   - The user submits KYC attributes (e.g., National ID, Passport number) based on their role.

3. **Verification**:

   - The system or admin verifies the submitted KYC attributes, updating the KYC status to `verified` or `rejected`.

4. **Role-Based Access**:
   - Middleware checks (e.g., `checkKycStatus`, `checkKycAttribute`) enforce that users meet the required KYC status and possess necessary attributes for accessing specific services.

---

### Example Scenarios

**1. Admin accessing sensitive route with role and attribute checks**

- **Required**: `verified` KYC status, `nationalId`, and `employmentId`.
- **Scenario**: An admin tries to access `/api/admin-route`.
  - If all conditions are met, access is granted.
  - If missing `employmentId`, access is denied.

**2. Business accessing tax-related route**

- \*\*

Required\*\*: `verified` KYC status and `taxId`.

- **Scenario**: A business user tries to access `/api/business-taxes`.
  - If `taxId` is missing, the middleware denies access.

---

### Conclusion

This KYC documentation provides clear requirements for user verification based on roles, with sample API endpoints, middleware enforcement, and data flow for common scenarios. By structuring the KYC process around user roles and specific attributes, the system can efficiently ensure compliance and secure access to sensitive resources.
