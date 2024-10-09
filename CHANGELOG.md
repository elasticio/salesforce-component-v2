## 2.8.5 (October 09, 2024)
* Fixed issues in `Get New and Updated Objects Polling` trigger:
  * Emit only one batch of messages if results are more than 10000
  * Error `Cannot read properties of undefined (reading 'LastModifiedDate')` if you used and delete `Size of Polling Page` value

## 2.8.4 (July 11, 2024)
* Attempt to fix error `The Replay ID validation failed` when `Subscribe to PubSub` trigger does't emit messages more than three days
* Update Sailor version to 2.7.2
* Update component-commons-library version to 3.2.0

## 2.8.3 (February 27, 2024)
* The component interface has not changed. This is a technical enhancement! Introduced baseURL parameter in the `Raw Request` Action's configuration of the axios library. Refer to the [Readme](README.md#raw-request) for the details. 
It will not affect any of the existing integration. Instead, it gives more flexibility allowing to call other REST endpoints than the standard `/services/data` [(#82)](https://github.com/elasticio/salesforce-component-v2/issues/82)

## 2.8.2 (February 02, 2024)
* Fixed bug when component didn't use `replayId` after error in `Subscribe to PubSub` trigger

## 2.8.1 (December 28, 2023)
* Fixed duplicate retries and added exponential backoff in `Subscribe to PubSub` trigger

## 2.8.0 (December 21, 2023)
* Added new `Subscribe to PubSub` trigger

## 2.7.3 (November 09, 2023)
* Fixed [issue](https://github.com/elasticio/salesforce-component-v2/issues/72) when real-time flows have authentication errors sometimes

## 2.7.2 (September 28, 2023)
* Improvements in `Subscribe to platform events` trigger:
  * fixed duplicates retries on connections lost
  * fixed incorrect behavior with AuthFailure

## 2.7.1 (September 21, 2023)
* Improvements in `Subscribe to platform events` trigger:
  * Added retry on connections lost
  * Changed the behavior where new logs would appear in the first execution regardless of which message they belonged to. Now, all messages will be displayed in their appropriate execution
* Logs with `Going to fetch secret` set to debug level

## 2.7.0 (June 29, 2023)
Added support for  files attachment by providing a URL in the body for all actions where it is used

## 2.6.0 (June 09, 2023)
Added `Don't emit on empty results` checkbox in `Query` trigger

## 2.5.1 (January 31, 2023)
* Fixed [issue](https://github.com/elasticio/salesforce-component-v2/issues/59) with 431 and 414 errors in `Get Updated Objects Polling` trigger: new configuration field `Selected Fields` added

## 2.5.0 (January 13, 2023)
* Fixed issue with attachments in `Bulk Create/Update/Delete/Upsert` action
* Added ability to directly provide url to csv file in `Bulk Create/Update/Delete/Upsert` action
* Update Sailor version to 2.7.1
* Update component-commons-library version to 3.1.5

## 2.4.2 (November 18, 2022)
* Improved error handling in `Lookup Objects` action

## 2.4.1 (October 07, 2022)
* Fixed loop issue when records equal to `Size of Polling Page` and have same `LastModifiedDate` in `Get Updated Objects Polling` trigger
* Update Sailor version to 2.7.0

## 2.4.0 (August 30, 2022)
* New `Get New and Updated Objects Polling` trigger, old one set to deprecated
* Update Sailor version to 2.6.29
* Get rid of vulnerabilities in dependencies
* Update component-commons-library version to 3.0.2

## 2.3.0 (June 17, 2022)
* Added new `Type Of Search` - `External IDs` to `Upsert Object` action
* Implemented caching for metadata in `Upsert Object` action (metadata needs to find fields that contain attachment)
* Small fixes

## 2.2.4 (June 03, 2022)
* Added timeout for `Upsert Object` action

## 2.2.3 (April 14, 2022)
* Bump dependencies

## 2.2.2 (April 08, 2022)
* Implemented reconnect logic on errors
* Update Sailor version to 2.6.27
* Get rid of vulnerabilities in dependencies
* Add component pusher job to Circle.ci config


## 2.2.1 (December 1, 2021)

* Upgrade sailor version to 2.6.26
* Reduced the size of component icon file
* Fix output metadata for `Get New and Updated Objects Polling` trigger
* Fix output metadata for `Lookup Objects` action

## 2.2.0 (August 20, 2021)

* New `Upsert Object` action
* Old `Upsert Object` action is deprecated
* `Get New and Updated Objects Polling` trigger updated:
 - Default size of pages to be fetched changed from `1000` to `10000`
 - Restriction `maxFetch should be maximum 10000 objects` is removed

## 2.1.0 (August 10, 2021)

* New `Raw Request` action

## 2.0.4 (February 12, 2021)

* Update sailor version to 2.6.24

## 2.0.3 (November 18, 2020)

* Fix fields dependencies from sobject field in component.json, [issue 5](https://github.com/elasticio/salesforce-component-v2/issues/5)

## 2.0.2 (October 30, 2020)

* Update sailor version to 2.6.18

## 2.0.1 (October 23, 2020)

* Update sailor version to 2.6.17

## 2.0.0 (October 2, 2020)

* First commit of v2 branch. See https://github.com/elasticio/salesforce-component for the v1 component version details
