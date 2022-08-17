## 2.3.1 (August 26, 2022)

* Update Sailor version to 2.6.29
* Get rid of vulnerabilities in dependencies
* Update component-commons-library version to 3.0.1

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
