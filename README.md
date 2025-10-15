[![CircleCI](https://circleci.com/gh/elasticio/salesforce-component-v2.svg?style=svg&circle-token=4407ac16eb7e472a4533a176ca180c2c89d41777)](https://circleci.com/gh/elasticio/salesforce-component-v2)
# Salesforce Component
## Table of Contents

* [General Information](#general-information)
   * [Description](#description)
   * [Completeness Matrix](#completeness-matrix)
   * [API Version](#api-version)
   * [Environment Variables](#environment-variables)
* [Credentials](#credentials)
* [Triggers](#triggers)
   * [Get Updated Objects Polling](#get-updated-objects-polling)
   * [Query Trigger](#query-trigger)
   * [Subscribe to Platform Events (Real-time Flows Only)](#subscribe-to-platform-events-real-time-flows-only)
   * [Subscribe to Pub/Sub Events](#subscribe-to-pubsub-events)
   * [Deprecated Triggers](#deprecated-triggers)
* [Actions](#actions)
   * [Bulk Create/Update/Delete/Upsert](#bulk-createupdatedeleteupsert)
   * [Bulk Query](#bulk-query)
   * [Create Object](#create-object)
   * [Delete Object (at most 1)](#delete-object-at-most-1)
   * [Lookup Object (at most 1)](#lookup-object-at-most-1)
   * [Lookup Objects](#lookup-objects)
   * [Query Action](#query-action)
   * [Raw Request](#raw-request)
   * [Upsert Object](#upsert-object)
* [Permissions](#permissions)
* [Known Limitations](#known-limitations)

## General Information
### Description
An [elastic.io](http://www.elastic.io;) component for seamless integration with the Salesforce REST API, enabling you to trigger flows based on Salesforce data and perform various actions.

### Completeness Matrix
![Salesforce-component Completeness Matrix](https://user-images.githubusercontent.com/16806832/93742890-972ca200-fbf7-11ea-9b7c-4a0aeff1c0fb.png)

[Salesforce-component Completeness Matrix](https://docs.google.com/spreadsheets/d/1_4vvDLdQeXqs3c8OxFYE80CvpeSC8e3Wmwl1dcEGO2Q/edit?usp=sharing)

### API Version
The component uses Salesforce API Version 46.0 by default, but this can be overridden by the environment variable `SALESFORCE_API_VERSION`.

### Environment Variables
| Name                   | Mandatory | Description                                                              | Values                   |
|------------------------|-----------|--------------------------------------------------------------------------|--------------------------|
| `SALESFORCE_API_VERSION` | No        | Overrides the default Salesforce API version.                            | Default: `46.0`          |
| `REFRESH_TOKEN_RETRIES`  | No        | The number of retries to refresh a token before throwing an error.       | Default: `10`            |
| `HASH_LIMIT_TIME`        | No        | Cache expiration time in milliseconds for `Lookup` actions.              | Default: `600000`        |
| `HASH_LIMIT_ELEMENTS`    | No        | The maximum number of entries in the cache for `Lookup` actions.         | Default: `10`            |
| `UPSERT_TIME_OUT`        | No        | Timeout for the `Upsert Object` action in milliseconds.                  | Default: `120000` (2min) |

## Credentials
Authentication occurs via OAuth 2.0.

To use OAuth 2.0, you must create a **Connected App** in your Salesforce instance. During the app creation process, you will be asked to specify a **Callback URL**. To process OAuth authentication via the elastic.io platform, your callback URL should be in the format `https://your-tenant.elastic.io/callback/oauth2`.

More information can be found in the official [Salesforce documentation](https://help.salesforce.com/apex/HTViewHelpDoc?id=connected_app_create.htm).

To create credentials in the elastic.io platform:

1.  Select an existing Auth Client from the **Choose Auth Client** dropdown or create a new one. To create a new Auth Client, specify the following fields:

    | Field Name             | Mandatory | Description                                                                                                                                                                                       |
    |------------------------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | Name                   | Yes       | A name for your Auth Client.                                                                                                                                                                      |
    | Client ID              | Yes       | Your Connected App's Consumer Key.                                                                                                                                                                |
    | Client Secret          | Yes       | Your Connected App's Consumer Secret.                                                                                                                                                              |
    | Authorization Endpoint | Yes       | Your OAuth authorization endpoint. For production, use `https://login.salesforce.com/services/oauth2/authorize`. For sandboxes, use `https://test.salesforce.com/services/oauth2/authorize`.    |
    | Token Endpoint         | Yes       | Your OAuth token endpoint for refreshing access tokens. For production, use `https://login.salesforce.com/services/oauth2/token`. For sandboxes, use `https://test.salesforce.com/services/oauth2/token`. |

2.  Provide a name for your credential in the **Name Your Credential** field.
3.  Click **Authenticate**. If you are not already logged into Salesforce, a login window will appear. Please enter your credentials.
4.  Click **Verify** to confirm the credentials are working.
5.  Click **Save** to save your credentials.

> **Please Note:** Salesforce migrations or any changes that affect endpoints, single sign-on (SSO), OAuth, or other connections can lead to unpredictable behavior and authentication issues. To avoid this, you must create new credentials after making such changes. Once the new credentials are created and verified, the old ones can be safely removed.

## Triggers

### Get Updated Objects Polling
Polls for objects that have been created or updated within a given time frame.

#### Configuration Fields
* **Object Type** (dropdown, required): The type of Salesforce object to be fetched.
* **Selected Fields** (multiselect, optional): A list of fields to be returned in the response. If left empty, all fields will be returned. Selecting only the necessary fields can prevent [431 and 414 Errors](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_api.htm).
* **Include linked objects** (multiselect, optional): A list of related child and parent objects to be join-queried and included in the response. List entries are given as `Object Name/Reference To (Relationship Name)`.
* **Emit behavior** (dropdown, required): Choose to emit objects `Individually` or as a single `Fetch page`.
* **Start Time** (string, optional): The beginning of the time window to retrieve objects from, in ISO 8601 format (`YYYY-MM-DDThh:mm:ssZ`). Defaults to the beginning of time (`1970-01-01T00:00:00.000Z`).
* **End Time** (string, optional): If provided, the trigger will not fetch records modified after this time. Must be in ISO 8601 format.
* **Size of Polling Page** (integer, optional): The maximum number of records to fetch per page. Defaults to `10000`.
* **Process Single Page Per Execution** (checkbox, optional): If checked, the trigger will process only one page of results per flow execution. If unchecked, it will retrieve all pages in a single execution.

#### Required Permissions
Due to the trigger's use of keyset pagination for reliability, the user profile for the credential must have **read access** (Field-Level Security) to the `Id` and `LastModifiedDate` fields for the object being polled. Without these permissions, the trigger will fail.

#### Output Metadata
*   **For `Fetch page`:** An object with a `results` property, which contains an array of records.
*   **For `Emit Individually`:** Each record is emitted as a separate message.

### Limitations
*   When a binary field (primitive type `base64`, e.g., in Documents or Attachments) is selected via **Include linked objects**, an error will be thrown: `MALFORMED_QUERY: Binary fields cannot be selected in join queries.` Instead of querying these as linked objects, query them directly.
*   There is a limit to the number of linked objects that can be queried at once. Beyond two or three (depending on the number of fields), Salesforce may return a `431` or `414` error, indicating the query is too long.
*   Due to a known issue with multiselect dropdowns, it is recommended to deselect all items in the **Include linked objects** field before changing the **Object Type**.

### Query Trigger
Executes a user-defined SOQL query during each polling interval to fetch records.

Use the Salesforce Object Query Language (SOQL) to search your organization’s Salesforce data for specific information. SOQL is similar to the `SELECT` statement in SQL but is designed specifically for Salesforce data.

#### Configuration Fields
*   **SOQL Query** (string, required): The SOQL query to execute.
*   **Output method** (dropdown, optional): `Emit all` emits all found records in a single message with a `records` array. `Emit individually` emits each record as a separate message. Defaults to `Emit individually`.
*   **Don't emit on empty results** (checkbox, optional): If selected, the component will not produce an empty message if the query returns no results.

### Subscribe to Platform Events (Real-time Flows Only)
Subscribes to a specified Platform Event using the Salesforce Streaming API.

#### How to Create a Platform Event
In Salesforce, navigate to `Setup --> Integrations --> Platform Events --> New Platform Event`.

![Screenshot from 2019-03-11 11-51-10](https://user-images.githubusercontent.com/13310949/54114889-1088e900-43f4-11e9-8b49-3a8113b6577d.png)

For more details, see the [Platform Events Intro Documentation](https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/platform_events_intro.htm).

#### Configuration Fields
*   **Event object name** (dropdown, required): The name of the Platform Event to subscribe to (e.g., `My_Platform_Event__e`).

#### Limitations
*   **This trigger is designed for Real-time flows only** and is not supported in Ordinary flows.
*   Due to Salesforce API limitations, the trigger does not queue messages while the flow is in a `SUSPEND` state. To resume processing messages, you must manually trigger the flow with the **Run Now** action after it resumes.

### Subscribe to Pub/Sub Events
Subscribes to a specified Platform Event using the Salesforce Pub/Sub API.

#### Configuration Fields
*   **Event object name** (dropdown, required): The name of the Platform Event to subscribe to.
*   **Pub/Sub API Endpoint** (string, optional): The Pub/Sub API endpoint. If left blank, it defaults to `api.pubsub.salesforce.com:7443`. For more details, see the [Pub/Sub API Endpoints documentation](https://developer.salesforce.com/docs/platform/pub-sub-api/guide/pub-sub-endpoints.html).
*   **Number of events per request** (integer, optional): The maximum number of events to retrieve in a single batch. A larger batch size may improve performance, but setting it too high can cause memory errors. Defaults to `10` (max `100`).
*   **Start from Replay ID** (integer, optional): A specific Replay ID to start the event stream from. This is only used for the first execution. Subsequent executions will automatically use the Replay ID from the last processed event.

#### Output Metadata
*   **event**: An object containing the `replayId` of the message.
*   **payload**: An object containing the dynamically generated content of the event.

#### Limitations
*   The component begins tracking changes after the first execution. You must run the flow once (either manually or on its schedule) to establish the connection before events will be detected.
*   If you are using an **Ordinary (polling) flow**, you must ensure it executes at least once every 3 days, as Salesforce retains events for a maximum of 72 hours.
*   To retrieve a new sample, you must trigger an event in Salesforce or provide a sample manually.

### Deprecated Triggers

<details>
  <summary>Get New and Updated Objects Polling (Legacy)</summary>

This trigger is deprecated and will be removed in a future version. Please use the current **Get Updated Objects Polling** trigger.

</details>

## Actions

### Bulk Create/Update/Delete/Upsert
Uses the Bulk API 2.0 to quickly load large amounts of data (up to 10,000 records) from a CSV file into Salesforce. This action takes a CSV file from an attachment as input. The required CSV format is described in the [Salesforce documentation](https://developer.salesforce.com/docs/atlas.en-us.api_bulk_v2.meta/api_bulk_v2/datafiles.htm).

#### Configuration Fields
*   **Operation** (dropdown, required): The bulk operation to perform: `Create`, `Update`, `Upsert`, or `Delete`.
*   **Object** (dropdown, required): The type of object to perform the bulk operation on (e.g., `Case`).
*   **Timeout** (integer, optional): The maximum time in seconds to wait for the server to complete the bulk operation. Defaults to `600`.

#### Input Metadata
*   **External ID Field**: For the `Upsert` operation, specify the name of the External ID field (e.g., `my_external_id__c`).

#### Output Metadata
The action outputs a message with a `result` property, which is an array of objects. Each object in the array represents the outcome for a record and contains the following fields:
*   **id**: The Salesforce ID of the object.
*   **success**: A boolean indicating if the operation was successful (`true` or `false`).
*   **errors**: An array containing error descriptions if the operation failed.

#### Limitations
*   The action does not throw an error for failed records. You must check the `success` field in the output to identify failures.
*   An `Object ID` is required for `Update` and `Delete` operations.
*   An `External ID` is required for the `Upsert` operation.
*   Salesforce processes a maximum of 10,000 records from the input CSV file per operation.

### Bulk Query
Fetches a large number of records using a SOQL query and streams the result as a CSV file in an attachment.

#### Input Metadata
*   **SOQL Query** (string, required): The SOQL query to execute (e.g., `SELECT Id, Name from Contact`).

### Create Object
Creates a single new object in Salesforce.

**Note:** To create an `Attachment`, you must provide the file content as a base64-encoded string in the `Body` field. The `ParentId` must be the Salesforce ID of the object (e.g., Account, Lead) the attachment will be associated with.

#### Configuration Fields
*   **Object** (dropdown, required): The type of object to create (e.g., `Account`).
*   **Utilize data attachment from previous step...**: If checked, and if an attachment is present in the input message, the component will use the attachment data for any binary field (e.g., the `Body` of a `Document`).

#### Input/Output Metadata
This action dynamically retrieves all available fields for the chosen object type. The output metadata will mirror the input metadata.

#### Limitations
*   When **Utilize data attachment...** is checked, this action may fail if used with a Local Agent due to networking constraints.

### Delete Object (at most 1)
Deletes a single object found by a specified field and value.

#### Configuration Fields
*   **Object** (dropdown, required): The type of object to delete.
*   **Type Of Search** (dropdown, required): Choose to look up the object by `Unique Fields` or `All Fields`.
*   **Lookup by field** (dropdown, required): The field to use for the lookup.

#### Input Metadata
The input metadata is dynamically generated based on the **Lookup by field**.

#### Output Metadata
*   **id**: The Salesforce ID of the deleted object.
*   **success**: A boolean indicating if the operation was successful.
*   **errors**: An array of errors if the operation failed.

### Lookup Object (at most 1)
Looks up a single object by a specified field and value.

#### Configuration Fields
*   **Object** (dropdown, required): The type of object to look up.
*   **Type Of Search** (dropdown, required): Choose to look up the object by `Unique Fields` or `All Fields`.
*   **Lookup by field** (dropdown, required): The field to use for the lookup.
*   **Include referenced objects** (multiselect, optional): A list of related objects to include in the result.
*   **Allow criteria to be omitted** (checkbox, optional): If checked, an empty object will be returned if the lookup criteria is missing from the input.
*   **Allow zero results** (checkbox, optional): If checked, an empty object will be returned if no matching record is found.
*   **Pass binary data to the next component...**: If checked, and if the found object contains a binary field, its data will be passed as an attachment.
*   **Enable Cache Usage** (checkbox, optional): Enables caching for this action.

#### Limitations
1.  Selecting a binary field (e.g., in Documents or Attachments) under **Include referenced objects** will cause a `MALFORMED_QUERY` error.
2.  The action does not support looking up objects where the lookup field value is `null`.
3.  Passing binary data as an attachment may fail if used with a Local Agent.

### Lookup Objects
Looks up a list of objects that satisfy the specified criteria.

#### Configuration Fields
*   **Object** (dropdown, required): The type of object to look up.
*   **Include deleted** (checkbox, optional): If checked, deleted records will be included in the results.
*   **Output method** (dropdown, required): Choose to `Emit all`, `Emit page`, or `Emit individually`.
*   **Number of search terms** (integer, required): The number of filter conditions to apply (0-99).
*   **Enable Cache Usage** (checkbox, optional): Enables caching for this action.
*   **Max Fetch Count** (integer, optional): The maximum number of records to fetch. Defaults to `1000`.

#### Input Metadata
The input metadata changes based on the **Output method** and the **Number of search terms**.

#### Output Metadata
An object with a `results` property, which contains an array of found objects.

### Query Action
Executes a SOQL query.

#### Configuration Fields
*   **Optional batch size** (integer, optional): If specified, results will be emitted in arrays of this size. If empty, results are emitted one-by-one.
*   **Allow all results to be returned in a set** (checkbox, optional): If checked, all results are returned in a single array, ignoring batch size.
*   **Include deleted** (checkbox, optional): If checked, deleted records will be included in the results.
*   **Max Fetch Count** (integer, optional): The maximum number of records to fetch. Defaults to `1000`.

#### Input Metadata
*   **SOQL Query** (string, required): The SOQL query to execute.

### Raw Request
Executes a custom REST API call to a Salesforce endpoint.

#### Configuration Fields
*   **HTTP Verb** (dropdown, required): The HTTP method to use (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
*   **Path** (string, required): The URL path for the request. 
    *   For standard REST API calls, use a relative path (e.g., `query/?q=SELECT+Id,Name+FROM+Account`).
    *   For other services like Apex REST, provide the full URL.
*   **Request Body** (object, optional): The body to attach to the request.

#### Output Metadata
*   **Response Object**: The HTTP response body from the API call.

### Upsert Object
Creates a new object or updates an existing one.

#### Configuration Fields
*   **Object** (dropdown, required): The type of object to upsert.
*   **Type Of Search** (dropdown, required): The type of field to use for the lookup.
    *   `External IDs`: Uses Salesforce's native, high-performance upsert functionality based on an External ID field.
    *   `Unique Fields` or `All Fields`: The component will first look up an object. If one is found, it is updated. If none are found, a new one is created. If multiple are found, an error is thrown.
*   **Lookup by field** (dropdown, required): The field to use for the lookup, based on the **Type Of Search**.

#### Input Metadata
Dynamically generated based on the selected object and lookup field.

#### Output Metadata
*   **id**: The unique Salesforce identifier of the created or updated object.
*   **success**: A boolean indicating the result of the operation.
*   **errors**: An array of errors if the operation failed.

## Permissions
By default, certain user profiles in Salesforce have disabled permissions. To ensure an object is visible in the component's dropdowns, you may need to enable its standard object permissions.

To enable these permissions:

1.  Go to the Salesforce **Setup** page.
2.  Navigate to **Administration > Users > Profiles**.
3.  Select the profile that needs modification and click **Edit**.
4.  Under **Standard Object Permissions**, ensure the necessary permissions are enabled. For example, to use the **Get Updated Objects Polling** trigger, the `Read`, `Create`, and `Edit` permissions are typically required for the object.

<details>
  <summary>Salesforce Setup Page</summary>
  <img src="https://github.com/elasticio/salesforce-component-v2/assets/108279772/ad2b7d68-c843-4356-92b3-7650bab6a3f2" alt="Salesforce Setup Page">
</details>

<details>
  <summary>Standard Object Permissions</summary>
  <img src="https://github.com/elasticio/salesforce-component-v2/assets/108279772/f80445e4-098a-42cf-a728-6a204b8e7329" alt="Standard Object Permissions">
</details>

Carefully review and adjust the permissions to enable the required access.

## Known Limitations
*   The attachment mechanism does not work with a Local Agent installation.
