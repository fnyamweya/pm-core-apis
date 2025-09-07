# **Audit Trail Developer Documentation**

The `Audit Trail` provides structured logging of actions and events within the application, enabling auditing, tracking, diagnostics, and compliance. This module is built on Elasticsearch for efficient indexing and querying of log data. It includes a reusable `auditTrail` utility that simplifies the process of logging key actions, tracking data changes, and capturing error details.

---

## **1. Overview**

The `Audit Trail` records significant user actions and system events, storing each entry with essential fields like `userId`, `action`, `timestamp`, and `status`. These records support flexible querying, filtering, and aggregation for compliance and reporting.

The `auditTrail` utility abstracts logging logic, allowing developers to log actions with consistency and minimal setup. Each action, whether successful or failed, is captured in a structured format, which includes details of changes between states when applicable.

---

## **2. Elasticsearch Client Setup**

The `Audit Trail` uses an Elasticsearch client managed by `ElasticsearchClientManager`. This client handles connection, retry, and error management, with configuration loaded from environment variables.

### **Configuration**

To configure the Elasticsearch client, set the following environment variables:

- **`ES_URL`**: URL of the Elasticsearch instance.
- **`ES_USERNAME`** and **`ES_PASSWORD`**: Authentication credentials.
- **`ES_MAX_RETRIES`**, **`ES_REQUEST_TIMEOUT`**, and **`ES_SNIFF_INTERVAL`**: Additional connection settings.
- **`ES_USE_SSL`**: Boolean indicating if SSL should be used.

> **Example Configuration (.env)**:
>
> ```plaintext
> ES_URL=http://elasticsearch:9200
> ES_USERNAME=elastic
> ES_PASSWORD=yourpassword
> ES_USE_SSL=false
> ```

### **Client Initialization**

Initialize the Elasticsearch client with:

```typescript
import { elasticsearchManager } from './config/elasticsearchClient';

await elasticsearchManager.initialize();
```

This setup ensures that the application can log data into Elasticsearch with fault tolerance and retry logic.

---

## **3. Structure of an Audit Log Entry**

Each audit log entry is structured with fields that provide context and details about the event, allowing for a consistent and complete audit trail.

### **Key Fields in an Audit Log Entry**

- **`userId`**: ID of the user initiating the action.
- **`targetId`**: ID of the resource or user affected by the action.
- **`action`**: Identifier for the type of action (e.g., `USER_UPDATE`, `USER_DELETE`).
- **`timestamp`**: ISO timestamp of when the action occurred.
- **`status`**: Result of the action (`success` or `failure`).
- **`severity`**: Importance level of the action (`low`, `medium`, `high`, `critical`).
- **`environment`**: Execution environment (`production`, `development`).
- **`details`**: Additional metadata or information about the event (e.g., IP address, user agent).
- **`changes`**: Detailed record of changes, capturing the `previous` and `updated` states for each affected field.
- **`correlationId`**: Unique identifier for correlating related actions across logs.

### **Example Audit Log Entry**

For an action like updating a user’s email, the audit log might look like this:

```json
{
  "userId": "5af7672c-1702-4638-a536-81404431a49e",
  "targetId": "5af7672c-1702-4638-a536-81404431a49e",
  "action": "USER_UPDATE",
  "timestamp": "2024-11-14T09:55:47.757Z",
  "status": "success",
  "severity": "medium",
  "environment": "development",
  "details": {
    "description": "User updated successfully"
  },
  "changes": {
    "email": {
      "previous": "old-email@example.com",
      "updated": "new-email@example.com"
    },
    "phone": {
      "previous": "1234567890",
      "updated": "0987654321"
    }
  },
  "correlationId": "update-5af7672c-1702-4638-a536-81404431a49e-1731578147755"
}
```

---

## **4. Using the Audit Trail Utility**

The `auditTrail` utility simplifies audit logging by providing a reusable function to log actions with configurable severity, status, and detailed change tracking.

### **Setting up the Audit Logger**

1. **Import the `auditTrail` Utility**: Use the `createAuditLogger` function from `auditTrail`.
2. **Define a Default Severity Level**: Set a default severity level to avoid specifying it each time.

```typescript
import { createAuditLogger } from '../../utils/auditTrail';
import { AuditSeverity } from '../../constants/auditTrail/auditTrailConstants';

const auditLogger = createAuditLogger({ severity: AuditSeverity.MEDIUM });
```

### **Logging Actions with the Audit Logger**

The `auditLogger` function takes in the following parameters:

- **`action`**: Action identifier (e.g., `USER_UPDATE`, `USER_DELETE`).
- **`userId`**: ID of the user performing the action.
- **`targetId`**: ID of the target entity affected.
- **`previousData`**: The state of data before the action, as a `Record<string, unknown>`.
- **`newData`**: The state of data after the action, as a `Record<string, unknown>`.
- **`config`**: Optional configuration for additional details, status, or severity.

Example of using `auditLogger` to log an update action:

