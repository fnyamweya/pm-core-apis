### KYC Docs

#### Create a new KYC template

**Endpoint:** `POST /kyc/templates`

**Description:** Create a new KYC template.

**Access:** Private (requires authentication and authorization)

**Request Body:**

```json
{
  "key": "registration_number",
  "description": "Company registration number.",
  "role": {
    "id": "1"
  },
  "organizationType": {
    "id": "1"
  }
}
```

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "description": "Company registration number.",
  "role": {
    "id": "1",
    "name": "Admin",
    "description": "Administrator role with full access.",
    "isActive": true
  },
  "organizationType": {
    "id": "1",
    "name": "Tech Company",
    "description": "Companies involved in technology and software development.",
    "isActive": true
  }
}
```

#### Update an existing KYC template by ID

**Endpoint:** `PUT /kyc/templates/:id`

**Description:** Update an existing KYC template by ID.

**Access:** Private (requires authentication and authorization)

**Request Body:**

```json
{
  "description": "Updated company registration number."
}
```

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "description": "Updated company registration number.",
  "role": {
    "id": "1",
    "name": "Admin",
    "description": "Administrator role with full access.",
    "isActive": true
  },
  "organizationType": {
    "id": "1",
    "name": "Tech Company",
    "description": "Companies involved in technology and software development.",
    "isActive": true
  }
}
```

#### Retrieve all KYC templates with optional pagination

**Endpoint:** `GET /kyc/templates`

**Description:** Retrieve all KYC templates with optional pagination.

**Access:** Public

**Query Parameters:**

- `page` (optional): Page number for pagination.
- `limit` (optional): Number of items per page.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "key": "registration_number",
      "description": "Company registration number.",
      "role": {
        "id": "1",
        "name": "Admin",
        "description": "Administrator role with full access.",
        "isActive": true
      },
      "organizationType": {
        "id": "1",
        "name": "Tech Company",
        "description": "Companies involved in technology and software development.",
        "isActive": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### Retrieve a KYC template by ID

**Endpoint:** `GET /kyc/templates/:id`

**Description:** Retrieve a KYC template by ID.

**Access:** Public

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "description": "Company registration number.",
  "role": {
    "id": "1",
    "name": "Admin",
    "description": "Administrator role with full access.",
    "isActive": true
  },
  "organizationType": {
    "id": "1",
    "name": "Tech Company",
    "description": "Companies involved in technology and software development.",
    "isActive": true
  }
}
```

#### Retrieve a KYC template by key

**Endpoint:** `GET /kyc/templates/key`

**Description:** Retrieve a KYC template by key.

**Access:** Public

**Query Parameters:**

- `key`: The key of the KYC template.

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "description": "Company registration number.",
  "role": {
    "id": "1",
    "name": "Admin",
    "description": "Administrator role with full access.",
    "isActive": true
  },
  "organizationType": {
    "id": "1",
    "name": "Tech Company",
    "description": "Companies involved in technology and software development.",
    "isActive": true
  }
}
```

#### Delete a KYC template by ID

**Endpoint:** `DELETE /kyc/templates/:id`

**Description:** Delete a KYC template by ID.

**Access:** Private (requires authentication and authorization)

**Response:**

```json
{
  "message": "KYC template deleted successfully."
}
```

### KYC Attribute Routes

#### Create a new KYC attribute

**Endpoint:** `POST /kyc/attributes`

**Description:** Create a new KYC attribute.

**Access:** Private (requires authentication and authorization)

**Request Body:**

```json
{
  "key": "registration_number",
  "value": "123456789",
  "kycProfileOrganization": {
    "id": 1
  }
}
```

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "value": "123456789",
  "kycProfileOrganization": {
    "id": 1,
    "organization": {
      "id": "1",
      "name": "TechCorp"
    }
  }
}
```

#### Update an existing KYC attribute by ID

**Endpoint:** `PUT /kyc/attributes/:id`

**Description:** Update an existing KYC attribute by ID.

**Access:** Private (requires authentication and authorization)

**Request Body:**

```json
{
  "value": "987654321"
}
```

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "value": "987654321",
  "kycProfileOrganization": {
    "id": 1,
    "organization": {
      "id": "1",
      "name": "TechCorp"
    }
  }
}
```

#### Retrieve all KYC attributes with optional pagination

**Endpoint:** `GET /kyc/attributes`

**Description:** Retrieve all KYC attributes with optional pagination.

**Access:** Public

**Query Parameters:**

