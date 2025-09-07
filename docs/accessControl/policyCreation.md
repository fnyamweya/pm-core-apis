### **Developer Guide for Writing Policies**

This guide is intended for developers who need to write and manage access control policies in YAML format based on the provided schema. It includes instructions, best practices, and examples.

---

### **Introduction**

Policies define access control rules for specific resources in your application. Each policy specifies actions, effects, and optional constraints like time, geography, and resource state. This guide will help you write policies that conform to the `Policy.schema.json`.

---

### **Schema Overview**

The schema has the following key components:

1. **Resource**: The target resource for the policies (e.g., "users", "documents").
2. **Version**: Schema version for policy management.
3. **Metadata**: Additional information about the policy set.
4. **Policies**: A list of policy objects specifying rules for access control.

---

### **Writing Policies**

#### **1. General Structure**

Each policy YAML file should follow this structure:

```yaml
resource: <resource-name> # e.g., "users" or "documents"
version: '1.0.0'
metadata:
  createdBy: <creator> # Name or identifier of the creator
  createdAt: <timestamp> # RFC3339 date-time format
  description: <details> # Brief description of the policy file

policies:
  - id: <unique-policy-id>
    action: <action-name> # Action being controlled (e.g., "create", "read", "update", "delete")
    effect: <effect> # One of ALLOW, DENY, LOG, NOTIFY, AUDIT
    priority: <priority> # Integer; higher numbers take precedence
    overrides: # Optional, list of policy IDs this policy overrides
      - <policy-id>
    validityPeriod: # Optional, define start and end times
      start: <start-time> # RFC3339 format (e.g., "2024-11-21T10:00:00Z")
      end: <end-time> # RFC3339 format
    timeConstraints: # Optional, specify active times
      daysOfWeek: # List of days
        - <day> # e.g., "Monday", "Tuesday"
      timeOfDay:
        start: <start-time> # Time-only, RFC3339 format (e.g., "09:00:00")
        end: <end-time> # Time-only
    geographicalConstraints: # Optional, restrict by location
      countries:
        - <country-code> # e.g., "US", "UK"
      regions:
        - <region-name> # e.g., "California"
    resourceStateConditions: # Optional, conditions based on resource state
      - state: <state>
        operator: <operator> # "equals", "notEquals"
        value: <value>
    customScript: <script> # Optional, custom logic for evaluation
    conditions: # Optional, basic conditions
      - attribute: <attribute-name>
        operator: <operator> # "equals", "greaterThan", etc.
        value: <value>
    nestedConditions: # Optional, complex conditions
      - logicalOperator: <AND/OR>
        conditions:
          - attribute: <attribute-name>
            operator: <operator>
            value: <value>
```

---

#### **2. Writing Metadata**

The `metadata` section helps document the policy file:

- **Example**:
  ```yaml
  metadata:
    createdBy: 'admin'
    createdAt: '2024-11-21T10:00:00Z'
    description: 'Policies for managing user resources.'
  ```

---

#### **3. Writing Policies**

Each policy defines the rules for a specific action on the resource.

**Key Fields**:

- **`id`**: Unique identifier for the policy.
- **`action`**: The controlled action (e.g., "create", "read", "update").
- **`effect`**: The outcome (e.g., "ALLOW", "DENY").
- **`priority`**: Determines precedence among policies (higher value = higher precedence).

**Example Policy**:

```yaml
- id: 'policy-1'
  action: create
  effect: ALLOW
  priority: 1
```

---

#### **4. Adding Constraints**

Policies can include constraints to refine access control.

**a. Validity Period**
Define when the policy is active:

```yaml
validityPeriod:
  start: '2024-11-21T10:00:00Z'
  end: '2024-12-31T23:59:59Z'
```

**b. Time Constraints**
Restrict access to specific days and times:

```yaml
timeConstraints:
  daysOfWeek:
    - Monday
    - Tuesday
  timeOfDay:
    start: '09:00:00'
    end: '17:00:00'
```

**c. Geographical Constraints**
Limit access by country or region:

```yaml
geographicalConstraints:
  countries:
    - US
    - UK
  regions:
    - California
    - London
```

**d. Resource State Conditions**
Control access based on the resource state:

```yaml
resourceStateConditions:
  - state: 'active'
    operator: equals
    value: 'true'
```

**e. Nested Conditions**
Combine multiple conditions with logical operators:

```yaml
nestedConditions:
  - logicalOperator: AND
    conditions:
      - attribute: department
        operator: equals
        value: 'HR'
      - attribute: role
        operator: equals
        value: 'manager'
```

---

#### **5. Writing Custom Scripts**

Add advanced logic for evaluation:

```yaml
customScript: "return user.role === 'admin';"
```

---

### **Examples**

#### **User Policy File (`users.yaml`)**

```yaml
resource: users
version: 1.0.0
metadata:
  createdBy: 'admin'
  createdAt: '2024-11-21T10:00:00Z'
  description: 'Policies for managing user resources.'

policies:
  - id: 'policy-1'
    action: create
    effect: ALLOW
    priority: 1
    validityPeriod:
      start: '2024-11-21T10:00:00Z'
      end: '2024-12-31T23:59:59Z'
    conditions: []
```

#### **Organization Policy File (`organizations.yaml`)**

```yaml
resource: organizations
version: 1.0.0
metadata:
  createdBy: 'admin'
  createdAt: '2024-11-21T10:00:00Z'
  description: 'Policies for managing organization resources.'

policies:
  - id: 'policy-1'
    action: update
    effect: ALLOW
    priority: 2
    conditions:
      - attribute: organization.type
        operator: equals
        value: 'non-profit'
```

---

### **Best Practices**

1. **Use Descriptive Metadata**: Always include meaningful `createdBy` and `description` fields for better documentation.
2. **Assign Unique IDs**: Ensure all policy IDs are unique across all resources.
3. **Test Policies**: Validate policies against the schema before deploying them.
4. **Keep Policies Minimal**: Write the simplest policy rules that fulfill the requirements.
5. **Use Overrides Carefully**: Specify `overrides` only when necessary to avoid confusion.

---

### **Validating Policies**

Use a validation script to ensure the YAML files conform to the schema.

```bash
npx ts-node validatePolicies.ts
```

**Expected Output**:

- ✅ If valid: `<file-path> is valid.`
- ❌ If invalid: Detailed validation errors.

---

### **Common Errors and Fixes**

| **Error**                  | **Cause**                           | **Fix**                           |
| -------------------------- | ----------------------------------- | --------------------------------- |
| `Missing property "id"`    | Policy ID is missing.               | Add a unique `id` for the policy. |
| `Invalid date-time format` | Date-time is not in RFC3339 format. | Use `YYYY-MM-DDTHH:mm:ssZ`.       |
| `Invalid time format`      | Time is not in RFC3339 time format. | Use `HH:mm:ss`.                   |
| `Unknown property "foo"`   | Unrecognized property in policy.    | Remove or update the property.    |

---

### **Conclusion**

This guide provides a comprehensive reference for writing and managing policies. Follow the structure, leverage constraints, and validate policies to ensure they align with your application requirements.
