const { getMetadataForRegion } = require('libphonenumber-js');

const regions = [
    'IN', 'US', 'GB', 'AU', 'CA', 'AE', 'SA', 'SG', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH', 'JP', 'KR', 'CN', 'BR', 'MX', 'RU', 'ZA', 'NG', 'EG', 'PK', 'BD', 'LK', 'NP', 'MY', 'ID', 'PH', 'TH', 'NZ', 'IE', 'IL', 'TR', 'UA'
];

regions.forEach(region => {
    try {
        const metadata = getMetadataForRegion(region);
        if (metadata && metadata.mobile()) {
            // Note: phoneMetadata.mobile().possibleLengths() might not be directly available in some versions or structures
            // But we can check the length of example numbers
            console.log(`${region}: ${JSON.stringify(metadata.mobile().possibleLengths())}`);
        } else {
            console.log(`${region}: No mobile metadata`);
        }
    } catch (e) {
        console.log(`${region}: Error ${e.message}`);
    }
});