- `page` (optional): Page number for pagination.
- `limit` (optional): Number of items per page.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "key": "registration_number",
      "value": "123456789",
      "kycProfileOrganization": {
        "id": 1,
        "organization": {
          "id": "1",
          "name": "TechCorp"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### Retrieve a KYC attribute by ID

**Endpoint:** `GET /kyc/attributes/:id`

**Description:** Retrieve a KYC attribute by ID.

**Access:** Public

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "value": "123456789",
  "kycProfileOrganization": {
    "id": 1,
    "organization": {
      "id": "1",
      "name": "TechCorp"
    }
  }
}
```

#### Retrieve a KYC attribute by key

**Endpoint:** `GET /kyc/attributes/key`

**Description:** Retrieve a KYC attribute by key.

**Access:** Public

**Query Parameters:**

- `key`: The key of the KYC attribute.

**Response:**

```json
{
  "id": 1,
  "key": "registration_number",
  "value": "123456789",
  "kycProfileOrganization": {
    "id": 1,
    "organization": {
      "id": "1",
      "name": "TechCorp"
    }
  }
}
```

#### Delete a KYC attribute by ID

**Endpoint:** `DELETE /kyc/attributes/:id`

**Description:** Delete a KYC attribute by ID.

**Access:** Private (requires authentication and authorization)

**Response:**

```json
{
  "message": "KYC attribute deleted successfully."
}
```

### KYC Profile Routes

#### Create a new KYC profile

**Endpoint:** `POST /kyc/profiles`

**Description:** Create a new KYC profile.

**Access:** Private (requires authentication and authorization)

**Request Body:**

```json
{
  "organization": {
    "id": "1"
  },
  "kycAttributes": [
    {
      "key": "registration_number",
      "value": "123456789"
    }
  ]
}
```

**Response:**

```json
{
  "id": 1,
  "organization": {
    "id": "1",
    "name": "TechCorp"
  },
  "kycAttributes": [
    {
      "id": 1,
      "key": "registration_number",
      "value": "123456789"
    }
  ]
}
```

#### Update an existing KYC profile by ID

**Endpoint:** `PUT /kyc/profiles/:id`

**Description:** Update an existing KYC profile by ID.

**Access:** Private (requires authentication and authorization)

**Request Body:**

```json
{
  "kycAttributes": [
    {
      "key": "registration_number",
      "value": "987654321"
    }
  ]
}
```

**Response:**

```json
{
  "id": 1,
  "organization": {
    "id": "1",
    "name": "TechCorp"
  },
  "kycAttributes": [
    {
      "id": 1,
      "key": "registration_number",
      "value": "987654321"
    }
  ]
}
```

#### Retrieve all KYC profiles with optional pagination

**Endpoint:** `GET /kyc/profiles`

**Description:** Retrieve all KYC profiles with optional pagination.

**Access:** Public

**Query Parameters:**

- `page` (optional): Page number for pagination.
- `limit` (optional): Number of items per page.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "organization": {
        "id": "1",
        "name": "TechCorp"
      },
      "kycAttributes": [
        {
          "id": 1,
          "key": "registration_number",
          "value": "123456789"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### Retrieve a KYC profile by ID

**Endpoint:** `GET /kyc/profiles/:id`

**Description:** Retrieve a KYC profile by ID.

**Access:** Public

**Response:**

```json
{
  "id": 1,
  "organization": {
    "id": "1",
    "name": "TechCorp"
  },
  "kycAttributes": [
    {
      "id": 1,
      "key": "registration_number",
      "value": "123456789"
    }
  ]
}
```

#### Retrieve KYC profiles by user ID

**Endpoint:** `GET /kyc/profiles/user`

**Description:** Retrieve KYC profiles by user ID.

**Access:** Public

**Query Parameters:**

- `userId`: The ID of the user.

**Response:**

```json
[
  {
    "id": 1,
    "user": {
      "id": "1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "kycAttributes": [
      {
        "id": 1,
        "key": "passport_number",
        "value": "AB123456"
      }
    ]
  }
]
```

#### Retrieve KYC profiles by organization ID

**Endpoint:** `GET /kyc/profiles/organization`

**Description:** Retrieve KYC profiles by organization ID.

**Access:** Public

**Query Parameters:**

- `organizationId`: The ID of the organization.

**Response:**

```json
[
  {
    "id": 1,
    "organization": {
      "id": "1",
      "name": "TechCorp"
    },
    "kycAttributes": [
      {
        "id": 1,
        "key": "registration_number",
        "value": "123456789"
      }
    ]
  }
]
```

#### Delete a KYC profile by ID

**Endpoint:** `DELETE /kyc/profiles/:id`

**Description:** Delete a KYC profile by ID.

**Access:** Private (requires authentication and authorization)

**Response:**

```json
{
  "message": "KYC profile deleted successfully."
}
```
