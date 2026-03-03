const { getExampleNumber } = require('libphonenumber-js');
const examples = require('libphonenumber-js/examples.mobile.json');

const regions = [
    'IN', 'US', 'GB', 'AU', 'CA', 'AE', 'SA', 'SG', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH', 'JP', 'KR', 'CN', 'BR', 'MX', 'RU', 'ZA', 'NG', 'EG', 'PK', 'BD', 'LK', 'NP', 'MY', 'ID', 'PH', 'TH', 'NZ', 'IE', 'IL', 'TR', 'UA'
];

regions.forEach(region => {
    try {
        const example = getExampleNumber(region, examples);
        if (example) {
            console.log(`${region}: ${example.nationalNumber.length}`);
        } else {
            console.log(`${region}: No example`);
        }
    } catch (e) {
        console.log(`${region}: Error ${e.message}`);
    }
});