```typescript
await auditLogger(
  'USER_UPDATE',
  userId,
  targetId,
  previousData as Record<string, unknown>,
  updatedData as Record<string, unknown>,
  { status: AuditStatus.SUCCESS }
);
```

---

## **5. Implementing the Audit Trail in Services and Controllers**

The audit trail can be integrated within both services and controllers to record significant actions.

### **Service Layer Example**

In a service function, use the `auditLogger` to log actions like updates with details on changes between the previous and updated data.

```typescript
import { auditLogger } from './services/auditTrailService';

async function updateUser(userId: string, updateData: any) {
  try {
    const previousData = await userService.getUserById(userId);
    const updatedUser = await userService.updateUser(userId, updateData);

    await auditLogger(
      'USER_UPDATE',
      userId,
      updatedUser.id,
      previousData as Record<string, unknown>,
      updateData as Record<string, unknown>,
      { status: AuditStatus.SUCCESS }
    );

    return updatedUser;
  } catch (error) {
    await auditLogger(
      'USER_UPDATE',
      userId,
      userId,
      previousData as Record<string, unknown>,
      {},
      {
        status: AuditStatus.FAILURE,
        details: { error: (error as Error).message },
      }
    );

    throw error;
  }
}
```

### **Controller Layer Example**

In a controller, log actions directly in endpoint handlers, capturing both successful and failed attempts.

```typescript
import { Request, Response } from 'express';
import userService from '../services/userService';
import { auditLogger } from '../services/auditTrailService';

export async function updateUser(req: Request, res: Response) {
  const { userId } = req.params;
  const updateData = req.body;

  try {
    const previousData = await userService.getById(userId);
    const updatedUser = await userService.updateUser(userId, updateData);

    await auditLogger(
      'USER_UPDATE',
      req.user.id,
      userId,
      previousData as Record<string, unknown>,
      updateData as Record<string, unknown>,
      { status: AuditStatus.SUCCESS }
    );

    res.json({ message: 'User updated successfully', updatedUser });
  } catch (error) {
    await auditLogger(
      'USER_UPDATE',
      req.user.id,
      userId,
      updateData as Record<string, unknown>,
      {},
      {
        status: AuditStatus.FAILURE,
        details: { error: error.message },
      }
    );

    res.status(500).json({ error: 'Failed to update user' });
  }
}
```

---

## **6. Querying the Audit Trail Logs**

### **Supported Query Types**

1. **Exact Match Queries**: Using `term` with `.keyword` for fields like `action`.
2. **Range Queries**: Useful for filtering logs by date (e.g., `timestamp`).
3. **Aggregation Queries**: Counting occurrences or grouping by fields.
4. **Sorting**: Order results by `timestamp` or other criteria.

### **Example Queries**

#### **1. Exact Match Query on `action`**

To retrieve logs for a specific action, use the `keyword` subfield:

```json
GET audit-trail/_search
{
  "query": {
    "term": { "action.keyword": "USER_UPDATE" }
  }
}
```

#### **2. Range Query on `timestamp`**

Filter logs within a specific date range:

```json
GET audit-trail/_search


{
  "query": {
    "range": {
      "timestamp": {
        "gte": "2024-11-01T00:00:00Z",
        "lte": "2024-11-14T23:59:59Z"
      }
    }
  }
}
```

#### **3. Combined Action and Date Range Query**

Retrieve logs for a specific action within a recent date range:

```json
GET audit-trail/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "action.keyword": "USER_UPDATE" }},
        { "range": { "timestamp": { "gte": "now-7d/d", "lte": "now/d" }}}
      ]
    }
  }
}
```

#### **4. Aggregation Query for Action Counts**

Count occurrences of each action type in the logs:

```json
GET audit-trail/_search
{
  "size": 0,
  "aggs": {
    "action_counts": {
      "terms": {
        "field": "action.keyword"
      }
    }
  }
}
```

#### **5. Daily Histogram Aggregation for Actions**

Get daily counts of `USER_UPDATE` actions over time:

```json
GET audit-trail/_search
{
  "size": 0,
  "query": {
    "term": { "action.keyword": "USER_UPDATE" }
  },
  "aggs": {
    "daily_actions": {
      "date_histogram": {
        "field": "timestamp",
        "calendar_interval": "day"
      }
    }
  }
}
```

#### **6. Sorting Results by `timestamp`**

Sort logs by `timestamp` in descending order:

```json
GET audit-trail/_search
{
  "query": {
    "match_all": {}
  },
  "sort": [
    { "timestamp": { "order": "desc" } }
  ]
}
```

---

## **7. Best Practices**

- **Use `.keyword` for Exact Matches**: Use `.keyword` for exact matches on fields like `action` and `status`.
- **Consistent Naming**: Define standard actions (`USER_UPDATE`, `USER_DELETE`) to simplify querying.
- **Use `changes` Field for Tracking**: Log detailed changes to capture the `previous` and `updated` values, especially for sensitive fields.
- **Optimize Queries**: For large datasets, paginate results, and use aggregation queries thoughtfully.
