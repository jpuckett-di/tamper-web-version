# DI Website Version Label

This [Violentmonkey](https://violentmonkey.github.io/) script displays a version label for DI Websites.

## Configuration

At the top of the script, set the current expected versions to style the label appropriately:

```js
const CURRENT_VERSION_MSP = undefined; // Multi-site platform Git SHA hash (40 hex characters)
const CURRENT_VERSION_SSP = undefined; // Single-site platform Integer (as string) version
```

For example:

```js
const CURRENT_VERSION_MSP = "221cbbec3c46292be826ff085a6abbf57b270756";
const CURRENT_VERSION_SSP = "208";
```

The version label will display:
- **Green** if the page version matches either expected version
- **Red** if a version is expected but doesn't match
- **Black** if no expected versions are configured

## Features

- **Version Display**: Shows the current website version (SHA hash or integer)
- **Staging Link**: Provides a quick link to the _MSP_ staging environment based on the site's slug
- **Cache Breaker**: Button to clear the site cache (requires WP admin authentication)
